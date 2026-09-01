import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('./google-ads.ts', import.meta.url), 'utf8');
const compiledSource = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiledSource).toString('base64')}`;
const { buildGoogleAdsPurchaseCall } = await import(moduleUrl);

test('builds the verified GA4-imported purchase event with dynamic value', () => {
  assert.deepEqual(
    buildGoogleAdsPurchaseCall(
      'AW-18189404980',
      '',
      'conversion_event_purchase_1',
      {
        transaction_id: 'cs_live_order_123',
        currency: 'usd',
        value: 129.99,
      },
    ),
    [
      'event',
      'conversion_event_purchase_1',
      {
        value: 129.99,
        currency: 'USD',
        transaction_id: 'cs_live_order_123',
      },
    ],
  );
});

test('builds a direct Google Ads conversion when a label is configured', () => {
  assert.deepEqual(
    buildGoogleAdsPurchaseCall('AW-123', 'purchase-label', 'ignored', {
      transaction_id: 'order_456',
      currency: 'cad',
      value: 74.99,
    }),
    [
      'event',
      'conversion',
      {
        send_to: 'AW-123/purchase-label',
        value: 74.99,
        currency: 'CAD',
        transaction_id: 'order_456',
      },
    ],
  );
});

test('does not send malformed purchase values to bidding', () => {
  assert.equal(
    buildGoogleAdsPurchaseCall('AW-123', '', 'purchase_event', {
      value: 49.99,
    }),
    null,
  );
  assert.equal(
    buildGoogleAdsPurchaseCall('AW-123', '', 'purchase_event', {
      transaction_id: 'order_789',
      value: Number.NaN,
    }),
    null,
  );
  assert.equal(
    buildGoogleAdsPurchaseCall('AW-123', '', 'purchase_event', {
      transaction_id: 'order_789',
      value: -1,
    }),
    null,
  );
});
