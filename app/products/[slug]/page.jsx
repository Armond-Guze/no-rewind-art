import { notFound, redirect } from 'next/navigation';
import {
  getCatalog,
  getProductBySlug,
  getRouteSeo,
} from '../../../src/next/seo.js';
import { getRelatedProducts } from '../../../src/next/storefront/product-utils';
import ProductPageClient from '../../../src/next/storefront/ProductPageClient';

export const dynamicParams = true;
export const revalidate = 3600;

function JsonLd({ data }) {
  if (!data) {
    return null;
  }

  return (
    <script
      id="armoze-page-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

async function getSlug(params) {
  const resolvedParams = await params;
  return resolvedParams?.slug || '';
}

export async function generateMetadata({ params }) {
  const routeSeo = await getRouteSeo(['products', await getSlug(params)]);

  if (!routeSeo.exists) {
    return {
      title: 'Product Not Found | Armoze',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return routeSeo.metadata || {};
}

export async function generateStaticParams() {
  const catalog = await getCatalog();

  return catalog.products
    .filter((product) => product.published)
    .map((product) => ({
      slug: product.slug,
    }));
}

export default async function ProductRoute({ params }) {
  const slug = await getSlug(params);
  const routeSeo = await getRouteSeo(['products', slug]);

  if (!routeSeo.exists) {
    notFound();
  }

  if (routeSeo.redirectTo) {
    redirect(routeSeo.redirectTo);
  }

  const catalog = await getCatalog();
  const product = getProductBySlug(catalog, slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <ProductPageClient
        catalogProducts={catalog.products}
        product={product}
        relatedProducts={getRelatedProducts(catalog.products, product)}
      />
    </>
  );
}
