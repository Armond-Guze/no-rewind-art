import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAuthCallbackUrl,
  getSafeAuthRedirectPath,
  getSignInStepUrl,
} from './auth-redirect.js';

test('accepts same-origin paths and defaults missing values to the account page', () => {
  assert.equal(getSafeAuthRedirectPath('/admin'), '/admin');
  assert.equal(getSafeAuthRedirectPath('/account?tab=orders#latest'), '/account?tab=orders#latest');
  assert.equal(getSafeAuthRedirectPath(''), '/account');
});

test('rejects external, protocol-relative, and backslash redirect targets', () => {
  for (const unsafeTarget of [
    'https://evil.example/admin',
    '//evil.example/admin',
    '/\\evil.example/admin',
    'javascript:alert(1)',
  ]) {
    assert.equal(getSafeAuthRedirectPath(unsafeTarget), '/account');
  }
});

test('preserves the validated redirect through sign-in steps and callback URLs', () => {
  assert.equal(
    getSignInStepUrl({ email: 'owner@example.com', next: '/admin', step: 'password' }),
    '/sign-in?password=1&email=owner%40example.com&next=%2Fadmin',
  );
  assert.equal(
    getAuthCallbackUrl('https://armoze.com', '/admin'),
    'https://armoze.com/sign-in?next=%2Fadmin',
  );
  assert.equal(
    getAuthCallbackUrl('https://armoze.com', 'https://evil.example/admin'),
    'https://armoze.com/sign-in',
  );
});
