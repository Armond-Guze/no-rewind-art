import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { serverOnlyTableNames } from './database-security.js';

const { Client } = pg;
const migrationUrl = new URL(
  './migrations/20260806_lock_down_public_tables.sql',
  import.meta.url,
);

export function getRuntimeDatabaseUrl(env = process.env) {
  return (
    env.DATABASE_SECURITY_URL ||
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.POSTGRES_PRISMA_URL ||
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

export function createDatabaseSecurityClient(databaseUrl, env = process.env) {
  const rejectUnauthorized = env.DATABASE_SECURITY_ALLOW_INSECURE_TLS !== 'true';

  return new Client({
    connectionString: normalizeDatabaseUrl(databaseUrl),
    ssl: env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized },
    connectionTimeoutMillis: 10_000,
    application_name: 'armoze-database-security',
    options: '-c search_path=public,pg_catalog',
  });
}

export async function inspectDatabaseSecurity(client) {
  const roleResult = await client.query(`
    select
      current_user as current_user,
      runtime_role.rolsuper,
      runtime_role.rolbypassrls,
      case
        when to_regrole('anon') is null then false
        else has_schema_privilege('anon', 'public', 'CREATE')
      end as anon_can_create,
      case
        when to_regrole('authenticated') is null then false
        else has_schema_privilege('authenticated', 'public', 'CREATE')
      end as authenticated_can_create
    from pg_roles runtime_role
    where runtime_role.rolname = current_user
  `);
  const tableResult = await client.query(
    `
      select
        target_table.relname as table_name,
        owner.rolname as owner_name,
        target_table.relrowsecurity as rls_enabled,
        target_table.relforcerowsecurity as rls_forced,
        pg_has_role(current_user, owner.rolname, 'USAGE') as runtime_owns_or_inherits,
        has_table_privilege(current_user, target_table.oid, 'SELECT') as runtime_can_select,
        has_table_privilege(current_user, target_table.oid, 'INSERT') as runtime_can_insert,
        has_table_privilege(current_user, target_table.oid, 'UPDATE') as runtime_can_update,
        has_table_privilege(current_user, target_table.oid, 'DELETE') as runtime_can_delete,
        case
          when to_regrole('anon') is null then false
          else has_table_privilege('anon', target_table.oid, 'SELECT')
            or has_table_privilege('anon', target_table.oid, 'INSERT')
            or has_table_privilege('anon', target_table.oid, 'UPDATE')
            or has_table_privilege('anon', target_table.oid, 'DELETE')
        end as anon_has_any,
        case
          when to_regrole('authenticated') is null then false
          else has_table_privilege('authenticated', target_table.oid, 'SELECT')
            or has_table_privilege('authenticated', target_table.oid, 'INSERT')
            or has_table_privilege('authenticated', target_table.oid, 'UPDATE')
            or has_table_privilege('authenticated', target_table.oid, 'DELETE')
        end as authenticated_has_any,
        exists (
          select 1
          from aclexplode(
            coalesce(target_table.relacl, acldefault('r', target_table.relowner))
          ) acl
          where acl.grantee = 0
            and acl.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) as public_has_any,
        exists (
          select 1
          from pg_policy policy
          where policy.polrelid = target_table.oid
            and policy.polname = 'armoze_deny_data_api'
            and not policy.polpermissive
        ) as deny_policy_exists
      from pg_class target_table
      join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
      join pg_roles owner on owner.oid = target_table.relowner
      where target_schema.nspname = 'public'
        and target_table.relkind in ('r', 'p')
        and target_table.relname = any($1::text[])
      order by array_position($1::text[], target_table.relname)
    `,
    [serverOnlyTableNames],
  );
  const defaultAclResult = await client.query(
    `
      select exists (
        select 1
        from pg_default_acl defaults
        join pg_namespace target_schema on target_schema.oid = defaults.defaclnamespace
        cross join lateral aclexplode(defaults.defaclacl) acl
        left join pg_roles grantee on grantee.oid = acl.grantee
        where target_schema.nspname = 'public'
          and defaults.defaclrole in (
            select distinct target_table.relowner
            from pg_class target_table
            join pg_namespace table_schema on table_schema.oid = target_table.relnamespace
            where table_schema.nspname = 'public'
              and target_table.relname = any($1::text[])
              and target_table.relkind in ('r', 'p')

            union

            select oid from pg_roles where rolname = current_user
          )
          and (
            acl.grantee = 0
            or grantee.rolname in ('anon', 'authenticated')
          )
      ) as public_defaults_exposed
    `,
    [serverOnlyTableNames],
  );

  return {
    role: roleResult.rows[0],
    tables: tableResult.rows,
    publicDefaultsExposed: defaultAclResult.rows[0]?.public_defaults_exposed === true,
  };
}

export function assertSafeToApply(state) {
  const missingTables = serverOnlyTableNames.filter(
    (tableName) => !state.tables.some((table) => table.table_name === tableName),
  );

  if (missingTables.length) {
    throw new Error(`Refusing to apply: missing expected tables: ${missingTables.join(', ')}`);
  }

  const runtimeCanBypassRls = state.role?.rolsuper || state.role?.rolbypassrls;
  const ownershipFailures = state.tables.filter(
    (table) => !runtimeCanBypassRls && !table.runtime_owns_or_inherits,
  );
  if (ownershipFailures.length) {
    throw new Error(
      `Refusing to apply: runtime would not bypass owner RLS on ${ownershipFailures.map((table) => table.table_name).join(', ')}.`,
    );
  }

  const missingRuntimePrivileges = state.tables.filter(
    (table) =>
      !table.runtime_can_select ||
      !table.runtime_can_insert ||
      !table.runtime_can_update ||
      !table.runtime_can_delete,
  );
  if (missingRuntimePrivileges.length) {
    throw new Error(
      `Refusing to apply: runtime lacks existing CRUD on ${missingRuntimePrivileges.map((table) => table.table_name).join(', ')}.`,
    );
  }
}

export function assertLockedDown(state) {
  const insecureTables = state.tables.filter(
    (table) =>
      !table.rls_enabled ||
      table.rls_forced ||
      !table.deny_policy_exists ||
      table.anon_has_any ||
      table.authenticated_has_any ||
      table.public_has_any,
  );

  if (insecureTables.length) {
    throw new Error(
      `Database is not locked down: ${insecureTables.map((table) => table.table_name).join(', ')}.`,
    );
  }

  if (state.role?.anon_can_create || state.role?.authenticated_can_create) {
    throw new Error('Database is not locked down: a Data API role can create public objects.');
  }

  if (state.publicDefaultsExposed) {
    throw new Error('Database is not locked down: public default privileges remain.');
  }
}

export async function runDatabaseSecurityMigration({
  apply = false,
  databaseUrl = getRuntimeDatabaseUrl(),
  env = process.env,
} = {}) {
  if (!databaseUrl) {
    throw new Error(
      'Set DATABASE_SECURITY_URL, DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL.',
    );
  }

  const client = createDatabaseSecurityClient(databaseUrl, env);

  try {
    await client.connect();
    const before = await inspectDatabaseSecurity(client);

    if (!apply) {
      assertLockedDown(before);
      return { before, after: before, applied: false };
    }

    assertSafeToApply(before);
    const migration = await readFile(migrationUrl, 'utf8');
    await client.query(migration);
    const after = await inspectDatabaseSecurity(client);
    assertSafeToApply(after);
    assertLockedDown(after);
    return { before, after, applied: true };
  } finally {
    await client.end().catch(() => {});
  }
}
