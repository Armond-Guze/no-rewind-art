import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleCustomerReviewsOptInScript } from './google-customer-reviews.js';

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
