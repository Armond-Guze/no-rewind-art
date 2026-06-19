import CartPageClient from '../../src/next/storefront/CartPageClient.tsx';
import { getCatalog, getRouteSeo } from '../../src/next/seo.js';

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

  return (
    <CartPageClient
      products={catalog.products}
      checkoutSessionId={checkoutSessionId}
      checkoutResult={checkoutResult}
      merchantItemId={merchantItemId}
      requestedFrameId={requestedFrameId}
    />
  );
}
