import { redirect } from 'next/navigation';
import { getCatalog, getProductByGoogleItemId } from '../../../src/next/seo.js';

export const dynamic = 'force-dynamic';

async function getItemId(params) {
  const resolvedParams = await params;
  return resolvedParams?.itemId || '';
}

const googleAttributionParameters = new Set([
  '_gl',
  'dclid',
  'gad_campaignid',
  'gad_source',
  'gbraid',
  'gclid',
  'gclsrc',
  'srsltid',
  'wbraid',
]);

function appendAttributionParameters(target, searchParams) {
  for (const [name, rawValue] of Object.entries(searchParams || {})) {
    if (!googleAttributionParameters.has(name) && !name.startsWith('utm_')) {
      continue;
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      if (typeof value === 'string' && value.length <= 2048) {
        target.append(name, value);
      }
    }
  }
}

export async function generateMetadata() {
  return {
    title: 'Checkout Redirect | Armoze',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function GoogleCheckoutRoute({ params, searchParams }) {
  const catalog = await getCatalog();
  const selection = getProductByGoogleItemId(catalog, await getItemId(params));

  if (!selection) {
    redirect('/collections/best-sellers');
  }

  const canonicalItemId = `${selection.product.id}-${selection.sizeOption.id}`;
  const cartSearchParams = new URLSearchParams({
    item: canonicalItemId,
    frame: 'canvas',
  });

  appendAttributionParameters(cartSearchParams, await searchParams);

  redirect(`/cart?${cartSearchParams.toString()}`);
}
