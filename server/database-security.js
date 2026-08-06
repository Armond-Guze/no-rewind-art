const safeIdentifierPattern = /^[a-z][a-z0-9_]*$/;

export const serverOnlyTableNames = Object.freeze([
  'orders',
  'notifications',
  'newsletter_subscribers',
  'products',
  'merchant_feed_snapshots',
]);

const requiredRuntimePrivileges = Object.freeze({
  orders: ['SELECT', 'INSERT', 'UPDATE'],
  notifications: ['SELECT', 'INSERT'],
  newsletter_subscribers: ['SELECT', 'INSERT', 'UPDATE'],
  products: ['SELECT', 'UPDATE'],
  merchant_feed_snapshots: ['SELECT', 'INSERT', 'UPDATE'],
});

function assertSafeIdentifier(value) {
  if (!safeIdentifierPattern.test(value)) {
    throw new Error(`Unsafe database identifier: ${value}`);
  }
}

function listMissingRuntimePrivileges(row) {
  return requiredRuntimePrivileges[row.table_name].filter(
    (privilege) => !row[`runtime_can_${privilege.toLowerCase()}`],
  );
}

/**
 * Runtime startup is intentionally read-only. Schema creation, RLS, policies,
 * and grants belong to the controlled database migration.
 */
export async function verifyServerOnlyTables(queryable, tableNames) {
  if (!queryable || typeof queryable.query !== 'function') {
    throw new TypeError('A PostgreSQL client or pool is required.');
  }

  const uniqueTableNames = [...new Set(tableNames)];
  uniqueTableNames.forEach(assertSafeIdentifier);

  const result = await queryable.query(
    `
      select
        target_table.relname as table_name,
        target_table.relrowsecurity as rls_enabled,
        target_table.relforcerowsecurity as rls_forced,
        has_schema_privilege(current_user, 'public', 'USAGE') as runtime_has_schema_usage,
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
        end as anon_has_data_privilege,
        case
          when to_regrole('authenticated') is null then false
          else has_table_privilege('authenticated', target_table.oid, 'SELECT')
            or has_table_privilege('authenticated', target_table.oid, 'INSERT')
            or has_table_privilege('authenticated', target_table.oid, 'UPDATE')
            or has_table_privilege('authenticated', target_table.oid, 'DELETE')
        end as authenticated_has_data_privilege,
        exists (
          select 1
          from aclexplode(
            coalesce(target_table.relacl, acldefault('r', target_table.relowner))
          ) acl
          where acl.grantee = 0
            and acl.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) as public_has_data_privilege,
        exists (
          select 1
          from pg_policy policy
          where policy.polrelid = target_table.oid
            and policy.polname = 'armoze_deny_data_api'
            and not policy.polpermissive
        ) as deny_policy_exists
      from pg_class target_table
      join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
      where target_schema.nspname = 'public'
        and target_table.relkind in ('r', 'p')
        and target_table.relname = any($1::text[])
    `,
    [uniqueTableNames],
  );

  const missingTables = uniqueTableNames.filter(
    (tableName) => !result.rows.some((row) => row.table_name === tableName),
  );
  if (missingTables.length) {
    throw new Error(`Database migration required; missing tables: ${missingTables.join(', ')}.`);
  }

  for (const row of result.rows) {
    if (
      !row.rls_enabled ||
      row.rls_forced ||
      row.anon_has_data_privilege ||
      row.authenticated_has_data_privilege ||
      row.public_has_data_privilege ||
      !row.deny_policy_exists
    ) {
      throw new Error(`Database security migration required for ${row.table_name}.`);
    }

    if (!row.runtime_has_schema_usage) {
      throw new Error(`Database runtime lacks schema access for ${row.table_name}.`);
    }

    const missingPrivileges = listMissingRuntimePrivileges(row);
    if (missingPrivileges.length) {
      throw new Error(
        `Database runtime lacks ${missingPrivileges.join(', ')} on ${row.table_name}.`,
      );
    }
  }

  return result.rows;
}
