import { createClient } from '@sanity/client';

const SANITY_SITEMAP_PRODUCTS_QUERY = `*[
  _type == "artworkProduct"
  && defined(slug.current)
  && !(_id in path("drafts.**"))
  && published != false
] | order(coalesce(sortOrder, 9999) asc, title asc) {
  _id,
  productId,
  "slug": slug.current,
  collectionSlugs,
  _updatedAt
}`;

function getSanityConfig() {
  return {
    enabled: process.env.SANITY_CATALOG_ENABLED === 'true',
    projectId: process.env.SANITY_PROJECT_ID || '',
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: process.env.SANITY_API_VERSION || '2025-05-21',
    token: process.env.SANITY_READ_TOKEN || '',
  };
}

function createSanitySitemapClient() {
  const config = getSanityConfig();

  if (!config.enabled || !config.projectId || !config.dataset) {
    throw new Error('Sanity catalog is not configured for sitemap generation.');
  }

  return createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: config.apiVersion,
    useCdn: false,
    token: config.token || undefined,
  });
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export async function getSanitySitemapEntries() {
  const client = createSanitySitemapClient();
  const documents = await client.fetch(SANITY_SITEMAP_PRODUCTS_QUERY);
  const products = documents
    .map((document) => ({
      id: document.productId || document._id,
      slug: document.slug,
      collectionSlugs: Array.isArray(document.collectionSlugs) ? document.collectionSlugs : [],
      updatedAt: document._updatedAt,
    }))
    .filter((product) => product.slug);

  if (!products.length) {
    throw new Error('Sanity returned no published product slugs for sitemap generation.');
  }

  return {
    products,
    collectionSlugs: uniqueSorted(products.flatMap((product) => product.collectionSlugs)),
  };
}
