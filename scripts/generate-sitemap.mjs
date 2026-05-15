import { readFileSync, writeFileSync } from 'node:fs';

const catalog = JSON.parse(
  readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'),
);

const siteUrl = 'https://www.armoze.com';
const lastmod = process.env.SITEMAP_LASTMOD || new Date().toISOString().slice(0, 10);

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function route(path, priority) {
  return {
    loc: `${siteUrl}${path}`,
    lastmod,
    priority,
  };
}

const collectionRoutes = catalog.collections.map((collection) =>
  route(`/collections/${collection.slug}`, collection.slug === 'study-creative' ? '0.7' : '0.8'),
);

const bestSellerIds = new Set(
  catalog.collections.find((collection) => collection.slug === 'best-sellers')?.productIds || [],
);

const productRoutes = catalog.products.map((product) =>
  route(`/products/${product.slug}`, bestSellerIds.has(product.id) ? '0.9' : '0.8'),
);

const policyRoutes = ['/shipping', '/returns', '/privacy', '/terms'].map((path) => route(path, '0.4'));

const routes = [route('/', '1.0'), ...collectionRoutes, ...productRoutes, ...policyRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log(`Generated sitemap.xml with ${routes.length} URLs.`);
