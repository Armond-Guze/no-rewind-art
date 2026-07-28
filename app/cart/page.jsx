import { headers } from 'next/headers';
import CartPageClient from '../../src/next/storefront/CartPageClient.tsx';
import { makeCartLineKey } from '../../src/cart.ts';
import {
  buildGoogleCustomerReviewsOptInScript,
  googleCustomerReviewsPlatformScriptUrl,
} from '../../src/next/google-customer-reviews.js';
import { getCatalog, getProductByGoogleItemId, getRouteSeo } from '../../src/next/seo.js';
import { getFrameOption } from '../../src/next/storefront/product-utils.ts';
import { getGoogleCustomerReviewOptIn } from '../../server/backend.js';
import { assertRateLimit, rateLimits } from '../../server/rate-limit.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSearchParams(searchParams) {
  return typeof searchParams?.then === 'function' ? searchParams : searchParams || {};
}

export async function generateMetadata() {
  const routeSeo = await getRouteSeo(['cart']);

  return routeSeo.metadata;
}

async function getServerGoogleCustomerReviewsOptIn(checkoutResult, checkoutSessionId) {
  if (checkoutResult !== 'success' || !checkoutSessionId) {
    return null;
  }

  try {
    const requestHeaders = await headers();
    assertRateLimit({ headers: requestHeaders }, rateLimits.accountOrders);

    const result = await getGoogleCustomerReviewOptIn(checkoutSessionId);

    return result.optIn || null;
  } catch (error) {
    console.error('Google Customer Reviews server preload failed.', {
      status: typeof error?.status === 'number' ? error.status : 500,
      code: typeof error?.code === 'string' ? error.code : 'unknown',
    });

    return null;
  }
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
  const googleCustomerReviewsOptIn = await getServerGoogleCustomerReviewsOptIn(
    checkoutResult,
    checkoutSessionId,
  );
  const googleCustomerReviewsRenderScript = buildGoogleCustomerReviewsOptInScript(
    googleCustomerReviewsOptIn,
  );

  return (
    <>
      <CartPageClient
        products={catalog.products}
        checkoutSessionId={checkoutSessionId}
        checkoutResult={checkoutResult}
        googleCustomerReviewsServerRendered={Boolean(googleCustomerReviewsRenderScript)}
        initialMerchantCartItem={initialMerchantCartItem}
        merchantItemId={merchantItemId}
        requestedFrameId={requestedFrameId}
      />
      {googleCustomerReviewsRenderScript ? (
        <>
          <script
            dangerouslySetInnerHTML={{ __html: googleCustomerReviewsRenderScript }}
          />
          <script
            async
            defer
            id="google-customer-reviews-platform"
            src={googleCustomerReviewsPlatformScriptUrl}
          />
        </>
      ) : null}
    </>
  );
}
