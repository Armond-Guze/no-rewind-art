const serverOnlyRoleNames = ['anon', 'authenticated'];
const safeIdentifierPattern = /^[a-z][a-z0-9_]*$/;

export const serverOnlyTableNames = Object.freeze([
  'orders',
  'notifications',
  'newsletter_subscribers',
  'products',
  'merchant_feed_snapshots',
]);

function assertSafeIdentifier(value) {
  if (!safeIdentifierPattern.test(value)) {
    throw new Error(`Unsafe database identifier: ${value}`);
  }
}

/**
 * Keeps server-owned tables inaccessible through Supabase's public Data API.
 *
 * RLS is deliberately not forced: the storefront talks to Postgres directly
 * with the table-owning runtime role, while anon/authenticated access is
 * revoked and has no RLS policies.
 */
export async function secureServerOnlyTables(queryable, tableNames) {
  if (!queryable || typeof queryable.query !== 'function') {
    throw new TypeError('A PostgreSQL client or pool is required.');
  }

  const uniqueTableNames = [...new Set(tableNames)];

  for (const tableName of uniqueTableNames) {
    assertSafeIdentifier(tableName);

    await queryable.query(`
      alter table public.${tableName} enable row level security;
      revoke all privileges on table public.${tableName} from public;

      do $database_security$
      declare
        role_name text;
      begin
        foreach role_name in array array['${serverOnlyRoleNames.join("','")}'] loop
          if to_regrole(role_name) is not null then
            execute format(
              'revoke all privileges on table public.%I from %I',
              '${tableName}',
              role_name
            );
          end if;
        end loop;
      end
      $database_security$;
    `);
  }
}
