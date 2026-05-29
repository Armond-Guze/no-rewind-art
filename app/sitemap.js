import { getSanitySitemapEntries } from '../server/sanity-sitemap.js';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://armoze.com';

export default async function sitemap() {
  const { collectionSlugs, products } = await getSanitySitemapEntries();
  const now = new Date();
  const routes = [
    {
      url: siteUrl,
      lastModified: now,
      priority: 1,
    },
    ...collectionSlugs.map((collectionSlug) => ({
      url: `${siteUrl}/collections/${collectionSlug}`,
      lastModified: now,
      priority: collectionSlug === 'study-creative' ? 0.7 : 0.8,
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      priority: product.collectionSlugs.includes('best-sellers') ? 0.9 : 0.8,
    })),
    ...['shipping', 'returns', 'privacy', 'terms'].map((path) => ({
      url: `${siteUrl}/${path}`,
      lastModified: now,
      priority: 0.4,
    })),
  ];

  return routes;
}
