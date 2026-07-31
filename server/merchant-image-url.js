import { createHash } from 'node:crypto';

const RECIPE_VERSION = 'storefront-shadow-v1';

export function getMerchantImageVersion(product) {
  return createHash('sha256')
    .update(`${RECIPE_VERSION}\0${product?.id || ''}\0${product?.image || ''}`)
    .digest('hex')
    .slice(0, 12);
}

export function buildMerchantImagePath(product) {
  const productId = String(product?.id || '').trim();

  if (!productId || !product?.image) {
    return '';
  }

  return `/merchant-images/${encodeURIComponent(productId)}/image.webp?v=${getMerchantImageVersion(product)}`;
}

export function isCanonicalMerchantImageRequest(requestUrl, product) {
  try {
    const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
    return `${url.pathname}${url.search}` === buildMerchantImagePath(product);
  } catch {
    return false;
  }
}
