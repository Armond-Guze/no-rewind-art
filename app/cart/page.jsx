import CartPageClient from '../../src/next/storefront/CartPageClient.tsx';
import { makeCartLineKey } from '../../src/cart.ts';
import { getCatalog, getProductByGoogleItemId, getRouteSeo } from '../../src/next/seo.js';
import { getFrameOption } from '../../src/next/storefront/product-utils.ts';

async function getSearchParams(searchParams) {
  return typeof searchParams?.then === 'function' ? searchParams : searchParams || {};
}

export async function generateMetadata() {
  const routeSeo = await getRouteSeo(['cart']);

  return routeSeo.metadata;
}

export default async function CartRoute({ searchParams }) {
  const catalog = await getCatalog();
  const resolvedSearchParams = await getSearchParams(searchParams);
  const checkoutResult = Array.isArray(resolvedSearchParams.checkout)
    ? resolvedSearchParams.checkout[0]
    : resolvedSearchParams.checkout;
  const merchantItemId = Array.isArray(resolvedSearchParams.item)
    ? resolvedSearchParams.item[0]
    : resolvedSearchParams.item;
  const checkoutSessionId = Array.isArray(resolvedSearchParams.session_id)
    ? resolvedSearchParams.session_id[0]
    : resolvedSearchParams.session_id;
  const requestedFrameId = Array.isArray(resolvedSearchParams.frame)
    ? resolvedSearchParams.frame[0]
    : resolvedSearchParams.frame;
  const merchantSelection = getProductByGoogleItemId(catalog, merchantItemId);
  const merchantFrameOption = merchantSelection
    ? getFrameOption(
        merchantSelection.product,
        requestedFrameId || 'canvas',
        merchantSelection.sizeOption,
      )
    : null;
  const initialMerchantCartItem =
    merchantSelection && merchantFrameOption
      ? {
          lineKey: makeCartLineKey(
            merchantSelection.product.id,
            merchantSelection.sizeOption.id,
            merchantFrameOption.id,
          ),
          productId: merchantSelection.product.id,
          sizeId: merchantSelection.sizeOption.id,
          frameId: merchantFrameOption.id,
          quantity: 1,
        }
      : undefined;

  return (
    <CartPageClient
      products={catalog.products}
      checkoutSessionId={checkoutSessionId}
      checkoutResult={checkoutResult}
      initialMerchantCartItem={initialMerchantCartItem}
      merchantItemId={merchantItemId}
      requestedFrameId={requestedFrameId}
    />
  );
}
