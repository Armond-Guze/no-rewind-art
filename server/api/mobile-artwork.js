import { listPublicCatalog } from '../backend.js';
import { errorJson, json, methodNotAllowed } from './_utils.js';

const fallbackSiteUrl = 'https://armoze.com';

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.CLIENT_URL ||
    fallbackSiteUrl
  ).replace(/\/$/, '');
}

function absoluteUrl(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value, `${getSiteUrl()}/`).toString();
}

function productToMobileArtwork(product) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    image: absoluteUrl(product.image),
    imageAlt: product.imageAlt,
    tone: product.tone,
    collectionSlugs: product.collectionSlugs,
    aspectRatio: product.aspectRatio,
    sizePreset: product.sizePreset,
    productUrl: absoluteUrl(`/products/${product.slug}`),
  };
}

export async function GET() {
  try {
    const catalog = await listPublicCatalog();
    const artwork = catalog.products
      .filter((product) => product.published !== false && product.image)
      .map(productToMobileArtwork);

    return json({
      artwork,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorJson(error);
  }
}

export function POST() {
  return methodNotAllowed();
}

