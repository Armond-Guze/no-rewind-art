import { getCatalog, getProductsForCollection, siteUrl } from '../src/next/seo.js';

export default async function sitemap() {
  const catalog = await getCatalog();
  const now = new Date();
  const bestSellerIds = new Set(
    catalog.collections.find((collection) => collection.slug === 'best-sellers')?.productIds || [],
  );
  const routes = [
    {
      url: siteUrl,
      lastModified: now,
      priority: 1,
    },
    ...catalog.collections.map((collection) => ({
      url: `${siteUrl}/collections/${collection.slug}`,
      lastModified: now,
      priority: collection.slug === 'study-creative' ? 0.7 : 0.8,
    })),
    ...catalog.products
      .filter((product) => product.published)
      .map((product) => ({
        url: `${siteUrl}/products/${product.slug}`,
        lastModified: now,
        priority: bestSellerIds.has(product.id) ? 0.9 : 0.8,
      })),
    ...['shipping', 'returns', 'privacy', 'terms'].map((path) => ({
      url: `${siteUrl}/${path}`,
      lastModified: now,
      priority: 0.4,
    })),
  ];

  return routes;
}
