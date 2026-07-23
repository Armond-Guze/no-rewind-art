import { getSanitySitemapEntries } from '../server/sanity-sitemap.js';
import {
  getSeoPageFactoryCollectionPriority,
  getSeoPageFactoryCollectionSlugs,
} from '../server/seo-page-factory.js';
import { seedCatalog } from '../server/catalog.js';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://armoze.com';
const retiredCollectionSlugs = new Set(['discipline-focus']);

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

export default async function sitemap() {
  const { collectionSlugs, products } = await getSanitySitemapEntries();
  const seoCollectionSlugs = getSeoPageFactoryCollectionSlugs();
  const catalogCollectionSlugs = seedCatalog.collections.map((collection) => collection.slug);
  const allCollectionSlugs = uniqueValues([
    ...catalogCollectionSlugs,
    ...collectionSlugs,
    ...seoCollectionSlugs,
  ]).filter((collectionSlug) => !retiredCollectionSlugs.has(collectionSlug));
  const now = new Date();
  const routes = [
    {
      url: siteUrl,
      lastModified: now,
      priority: 1,
    },
    ...allCollectionSlugs.map((collectionSlug) => ({
      url: `${siteUrl}/collections/${collectionSlug}`,
      lastModified: now,
      priority: seoCollectionSlugs.includes(collectionSlug)
        ? getSeoPageFactoryCollectionPriority(collectionSlug)
        : collectionSlug === 'study-creative' ? 0.7 : 0.8,
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      priority: product.collectionSlugs.includes('best-sellers') ? 0.9 : 0.8,
    })),
    ...['about', 'support', 'shipping', 'returns', 'privacy', 'terms'].map((path) => ({
      url: `${siteUrl}/${path}`,
      lastModified: now,
      priority: 0.4,
    })),
  ];

  return routes;
}
