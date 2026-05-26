import { createProductStore } from './product-store.js';

const defaultSiteUrl = 'https://armoze.com';
const merchantCategory = 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork';
const productStore = createProductStore();
const productStoreReady = productStore.init();

function getPublicSiteUrl() {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const configuredUrl =
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    vercelUrl ||
    defaultSiteUrl;

  return String(configuredUrl).replace(/\/$/, '');
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(value, siteUrl) {
  if (!value) {
    return '';
  }

  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return '';
  }
}

function formatFeedPrice(cents) {
  return `${(Number(cents || 0) / 100).toFixed(2)} USD`;
}

function xmlTag(name, value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return `<${name}>${escapeXml(value)}</${name}>`;
}

function buildFeedItem(product, sizeOption, siteUrl) {
  const itemId = `${product.id}-${sizeOption.id}`;
  const productUrl = absoluteUrl(`/products/${product.slug}?size=${encodeURIComponent(sizeOption.id)}`, siteUrl);
  const imageUrl = absoluteUrl(product.image, siteUrl);
  const description = stripHtml(product.seoDescription || product.longDescription || product.description);
  const additionalImages = (product.gallery || [])
    .map((image) => absoluteUrl(image, siteUrl))
    .filter((image) => image && image !== imageUrl)
    .slice(0, 10);

  return [
    '<item>',
    xmlTag('g:id', itemId),
    xmlTag('g:item_group_id', product.id),
    xmlTag('g:title', `${product.title} Canvas Print - ${sizeOption.label}`),
    xmlTag('g:description', description),
    xmlTag('g:link', productUrl),
    xmlTag('g:image_link', imageUrl),
    ...additionalImages.map((image) => xmlTag('g:additional_image_link', image)),
    xmlTag('g:availability', 'in_stock'),
    xmlTag('g:price', formatFeedPrice(sizeOption.priceInCents)),
    xmlTag('g:brand', 'Armoze'),
    xmlTag('g:condition', 'new'),
    xmlTag('g:size', sizeOption.label),
    xmlTag('g:color', 'Multicolor'),
    xmlTag('g:gender', 'unisex'),
    xmlTag('g:age_group', 'adult'),
    xmlTag('g:material', 'Canvas'),
    xmlTag('g:product_type', `Canvas Prints > ${product.tone || 'Motivational'} Wall Art`),
    xmlTag('g:google_product_category', merchantCategory),
    xmlTag('g:identifier_exists', 'no'),
    xmlTag('g:custom_label_0', product.tone),
    '<g:shipping>',
    xmlTag('g:country', 'US'),
    xmlTag('g:service', 'Standard shipping'),
    xmlTag('g:price', '0.00 USD'),
    '</g:shipping>',
    '</item>',
  ]
    .filter(Boolean)
    .join('');
}

export async function buildGoogleMerchantFeedXml() {
  const siteUrl = getPublicSiteUrl();
  await productStoreReady;
  const catalog = await productStore.listCatalog();
  const products = catalog.products.filter((product) => product.published && product.image);
  const items = products.flatMap((product) =>
    product.sizeOptions.map((sizeOption) => buildFeedItem(product, sizeOption, siteUrl)),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    xmlTag('title', 'Armoze Canvas Prints'),
    xmlTag('link', siteUrl),
    xmlTag('description', 'Motivational canvas prints from Armoze.'),
    ...items,
    '</channel>',
    '</rss>',
  ].join('');
}
