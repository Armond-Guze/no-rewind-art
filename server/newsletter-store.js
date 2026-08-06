import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { verifyServerOnlyTables } from './database-security.js';
import { readJsonFile, writeJsonFileAtomic } from './local-json-file.js';

const { Pool } = pg;

const dataDir =
  process.env.LOCAL_NEWSLETTER_STORE_DIR ||
  (process.env.VERCEL
    ? path.join(os.tmpdir(), 'armoze-newsletter')
    : path.join(os.homedir(), '.armoze', 'newsletter'));
const subscribersFile = path.join(dataDir, 'subscribers.json');

function createEmptyDatabase() {
  return {
    subscribers: [],
  };
}

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
  const parsed = await readJsonFile(subscribersFile, createEmptyDatabase);

  return {
    ...createEmptyDatabase(),
    ...parsed,
    subscribers: Array.isArray(parsed?.subscribers) ? parsed.subscribers : [],
  };
}

async function writeLocalDatabase(database) {
  await writeJsonFileAtomic(subscribersFile, database);
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

  async listSubscribers({ limit = 1000, status = 'active' } = {}) {
    const database = await readLocalDatabase();
    const safeLimit = Math.min(Math.max(Number(limit || 1000), 1), 5000);
    const subscribers = database.subscribers
      .filter((subscriber) => !status || subscriber.status === status)
      .slice(0, safeLimit);

    return {
      subscribers,
      total: database.subscribers.length,
      active: database.subscribers.filter((subscriber) => subscriber.status === 'active').length,
    };
  }
}

class PostgresNewsletterStore {
  type = 'postgres';

  constructor(databaseUrl) {
    const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };

    this.pool = new Pool({
      connectionString: normalizeDatabaseUrl(databaseUrl),
      ssl,
      options: '-c search_path=public,pg_catalog',
    });
  }

  async init() {
    await verifyServerOnlyTables(this.pool, ['newsletter_subscribers']);
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

  async listSubscribers({ limit = 1000, status = 'active' } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit || 1000), 1), 5000);
    const statusFilter = status ? 'where status = $2' : '';
    const queryValues = status ? [safeLimit, status] : [safeLimit];
    const [subscribersResult, summaryResult] = await Promise.all([
      this.pool.query(
        `
          select *
          from newsletter_subscribers
          ${statusFilter}
          order by updated_at desc
          limit $1
        `,
        queryValues,
      ),
      this.pool.query(`
        select
          count(*)::integer as total,
          count(*) filter (where status = 'active')::integer as active
        from newsletter_subscribers
      `),
    ]);

    return {
      subscribers: subscribersResult.rows.map((row) => this.rowToSubscriber(row)),
      total: summaryResult.rows[0]?.total || 0,
      active: summaryResult.rows[0]?.active || 0,
    };
  }
}

export function createNewsletterStore() {
  const databaseUrl = getDatabaseUrl();

  if (databaseUrl) {
    return new PostgresNewsletterStore(databaseUrl);
  }

  return new LocalNewsletterStore();
}
