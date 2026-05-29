import { redirect } from 'next/navigation';
import { getCatalog, getProductByGoogleItemId } from '../../../src/next/seo.js';

export const dynamic = 'force-dynamic';

async function getItemId(params) {
  const resolvedParams = await params;
  return resolvedParams?.itemId || '';
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

export default async function GoogleCheckoutRoute({ params }) {
  const catalog = await getCatalog();
  const selection = getProductByGoogleItemId(catalog, await getItemId(params));

  if (!selection) {
    redirect('/collections/best-sellers');
  }

  redirect(`/products/${selection.product.slug}?size=${encodeURIComponent(selection.sizeOption.id)}`);
}
