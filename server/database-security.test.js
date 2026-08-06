import assert from 'node:assert/strict';
import test from 'node:test';
import { secureServerOnlyTables, serverOnlyTableNames } from './database-security.js';

test('lists every application-owned public table', () => {
  assert.deepEqual(serverOnlyTableNames, [
    'orders',
    'notifications',
    'newsletter_subscribers',
    'products',
    'merchant_feed_snapshots',
  ]);
});

test('enables RLS and revokes public roles for each unique table', async () => {
  const queries = [];
  const queryable = {
    async query(text) {
      queries.push(text);
      return { rows: [] };
    },
  };

  await secureServerOnlyTables(queryable, ['orders', 'orders', 'notifications']);

  assert.equal(queries.length, 2);
  assert.match(queries[0], /alter table public\.orders enable row level security/i);
  assert.match(queries[0], /revoke all privileges on table public\.orders from public/i);
  assert.match(queries[0], /array\['anon','authenticated'\]/i);
  assert.match(queries[1], /alter table public\.notifications enable row level security/i);
});

test('rejects interpolated table identifiers', async () => {
  await assert.rejects(
    secureServerOnlyTables({ query: async () => ({ rows: [] }) }, ['orders; drop table orders']),
    /Unsafe database identifier/,
  );
});
