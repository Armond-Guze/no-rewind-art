import { notFound } from 'next/navigation';
import {
  getCollectionForSlug,
  getCollectionRouteSlugs,
  getCatalog,
  getProductsForCollection,
  getRouteSeo,
} from '../../../src/next/seo.js';
import CollectionPageClient from '../../../src/next/storefront/CollectionPageClient';

export const dynamicParams = true;
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

async function getSlug(params) {
  const resolvedParams = await params;
  return resolvedParams?.slug || '';
}

export async function generateMetadata({ params }) {
  const routeSeo = await getRouteSeo(['collections', await getSlug(params)]);

  if (!routeSeo.exists) {
    return {
      title: 'Collection Not Found | Armoze',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return routeSeo.metadata || {};
}

export async function generateStaticParams() {
  const catalog = await getCatalog();

  return getCollectionRouteSlugs(catalog).map((slug) => ({ slug }));
}

export default async function CollectionRoute({ params }) {
  const slug = await getSlug(params);
  const routeSeo = await getRouteSeo(['collections', slug]);

  if (!routeSeo.exists) {
    notFound();
  }

  const catalog = await getCatalog();
  const collection = getCollectionForSlug(catalog, slug);

  if (!collection) {
    notFound();
  }

  return (
    <>
      <JsonLd data={routeSeo.structuredData} />
      <CollectionPageClient
        allProducts={catalog.products}
        collection={collection}
        collections={catalog.collections}
        products={getProductsForCollection(catalog, collection.slug)}
      />
    </>
  );
}
