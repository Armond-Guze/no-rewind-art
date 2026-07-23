import {
  getCatalog,
  getHomepageBestSellerProducts,
  getHomepageHeroProducts,
  getHomepageNewArrivalProducts,
  getProductsForCollection,
  getRouteSeo,
} from '../src/next/seo.js';
import HomePageClient from '../src/next/storefront/HomePageClient';

export const revalidate = 60;

const homepageMusicSlugs = [
  'when-words-fail-music-speaks',
  'play-again-cassette',
  'life-has-no-rewind',
  'reminder-life-has-no-rewind',
];

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
  const musicCollectionProducts = getProductsForCollection(catalog, 'music');
  const musicProductsBySlug = new Map(
    musicCollectionProducts.map((product) => [product.slug, product]),
  );
  const preferredMusicProducts = homepageMusicSlugs
    .map((slug) => musicProductsBySlug.get(slug))
    .filter(Boolean);
  const preferredMusicProductIds = new Set(preferredMusicProducts.map((product) => product.id));
  const musicProducts = [
    ...preferredMusicProducts,
    ...musicCollectionProducts.filter((product) => !preferredMusicProductIds.has(product.id)),
  ].slice(0, 4);

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <HomePageClient
        allProducts={catalog.products}
        featuredProducts={featuredProducts}
        newArrivalProducts={newArrivalProducts}
        heroProducts={heroProducts}
        musicProducts={musicProducts}
        homepageSettings={catalog.homepageSettings}
      />
    </>
  );
}
