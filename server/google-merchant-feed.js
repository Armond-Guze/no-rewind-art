import 'dotenv/config';
import { createProductStore } from './product-store.js';
import {
  buildMerchantFeedDescription,
  buildMerchantFeedTitle,
  buildMerchantProductType,
  getProductSeoAliases,
} from './seo-copy.js';
import { withMerchantFeedResilience } from './merchant-feed-resilience.js';
import { buildMerchantImagePath } from './merchant-image-url.js';

const defaultSiteUrl = 'https://armoze.com';
const merchantCategory = 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork';
const productStore = createProductStore();
const productStoreReady = productStore.init();

function getPublicSiteUrl() {
  const configuredUrl =
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    defaultSiteUrl;

  let siteUrl = String(configuredUrl).replace(/\/$/, '');

  try {
    const url = new URL(siteUrl);

    if (url.hostname.endsWith('.vercel.app')) {
      siteUrl = defaultSiteUrl;
    }
  } catch {
    siteUrl = defaultSiteUrl;
  }

  return siteUrl;
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

export function buildFeedItem(product, sizeOption, siteUrl) {
  const itemId = `${product.id}-${sizeOption.id}`;
  const productUrl = absoluteUrl(`/products/${product.slug}?size=${encodeURIComponent(sizeOption.id)}`, siteUrl);
  const imageUrl = absoluteUrl(buildMerchantImagePath(product) || product.image, siteUrl);
  const description = stripHtml(buildMerchantFeedDescription(product));
  const seoAliases = getProductSeoAliases(product, 4);
  const additionalImages = (product.gallery || [])
    .map((image) => absoluteUrl(image, siteUrl))
    .filter((image) => image && image !== imageUrl)
    .slice(0, 10);
  const videoLinks = (product.videos || [])
    .map((video) => absoluteUrl(video?.url, siteUrl))
    .filter(Boolean)
    .slice(0, 10);

  return [
    '<item>',
    xmlTag('g:id', itemId),
    xmlTag('g:item_group_id', product.id),
    xmlTag('g:title', buildMerchantFeedTitle(product, sizeOption)),
    xmlTag('g:description', description),
    xmlTag('g:link', productUrl),
    xmlTag('g:image_link', imageUrl),
    ...additionalImages.map((image) => xmlTag('g:additional_image_link', image)),
    ...videoLinks.map((video) => xmlTag('g:video_link', video)),
    xmlTag('g:availability', 'in_stock'),
    xmlTag('g:price', formatFeedPrice(sizeOption.priceInCents)),
    xmlTag('g:brand', 'Armoze'),
    xmlTag('g:condition', 'new'),
    xmlTag('g:return_policy_label', 'default'),
    xmlTag('g:size', sizeOption.label),
    xmlTag('g:color', 'Multicolor'),
    xmlTag('g:gender', 'unisex'),
    xmlTag('g:age_group', 'adult'),
    xmlTag('g:material', 'Canvas'),
    xmlTag('g:product_type', buildMerchantProductType(product)),
    xmlTag('g:google_product_category', merchantCategory),
    xmlTag('g:identifier_exists', 'no'),
    xmlTag('g:custom_label_0', product.tone),
    xmlTag('g:custom_label_1', seoAliases[0]),
    xmlTag('g:custom_label_2', seoAliases[1]),
    xmlTag('g:custom_label_3', seoAliases[2]),
    xmlTag('g:custom_label_4', seoAliases[3]),
    '<g:shipping>',
    xmlTag('g:country', 'US'),
    xmlTag('g:service', 'Standard shipping'),
    xmlTag('g:price', '0.00 USD'),
    xmlTag('g:min_handling_time', '2'),
    xmlTag('g:max_handling_time', '3'),
    xmlTag('g:min_transit_time', '2'),
    xmlTag('g:max_transit_time', '5'),
    '</g:shipping>',
    '</item>',
  ]
    .filter(Boolean)
    .join('');
}

async function buildCurrentGoogleMerchantFeedXml() {
  const siteUrl = getPublicSiteUrl();
  await productStoreReady;

  if (
    process.env.NODE_ENV === 'production' &&
    productStore.type !== 'sanity' &&
    process.env.MERCHANT_FEED_ALLOW_NON_SANITY_CATALOG !== 'true'
  ) {
    const error = new Error(
      'The production Merchant feed requires the configured Sanity catalog.',
    );
    error.code = 'MERCHANT_FEED_PRIMARY_CATALOG_UNAVAILABLE';
    throw error;
  }

  // A Merchant fetch must never see the storefront's divergent seed catalog when
  // Sanity is unavailable. The resilience wrapper below will serve a verified
  // last-known-good XML snapshot or let the route return 503 instead.
  const catalog = await productStore.listCatalog({ allowFallback: false });
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

export async function buildGoogleMerchantFeedXml() {
  if (productStore.type !== 'sanity' && process.env.NODE_ENV !== 'production') {
    return buildCurrentGoogleMerchantFeedXml();
  }

  return withMerchantFeedResilience(buildCurrentGoogleMerchantFeedXml);
}
