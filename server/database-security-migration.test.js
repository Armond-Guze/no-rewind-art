import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLockedDown, assertSafeToApply } from './database-security-migration.js';
import { serverOnlyTableNames } from './database-security.js';

function secureState() {
  return {
    role: {
      current_user: 'postgres',
      rolsuper: false,
      rolbypassrls: false,
      anon_can_create: false,
      authenticated_can_create: false,
    },
    publicDefaultsExposed: false,
    tables: serverOnlyTableNames.map((tableName) => ({
      table_name: tableName,
      owner_name: 'postgres',
      rls_enabled: true,
      rls_forced: false,
      runtime_owns_or_inherits: true,
      runtime_can_select: true,
      runtime_can_insert: true,
      runtime_can_update: true,
      runtime_can_delete: true,
      anon_has_any: false,
      authenticated_has_any: false,
      public_has_any: false,
      deny_policy_exists: true,
    })),
  };
}

test('accepts an owned, locked-down database', () => {
  const state = secureState();
  assert.doesNotThrow(() => assertSafeToApply(state));
  assert.doesNotThrow(() => assertLockedDown(state));
});

test('refuses a runtime role that would be blocked by RLS', () => {
  const state = secureState();
  state.tables[0].runtime_owns_or_inherits = false;
  assert.throws(() => assertSafeToApply(state), /would not bypass owner RLS/);
});

test('detects public access, missing deny policy, schema creation, and defaults', () => {
  for (const mutate of [
    (state) => {
      state.tables[0].anon_has_any = true;
    },
    (state) => {
      state.tables[0].deny_policy_exists = false;
    },
    (state) => {
      state.role.authenticated_can_create = true;
    },
    (state) => {
      state.publicDefaultsExposed = true;
    },
  ]) {
    const state = secureState();
    mutate(state);
    assert.throws(() => assertLockedDown(state), /not locked down/);
  }
});
