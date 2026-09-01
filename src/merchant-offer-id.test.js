import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMerchantOfferId } from './merchant-offer-id.js';

test('builds the same variant-level ID used by Merchant Center and analytics', () => {
  assert.equal(
    buildMerchantOfferId('life-has-no-rewind-canvas', '18x12'),
    'life-has-no-rewind-canvas-18x12',
  );
});
