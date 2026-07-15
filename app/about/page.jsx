import { getCatalog, getRouteSeo } from '../../src/next/seo.js';
import AboutPageClient from '../../src/next/storefront/AboutPageClient';

export const revalidate = 60;

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
  const routeSeo = await getRouteSeo(['about']);
  return routeSeo.metadata || {};
}

export default async function AboutPage() {
  const catalog = await getCatalog();
  const routeSeo = await getRouteSeo(['about']);
  const featuredProduct =
    catalog.products.find((product) => product.slug === 'bookshelf') || catalog.products[0];

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <AboutPageClient allProducts={catalog.products} featuredProduct={featuredProduct} />
    </>
  );
}
