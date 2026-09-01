export function buildMerchantOfferId(productId, sizeId) {
  return `${String(productId || '').trim()}-${String(sizeId || '').trim()}`;
}
