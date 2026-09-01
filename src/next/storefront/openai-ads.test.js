import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import ts from 'typescript';

const source = readFileSync(new URL('./openai-ads.ts', import.meta.url), 'utf8');
const compiledSource = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiledSource).toString('base64')}`;
const {
  buildOpenAiAdsMeasureCall,
  ensureOpenAiAdsPixel,
  openAiAdsScriptId,
  openAiAdsSdkUrl,
} = await import(moduleUrl);

test('maps storefront page views without leaking URL query parameters', () => {
  assert.deepEqual(
    buildOpenAiAdsMeasureCall('page_view', {
      page_path: '/cart?checkout=success&session_id=cs_secret',
      page_title: 'Your cart',
    }),
    [
      'measure',
      'page_viewed',
      {
        type: 'contents',
        contents: [
          {
            id: '/cart',
            name: 'Your cart',
            content_type: 'page',
          },
        ],
      },
    ],
  );
});

test('maps real storefront funnel actions to supported OpenAI events', () => {
  const mappings = {
    view_item: 'contents_viewed',
    view_item_list: 'contents_viewed',
    add_to_cart: 'items_added',
    begin_checkout: 'checkout_started',
    generate_lead: 'lead_created',
  };

  for (const [storefrontEvent, openAiEvent] of Object.entries(mappings)) {
    assert.equal(buildOpenAiAdsMeasureCall(storefrontEvent)?.[1], openAiEvent);
  }

  assert.equal(buildOpenAiAdsMeasureCall('search'), null);
});

test('builds a purchase in minor units with Stripe transaction deduplication', () => {
  assert.deepEqual(
    buildOpenAiAdsMeasureCall('purchase', {
      transaction_id: 'order_123',
      currency: 'usd',
      value: 129.99,
      items: [
        {
          item_id: 'print_1',
          item_name: 'Discipline print',
          price: 64.995,
          quantity: 2,
        },
      ],
    }),
    [
      'measure',
      'order_created',
      {
        type: 'contents',
        amount: 12999,
        currency: 'USD',
        contents: [
          {
            id: 'print_1',
            name: 'Discipline print',
            content_type: 'product',
            quantity: 2,
            amount: 6500,
            currency: 'USD',
          },
        ],
      },
      { event_id: 'order_123' },
    ],
  );
});

test('installs one queued SDK loader and initializes the configured pixel', () => {
  const appendedScripts = [];
  const fakeWindow = {};
  const fakeDocument = {
    getElementById(id) {
      return appendedScripts.find((script) => script.id === id) || null;
    },
    createElement() {
      return {};
    },
    head: {
      appendChild(script) {
        appendedScripts.push(script);
      },
    },
  };

  assert.equal(ensureOpenAiAdsPixel('pixel_123', fakeWindow, fakeDocument), true);
  assert.deepEqual(appendedScripts, [
    {
      id: openAiAdsScriptId,
      async: true,
      src: openAiAdsSdkUrl,
    },
  ]);
  assert.deepEqual(fakeWindow.oaiq.q, [['init', { pixelId: 'pixel_123' }]]);
  assert.equal(ensureOpenAiAdsPixel('pixel_123', fakeWindow, fakeDocument), false);
  assert.equal(appendedScripts.length, 1);
});
