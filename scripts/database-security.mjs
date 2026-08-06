import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { serverOnlyTableNames } from '../server/database-security.js';

const { Client } = pg;
const migrationPath = path.resolve(
  process.cwd(),
  'server',
  'migrations',
  '20260806_lock_down_public_tables.sql',
);
const applyMigration = process.argv.includes('--apply');

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  );
}

function normalizeDatabaseUrl(databaseUrl) {
  const parsedUrl = new URL(databaseUrl);
  parsedUrl.searchParams.delete('sslcert');
  parsedUrl.searchParams.delete('sslkey');
  parsedUrl.searchParams.delete('sslmode');
  parsedUrl.searchParams.delete('sslrootcert');
  return parsedUrl.toString();
}

function printTable(rows) {
  const widths = {
    table: Math.max('table'.length, ...rows.map((row) => row.table_name.length)),
    owner: Math.max('owner'.length, ...rows.map((row) => row.owner_name.length)),
  };

  console.log(
    `${'table'.padEnd(widths.table)}  ${'owner'.padEnd(widths.owner)}  rls  force  runtime  anon  authenticated  public`,
  );

  for (const row of rows) {
    console.log(
      `${row.table_name.padEnd(widths.table)}  ${row.owner_name.padEnd(widths.owner)}  ${String(row.rls_enabled).padEnd(3)}  ${String(row.rls_forced).padEnd(5)}  ${String(row.runtime_has_crud).padEnd(7)}  ${String(row.anon_has_any).padEnd(4)}  ${String(row.authenticated_has_any).padEnd(13)}  ${String(row.public_has_any)}`,
    );
  }
}

async function getSecurityState(client) {
  const roleResult = await client.query(`
    select
      current_user as current_user,
      r.rolsuper,
      r.rolbypassrls
    from pg_roles r
    where r.rolname = current_user
  `);
  const tableResult = await client.query(
    `
      select
        c.relname as table_name,
        owner.rolname as owner_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced,
        has_table_privilege(current_user, c.oid, 'SELECT,INSERT,UPDATE,DELETE') as runtime_has_crud,
        case
          when to_regrole('anon') is null then false
          else has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
        end as anon_has_any,
        case
          when to_regrole('authenticated') is null then false
          else has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
        end as authenticated_has_any,
        exists (
          select 1
          from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
          where acl.grantee = 0
            and acl.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) as public_has_any
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_roles owner on owner.oid = c.relowner
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and c.relname = any($1::text[])
      order by array_position($1::text[], c.relname)
    `,
    [serverOnlyTableNames],
  );

  return {
    role: roleResult.rows[0],
    tables: tableResult.rows,
  };
}

function assertSafeToApply(state) {
  const missingTables = serverOnlyTableNames.filter(
    (tableName) => !state.tables.some((table) => table.table_name === tableName),
  );

  if (missingTables.length) {
    throw new Error(`Refusing to apply: missing expected tables: ${missingTables.join(', ')}`);
  }

  const runtimeCanBypassRls =
    state.role?.rolsuper ||
    state.role?.rolbypassrls ||
    state.tables.every((table) => table.owner_name === state.role?.current_user);

  if (!runtimeCanBypassRls) {
    throw new Error(
      'Refusing to apply: the direct PostgreSQL runtime role would not bypass owner RLS.',
    );
  }

  const missingRuntimePrivileges = state.tables.filter((table) => !table.runtime_has_crud);
  if (missingRuntimePrivileges.length) {
    throw new Error(
      `Refusing to apply: runtime lacks CRUD on ${missingRuntimePrivileges.map((table) => table.table_name).join(', ')}.`,
    );
  }
}

function assertLockedDown(state) {
  const insecureTables = state.tables.filter(
    (table) =>
      !table.rls_enabled ||
      table.anon_has_any ||
      table.authenticated_has_any ||
      table.public_has_any,
  );

  if (insecureTables.length) {
    throw new Error(
      `Database is not locked down: ${insecureTables.map((table) => table.table_name).join(', ')}.`,
    );
  }
}

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  throw new Error(
    'Set POSTGRES_URL_NON_POOLING, DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL.',
  );
}

const client = new Client({
  connectionString: normalizeDatabaseUrl(databaseUrl),
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true },
  connectionTimeoutMillis: 10_000,
  application_name: 'armoze-database-security',
});

try {
  await client.connect();
  const before = await getSecurityState(client);
  console.log(`Database role: ${before.role?.current_user || 'unknown'}`);
  printTable(before.tables);

  if (!applyMigration) {
    assertLockedDown(before);
    console.log('Database security check passed.');
    process.exitCode = 0;
  } else {
    assertSafeToApply(before);
    const migration = await readFile(migrationPath, 'utf8');
    await client.query(migration);
    const after = await getSecurityState(client);
    assertSafeToApply(after);
    assertLockedDown(after);
    console.log('Database security migration applied and verified.');
    printTable(after.tables);
  }
} finally {
  await client.end().catch(() => {});
}
