import { notFound, redirect } from 'next/navigation';
import {
  getCatalog,
  getProductBySlug,
  getRouteSeo,
} from '../../../src/next/seo.js';
import { getRelatedProducts } from '../../../src/next/storefront/product-utils';
import ProductPageClient from '../../../src/next/storefront/ProductPageClient';

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

async function getSearchParams(searchParams) {
  return (await searchParams) || {};
}

function appendSearchParams(path, searchParams) {
  const nextParams = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
      return;
    }

    if (value != null) {
      nextParams.set(key, value);
    }
  });

  const query = nextParams.toString();
  return query ? `${path}?${query}` : path;
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

export default async function ProductRoute({ params, searchParams }) {
  const slug = await getSlug(params);
  const resolvedSearchParams = await getSearchParams(searchParams);
  const routeSeo = await getRouteSeo(['products', slug]);

  if (!routeSeo.exists) {
    notFound();
  }

  if (routeSeo.redirectTo) {
    redirect(appendSearchParams(routeSeo.redirectTo, resolvedSearchParams));
  }

  const catalog = await getCatalog();
  const product = getProductBySlug(catalog, slug);

  if (!product) {
    notFound();
  }

  const searchSizeId = Array.isArray(resolvedSearchParams.size)
    ? resolvedSearchParams.size[0]
    : resolvedSearchParams.size;

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <ProductPageClient
        product={product}
        relatedProducts={getRelatedProducts(catalog.products, product)}
        searchSizeId={searchSizeId}
      />
    </>
  );
}
