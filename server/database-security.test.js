import assert from 'node:assert/strict';
import test from 'node:test';
import { serverOnlyTableNames, verifyServerOnlyTables } from './database-security.js';

function secureRow(tableName) {
  return {
    table_name: tableName,
    rls_enabled: true,
    rls_forced: false,
    runtime_has_schema_usage: true,
    runtime_can_select: true,
    runtime_can_insert: true,
    runtime_can_update: true,
    runtime_can_delete: false,
    anon_has_data_privilege: false,
    authenticated_has_data_privilege: false,
    public_has_data_privilege: false,
    deny_policy_exists: true,
  };
}

test('lists every application-owned public table', () => {
  assert.deepEqual(serverOnlyTableNames, [
    'orders',
    'notifications',
    'newsletter_subscribers',
    'products',
    'merchant_feed_snapshots',
  ]);
});

test('accepts locked-down tables with the required runtime DML', async () => {
  const queryable = {
    async query(_text, values) {
      return { rows: values[0].map(secureRow) };
    },
  };

  const rows = await verifyServerOnlyTables(queryable, ['orders', 'notifications']);
  assert.equal(rows.length, 2);
});

test('rejects missing, exposed, forced, or runtime-inaccessible tables', async () => {
  await assert.rejects(
    verifyServerOnlyTables({ query: async () => ({ rows: [] }) }, ['orders']),
    /missing tables: orders/,
  );

  for (const insecureUpdate of [
    { rls_enabled: false },
    { rls_forced: true },
    { anon_has_data_privilege: true },
    { authenticated_has_data_privilege: true },
    { public_has_data_privilege: true },
    { deny_policy_exists: false },
  ]) {
    await assert.rejects(
      verifyServerOnlyTables(
        {
          query: async () => ({
            rows: [{ ...secureRow('orders'), ...insecureUpdate }],
          }),
        },
        ['orders'],
      ),
      /security migration required/,
    );
  }

  await assert.rejects(
    verifyServerOnlyTables(
      {
        query: async () => ({
          rows: [{ ...secureRow('orders'), runtime_can_update: false }],
        }),
      },
      ['orders'],
    ),
    /lacks UPDATE on orders/,
  );
});

test('rejects interpolated table identifiers', async () => {
  await assert.rejects(
    verifyServerOnlyTables(
      { query: async () => ({ rows: [] }) },
      ['orders; drop table orders'],
    ),
    /Unsafe database identifier/,
  );
});
