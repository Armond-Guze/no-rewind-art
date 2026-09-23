import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildGoogleCustomerReviewsOptInScript } from './google-customer-reviews.js';

const exampleOptIn = {
  merchantId: 5793512839,
  orderId: 'cs_test_example',
  email: 'buyer@example.com',
  deliveryCountry: 'US',
  estimatedDeliveryDate: '2026-10-02',
};

function createBrowserHarness({ readyState = 'complete', existingScript = false } = {}) {
  const rendered = [];
  const apiCallbacks = [];
  const documentListeners = new Map();
  const scriptListeners = new Map();
  const scripts = [];
  const window = {};
  const scriptElement = {
    addEventListener: (event, callback) => scriptListeners.set(event, callback),
  };
  const loadGoogle = () => {
    assert.equal(typeof window.renderArmozeGoogleCustomerReviewsOptIn, 'function');
    window.gapi = {
      load: (api, callback) => {
        assert.equal(api, 'surveyoptin');
        apiCallbacks.push(callback);
      },
      surveyoptin: { render: (payload) => rendered.push(JSON.parse(JSON.stringify(payload))) },
    };
    window.renderArmozeGoogleCustomerReviewsOptIn();
  };
  const document = {
    readyState,
    addEventListener: (event, callback) => documentListeners.set(event, callback),
    getElementById: () => existingScript ? scriptElement : null,
    createElement: () => scriptElement,
    head: {
      appendChild: (script) => {
        scripts.push(script);
        // Model a cached Google script completing as soon as it is inserted.
        loadGoogle();
      },
    },
  };
  return {
    window, document, scripts, rendered, apiCallbacks, scriptListeners,
    run: () => vm.runInNewContext(buildGoogleCustomerReviewsOptInScript(exampleOptIn), { window, document }),
    finishDocument: () => {
      document.readyState = 'interactive';
      documentListeners.get('DOMContentLoaded')?.();
    },
    loadGoogle,
    finishApi: () => {
      for (const callback of apiCallbacks.splice(0)) callback();
    },
  };
}

test('defines the callback before a fast platform load and renders the complete payload', () => {
  const browser = createBrowserHarness();
  browser.run();
  browser.finishApi();
  assert.equal(browser.scripts.length, 1);
  assert.deepEqual(browser.rendered, [{
    merchant_id: exampleOptIn.merchantId,
    order_id: exampleOptIn.orderId,
    email: exampleOptIn.email,
    delivery_country: 'US',
    estimated_delivery_date: '2026-10-02',
    opt_in_style: 'CENTER_DIALOG',
  }]);
});

test('waits for the confirmation document before rendering during streaming', () => {
  const browser = createBrowserHarness({ readyState: 'loading' });
  browser.run();
  assert.equal(browser.apiCallbacks.length, 0);
  browser.finishDocument();
  browser.finishApi();
  assert.equal(browser.rendered.length, 1);
});

test('duplicate platform callbacks and bootstrap runs show only one opt-in per order', () => {
  const browser = createBrowserHarness();
  browser.run();
  browser.run();
  browser.window.renderArmozeGoogleCustomerReviewsOptIn();
  browser.finishApi();
  browser.run();
  browser.finishApi();
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.rendered.length, 1);
});

test('can retry an API callback that did not yet expose the survey renderer', () => {
  const browser = createBrowserHarness();
  browser.run();
  const surveyApi = browser.window.gapi.surveyoptin;
  delete browser.window.gapi.surveyoptin;
  browser.finishApi();
  assert.equal(browser.rendered.length, 0);
  browser.window.gapi.surveyoptin = surveyApi;
  browser.window.renderArmozeGoogleCustomerReviewsOptIn();
  browser.finishApi();
  assert.equal(browser.rendered.length, 1);
});

test('reuses a platform script already loading without adding a second script', () => {
  const browser = createBrowserHarness({ existingScript: true });
  browser.run();
  assert.equal(browser.scripts.length, 0);
  browser.loadGoogle();
  browser.scriptListeners.get('load')();
  browser.finishApi();
  assert.equal(browser.rendered.length, 1);
});

test('builds one complete Google Customer Reviews opt-in payload', () => {
  const script = buildGoogleCustomerReviewsOptInScript({
    merchantId: 5793512839,
    orderId: 'cs_live_example',
    email: 'buyer@example.com',
    deliveryCountry: 'US',
    estimatedDeliveryDate: '2026-08-07',
  });

  assert.match(script, /window\.gapi\.load\('surveyoptin'/);
  assert.match(script, /window\.gapi\.surveyoptin\.render\(/);
  assert.match(script, /"merchant_id":5793512839/);
  assert.match(script, /"order_id":"cs_live_example"/);
  assert.match(script, /"email":"buyer@example\.com"/);
  assert.match(script, /"delivery_country":"US"/);
  assert.match(script, /"estimated_delivery_date":"2026-08-07"/);
  assert.match(script, /"opt_in_style":"CENTER_DIALOG"/);
});

test('escapes inline-script delimiters in dynamic checkout values', () => {
  const script = buildGoogleCustomerReviewsOptInScript({
    merchantId: 5793512839,
    orderId: 'order-</script><script>alert(1)</script>\u2028\u2029',
    email: 'buyer+<&>@example.com',
    deliveryCountry: 'US',
    estimatedDeliveryDate: '2026-08-07',
  });

  assert.doesNotMatch(script, /<\/script>/i);
  assert.match(script, /\\u003c/);
  assert.match(script, /\\u003e/);
  assert.match(script, /\\u0026/);
  assert.match(script, /\\u2028/);
  assert.match(script, /\\u2029/);
});

test('does not build a script without all required fields', () => {
  assert.equal(
    buildGoogleCustomerReviewsOptInScript({
      merchantId: 5793512839,
      orderId: 'cs_live_example',
      email: '',
      deliveryCountry: 'US',
      estimatedDeliveryDate: '2026-08-07',
    }),
    '',
  );
});
