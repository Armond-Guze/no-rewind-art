function invalidDiscount(message = 'This discount code is not available. Check the code and try again.') {
  return Object.assign(new Error(message), { status: 400 });
}

export function calculateCartDiscount(promotion, subtotal, now = Date.now()) {
  const coupon = promotion?.coupon;
  if (!promotion?.active || !coupon?.valid || coupon.deleted ||
      (promotion.expires_at && promotion.expires_at * 1000 <= now) ||
      (coupon.redeem_by && coupon.redeem_by * 1000 <= now) ||
      (promotion.max_redemptions && promotion.times_redeemed >= promotion.max_redemptions) ||
      (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions)) {
    throw invalidDiscount();
  }
  // Checkout creates products from the configured canvas options, rather than
  // reusing Stripe product IDs. Product/customer-specific codes cannot apply here.
  if (promotion.customer || coupon.applies_to?.products?.length) {
    throw invalidDiscount('This code does not apply to this cart.');
  }
  const restriction = promotion.restrictions || {};
  const minimum = restriction.currency_options?.usd?.minimum_amount ??
    (restriction.minimum_amount_currency === 'usd' ? restriction.minimum_amount || 0 : 0);
  if (restriction.minimum_amount && restriction.minimum_amount_currency !== 'usd' && !restriction.currency_options?.usd) {
    throw invalidDiscount('This code is not available for USD orders.');
  }
  if (subtotal < minimum) {
    throw invalidDiscount(`This code requires a subtotal of $${(minimum / 100).toFixed(2)}.`);
  }
  const fixedAmount = coupon.currency_options?.usd?.amount_off ?? (coupon.currency === 'usd' ? coupon.amount_off : 0);
  const amount = Math.min(subtotal, coupon.percent_off ? Math.round(subtotal * coupon.percent_off / 100) : fixedAmount || 0);
  if (!Number.isSafeInteger(subtotal) || subtotal <= 0 || !Number.isSafeInteger(amount) || amount <= 0) {
    throw invalidDiscount('This code does not apply to this cart.');
  }
  return { code: promotion.code.toUpperCase(), amount, subtotal };
}

export async function resolveCartDiscount(stripe, rawCode, cartItems) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{1,80}$/.test(code)) throw invalidDiscount('Enter a valid discount code.');
  let result;
  try {
    result = await stripe.promotionCodes.list({ code, active: true, limit: 100 });
  } catch {
    throw Object.assign(new Error('We could not verify your code right now. Please try again.'), { status: 503 });
  }
  const promotion = result.data.find((item) => !item.customer) || result.data[0];
  const subtotal = cartItems.reduce((total, item) => total + item.unitAmount * item.quantity, 0);
  return { ...calculateCartDiscount(promotion, subtotal), promotionCodeId: promotion.id };
}
