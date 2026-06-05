import {
  getCatalog,
  getHomepageBestSellerProducts,
  getHomepageHeroProducts,
  getHomepageNewArrivalProducts,
  getRouteSeo,
} from '../src/next/seo.js';
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
  const featuredProducts = getHomepageBestSellerProducts(catalog);
  const newArrivalProducts = getHomepageNewArrivalProducts(catalog, featuredProducts);
  const heroProducts = getHomepageHeroProducts(catalog, featuredProducts, newArrivalProducts);
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
