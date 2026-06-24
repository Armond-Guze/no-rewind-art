import {
  getCatalog,
  getHomepageBestSellerProducts,
  getHomepageHeroProducts,
  getHomepageNewArrivalProducts,
  getRouteSeo,
} from '../src/next/seo.js';
import HomePageClient from '../src/next/storefront/HomePageClient';

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

export async function generateMetadata() {
  const routeSeo = await getRouteSeo([]);
  return routeSeo.metadata || {};
}

export default async function HomeRoute() {
  const catalog = await getCatalog();
  const routeSeo = await getRouteSeo([]);
  const featuredProducts = getHomepageBestSellerProducts(catalog);
  const newArrivalProducts = getHomepageNewArrivalProducts(catalog, featuredProducts);
  const heroProducts = getHomepageHeroProducts(catalog, featuredProducts, newArrivalProducts);

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <HomePageClient
        featuredProducts={featuredProducts}
        newArrivalProducts={newArrivalProducts}
        heroProducts={heroProducts}
      />
    </>
  );
}
