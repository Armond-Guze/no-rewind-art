import { getCatalog, getProductsForCollection, getRouteSeo } from '../src/next/seo.js';
import HomePageClient from '../src/next/storefront/HomePageClient';

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

async function getSearchParams(searchParams) {
  return (await searchParams) || {};
}

export async function generateMetadata() {
  const routeSeo = await getRouteSeo([]);
  return routeSeo.metadata || {};
}

export default async function HomeRoute({ searchParams }) {
  const catalog = await getCatalog();
  const routeSeo = await getRouteSeo([]);
  const resolvedSearchParams = await getSearchParams(searchParams);
  const featuredProducts = getProductsForCollection(catalog, 'best-sellers').slice(0, 6);
  const newArrivalProducts = getProductsForCollection(catalog, 'new-arrivals').slice(0, 4);
  const heroProducts = [
    ...featuredProducts.slice(0, 3),
    ...newArrivalProducts.slice(0, 3),
  ].filter(
    (product, index, products) =>
      products.findIndex((candidate) => candidate.id === product.id) === index,
  ).slice(0, 5);
  const checkoutResult = Array.isArray(resolvedSearchParams.checkout)
    ? resolvedSearchParams.checkout[0]
    : resolvedSearchParams.checkout;

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <HomePageClient
        checkoutResult={checkoutResult}
        featuredProducts={featuredProducts}
        newArrivalProducts={newArrivalProducts}
        heroProducts={heroProducts}
      />
    </>
  );
}
