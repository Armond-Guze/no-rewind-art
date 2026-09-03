import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCartDiscount, resolveCartDiscount } from './cart-discount.js';

const promotion = { id: 'promo_test', active: true, code: 'FIRST15', restrictions: {}, coupon: { valid: true, percent_off: 15 } };

test('percentage discount uses cents and reflects changed quantities', () => {
  assert.deepEqual(calculateCartDiscount(promotion, 4999), { code: 'FIRST15', amount: 750, subtotal: 4999 });
  assert.equal(calculateCartDiscount(promotion, 9998).amount, 1500);
});
test('fixed discounts cannot exceed the subtotal', () => {
  assert.equal(calculateCartDiscount({ ...promotion, coupon: { valid: true, currency: 'usd', amount_off: 10000 } }, 4999).amount, 4999);
});
test('expired, exhausted, missing, and restricted codes are rejected', () => {
  for (const invalid of [null, { ...promotion, active: false }, { ...promotion, expires_at: 1 },
    { ...promotion, max_redemptions: 2, times_redeemed: 2 }, { ...promotion, customer: 'cus_private' },
    { ...promotion, coupon: { ...promotion.coupon, valid: false } },
    { ...promotion, coupon: { ...promotion.coupon, applies_to: { products: ['prod_other'] } } }]) {
    assert.throws(() => calculateCartDiscount(invalid, 4999), { status: 400 });
  }
});
test('minimum amounts and unsupported currencies do not show a discount', () => {
  assert.throws(() => calculateCartDiscount({ ...promotion, restrictions: { minimum_amount: 5000, minimum_amount_currency: 'usd' } }, 4999), /subtotal of \$50.00/);
  assert.throws(() => calculateCartDiscount({ ...promotion, coupon: { valid: true, amount_off: 500, currency: 'eur' } }, 4999), { status: 400 });
});
test('lookup normalizes the code and derives subtotal from server cart prices', async () => {
  const stripe = { promotionCodes: { list: async ({ code }) => {
    assert.equal(code, 'FIRST15');
    return { data: [promotion] };
  } } };
  assert.deepEqual(await resolveCartDiscount(stripe, ' first15 ', [{ unitAmount: 4999, quantity: 2 }]), {
    code: 'FIRST15', amount: 1500, subtotal: 9998, promotionCodeId: 'promo_test',
  });
});

test('a failed provider lookup never returns an applied discount', async () => {
  const stripe = { promotionCodes: { list: async () => { throw new Error('Connection unavailable'); } } };
  await assert.rejects(resolveCartDiscount(stripe, 'FIRST15', [{ unitAmount: 4999, quantity: 1 }]), { status: 503 });
});
