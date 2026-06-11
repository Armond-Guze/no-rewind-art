import { getRouteSeo } from '../../src/next/seo.js';
import SupportPageClient from '../../src/next/storefront/SupportPageClient';

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
  const routeSeo = await getRouteSeo(['support']);
  return routeSeo.metadata || {};
}

export default async function SupportPage() {
  const routeSeo = await getRouteSeo(['support']);

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <SupportPageClient />
    </>
  );
}
