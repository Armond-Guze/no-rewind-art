import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAdminAuthorization,
  getAdminAuthConfig,
  isAdminAuthConfigured,
  parseAdminEmails,
  safeTokenEqual,
} from './admin-auth.js';

const supabaseEnv = {
  ADMIN_EMAILS: 'owner@example.com',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
};

test('normalizes and deduplicates comma-separated admin emails', () => {
  assert.deepEqual(
    parseAdminEmails(' Owner@Example.com,second@example.com, owner@example.com ,, '),
    ['owner@example.com', 'second@example.com'],
  );
});

test('uses ORDER_NOTIFICATION_EMAIL only when ADMIN_EMAILS is unset', () => {
  assert.deepEqual(
    getAdminAuthConfig({ ORDER_NOTIFICATION_EMAIL: 'Owner@Example.com' }).adminEmails,
    ['owner@example.com'],
  );
  assert.deepEqual(
    getAdminAuthConfig({ ADMIN_EMAILS: '', ORDER_NOTIFICATION_EMAIL: 'owner@example.com' }).adminEmails,
    [],
  );
});

test('compares emergency tokens without direct string equality and trims server configuration', async () => {
  assert.equal(safeTokenEqual('correct-token', 'correct-token'), true);
  assert.equal(safeTokenEqual('wrong-token', 'correct-token'), false);

  const identity = await assertAdminAuthorization('Bearer correct-token', {
    env: { ADMIN_API_TOKEN: '  correct-token  ' },
  });

  assert.deepEqual(identity, { method: 'legacy-token', email: null, userId: null });
});

test('accepts a verified Supabase session for an allowlisted normalized email', async () => {
  const identity = await assertAdminAuthorization('Bearer supabase-access-token', {
    env: supabaseEnv,
    verifyAccessToken: async () => ({ id: 'user-1', email: ' Owner@Example.com ' }),
  });

  assert.deepEqual(identity, {
    method: 'supabase',
    email: 'owner@example.com',
    userId: 'user-1',
  });
});

test('rejects a verified Supabase user who is not allowlisted', async () => {
  await assert.rejects(
    assertAdminAuthorization('Bearer supabase-access-token', {
      env: supabaseEnv,
      verifyAccessToken: async () => ({ id: 'user-2', email: 'other@example.com' }),
    }),
    (error) => error.status === 403 && /not authorized/.test(error.message),
  );
});

test('returns useful errors for invalid sessions and incomplete configuration', async () => {
  await assert.rejects(
    assertAdminAuthorization('Bearer expired-token', {
      env: supabaseEnv,
      verifyAccessToken: async () => null,
    }),
    (error) => error.status === 401 && /invalid or expired/.test(error.message),
  );

  await assert.rejects(
    assertAdminAuthorization('', { env: {} }),
    (error) => error.status === 503 && /not configured/.test(error.message),
  );

  await assert.rejects(
    assertAdminAuthorization('Bearer any-token', {
      env: { ADMIN_EMAILS: 'owner@example.com' },
    }),
    (error) => error.status === 503 && /Supabase URL/.test(error.message),
  );
});

test('reports auth configured for either a complete account setup or an emergency token', () => {
  assert.equal(isAdminAuthConfigured(getAdminAuthConfig(supabaseEnv)), true);
  assert.equal(isAdminAuthConfigured(getAdminAuthConfig({ ADMIN_API_TOKEN: 'emergency-token' })), true);
  assert.equal(isAdminAuthConfigured(getAdminAuthConfig({ ADMIN_EMAILS: 'owner@example.com' })), false);
});
