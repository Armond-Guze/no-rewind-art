import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const dataDir =
  process.env.LOCAL_NEWSLETTER_STORE_DIR ||
  (process.env.VERCEL
    ? path.join(os.tmpdir(), 'armoze-newsletter')
    : path.join(os.homedir(), '.armoze', 'newsletter'));
const subscribersFile = path.join(dataDir, 'subscribers.json');

const emptyDatabase = {
  subscribers: [],
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '';
}

function normalizeDatabaseUrl(databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    parsedUrl.searchParams.delete('sslcert');
    parsedUrl.searchParams.delete('sslkey');
    parsedUrl.searchParams.delete('sslmode');
    parsedUrl.searchParams.delete('sslrootcert');

    return parsedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSubscriber(subscriber) {
  const timestamp = nowIso();

  return {
    id: subscriber.id || makeId('sub'),
    email: String(subscriber.email || '').trim().toLowerCase(),
    source: subscriber.source || 'footer',
    status: subscriber.status || 'active',
    createdAt: subscriber.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

async function readLocalDatabase() {
  try {
    const raw = await readFile(subscribersFile, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...emptyDatabase,
      ...parsed,
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ...emptyDatabase };
    }

    throw error;
  }
}

async function writeLocalDatabase(database) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(subscribersFile, `${JSON.stringify(database, null, 2)}\n`);
}

class LocalNewsletterStore {
  type = 'local-json';

  async init() {
    await writeLocalDatabase(await readLocalDatabase());
  }

  async subscribe(subscriber) {
    const database = await readLocalDatabase();
    const nextSubscriber = normalizeSubscriber(subscriber);
    const existingIndex = database.subscribers.findIndex(
      (candidate) => candidate.email === nextSubscriber.email,
    );

    if (existingIndex >= 0) {
      database.subscribers[existingIndex] = {
        ...database.subscribers[existingIndex],
        source: nextSubscriber.source,
        status: 'active',
        updatedAt: nowIso(),
      };
    } else {
      database.subscribers.unshift(nextSubscriber);
    }

    await writeLocalDatabase(database);

    return existingIndex >= 0 ? database.subscribers[existingIndex] : nextSubscriber;
  }
}

class PostgresNewsletterStore {
  type = 'postgres';

  constructor(databaseUrl) {
    const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };

    this.pool = new Pool({
      connectionString: normalizeDatabaseUrl(databaseUrl),
      ssl,
    });
  }

  async init() {
    await this.pool.query(`
      create table if not exists newsletter_subscribers (
        id text primary key,
        email text unique not null,
        source text not null default 'footer',
        status text not null default 'active',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    await this.pool.query(`
      create index if not exists newsletter_subscribers_updated_at_idx
      on newsletter_subscribers (updated_at desc);
    `);
  }

  rowToSubscriber(row) {
    return {
      id: row.id,
      email: row.email,
      source: row.source,
      status: row.status,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    };
  }

  async subscribe(subscriber) {
    const nextSubscriber = normalizeSubscriber(subscriber);
    const result = await this.pool.query(
      `
        insert into newsletter_subscribers (
          id, email, source, status, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6)
        on conflict (email) do update set
          source = excluded.source,
          status = 'active',
          updated_at = excluded.updated_at
        returning *
      `,
      [
        nextSubscriber.id,
        nextSubscriber.email,
        nextSubscriber.source,
        nextSubscriber.status,
        nextSubscriber.createdAt,
        nextSubscriber.updatedAt,
      ],
    );

    return this.rowToSubscriber(result.rows[0]);
  }
}

export function createNewsletterStore() {
  const databaseUrl = getDatabaseUrl();

  if (databaseUrl) {
    return new PostgresNewsletterStore(databaseUrl);
  }

  return new LocalNewsletterStore();
}
