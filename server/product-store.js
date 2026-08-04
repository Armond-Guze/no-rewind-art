import os from 'node:os';
import path from 'node:path';
import { createClient } from '@sanity/client';
import pg from 'pg';
import { readJsonFile, writeJsonFileAtomic } from './local-json-file.js';
import {
  getArtworkShapeFromSizePreset,
  getProductAspectRatio,
  normalizeCatalogData,
  normalizeCollectionSlugs,
  normalizeProduct,
  seedCatalog,
} from './catalog.js';

const { Pool } = pg;

const dataDir =
  process.env.LOCAL_PRODUCT_STORE_DIR ||
  (process.env.VERCEL ? path.join(os.tmpdir(), 'armoze-products') : path.join(os.homedir(), '.armoze', 'products'));
const productsFile = path.join(dataDir, 'products.json');

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '';
}

function getSanityConfig() {
  return {
    enabled: process.env.SANITY_CATALOG_ENABLED === 'true',
    projectId: process.env.SANITY_PROJECT_ID || '',
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: process.env.SANITY_API_VERSION || '2025-05-21',
    token: process.env.SANITY_READ_TOKEN || '',
  };
}

function getSanityClient(config = getSanityConfig()) {
  if (!config.enabled || !config.projectId || !config.dataset) {
    return null;
  }

  return createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: config.apiVersion,
    useCdn: false,
    token: config.token || undefined,
  });
}

function normalizeDatabaseUrl(databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    parsedUrl.searchParams.delete('sslcert');
    parsedUrl.searchParams.delete('sslkey');
    parsedUrl.searchParams.delete('sslmode');
    parsedUrl.searchParams.delete('sslrootcert');

    return parsedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function seedRows() {
  return seedCatalog.products.map((product, index) => ({
    id: product.id,
    slug: product.slug,
    published: product.published !== false,
    sortOrder: index,
    data: {
      ...product,
      published: product.published !== false,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
}

function normalizeRowsToCatalog(rows, { includeUnpublished = false } = {}) {
  const products = rows
    .filter((row) => includeUnpublished || row.published !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((row) =>
      normalizeProduct(
        {
          ...row.data,
          published: row.published !== false,
        },
        seedCatalog.sizePresets,
      ),
    );

  return {
    ...normalizeCatalogData({
      ...seedCatalog,
      products: [],
    }),
    products,
  };
}

function sanitizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function sanitizeTextArray(value) {
  return Array.isArray(value)
    ? value.map((item) => sanitizeText(item)).filter(Boolean)
    : [];
}

function sanitizeVideoEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const videosByUrl = new Map();

  value.forEach((video) => {
    const id = sanitizeText(video?.id);
    const title = sanitizeText(video?.title);
    const url = sanitizeText(video?.url || video?.videoUrl);
    const thumbnail = sanitizeText(video?.thumbnail || video?.thumbnailUrl);

    if (!url) {
      return;
    }

    const normalizedVideo = {
      ...(id ? { id } : {}),
      ...(title ? { title } : {}),
      url,
      ...(thumbnail ? { thumbnail } : {}),
    };
    const existingVideo = videosByUrl.get(url) || {};

    videosByUrl.set(url, { ...normalizedVideo, ...existingVideo, url });
  });

  return [...videosByUrl.values()];
}

function sanitizeHomepageProductIds(value) {
  return [...new Set(sanitizeTextArray(value))];
}

function normalizeSanityImage(image) {
  const url = sanitizeText(image?.url);

  if (!url) {
    return undefined;
  }

  const width = sanitizeNumber(image?.width);
  const height = sanitizeNumber(image?.height);
  const productSlug = sanitizeText(image?.productSlug);
  const productTitle = sanitizeText(image?.productTitle);

  return {
    url,
    ...(sanitizeText(image?.alt) ? { alt: sanitizeText(image.alt) } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(productSlug ? { productSlug } : {}),
    ...(productTitle ? { productTitle } : {}),
  };
}

function normalizeSanityImageList(images, maxItems) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.map(normalizeSanityImage).filter(Boolean).slice(0, maxItems);
}

function normalizeSanityHomepageSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return {};
  }

  const heroMobileImage = normalizeSanityImage(settings.heroMobileImage);
  const heroDesktopImage = normalizeSanityImage(settings.heroDesktopImage);
  const heroSlideshowImages = normalizeSanityImageList(settings.heroSlideshowImages, 5);
  const bestSellerImages = normalizeSanityImageList(settings.bestSellerImages, 8);
  const bestSellerMobileImages = normalizeSanityImageList(settings.bestSellerMobileImages, 8);
  const newArrivalImages = normalizeSanityImageList(settings.newArrivalImages, 4);
  const newArrivalMobileImages = normalizeSanityImageList(settings.newArrivalMobileImages, 5);

  return {
    heroProductIds: sanitizeHomepageProductIds(settings.heroProductIds),
    ...(heroSlideshowImages.length ? { heroSlideshowImages } : {}),
    ...(heroMobileImage ? { heroMobileImage } : {}),
    ...(heroDesktopImage ? { heroDesktopImage } : {}),
    bestSellerProductIds: sanitizeHomepageProductIds(settings.bestSellerProductIds),
    ...(bestSellerImages.length ? { bestSellerImages } : {}),
    ...(bestSellerMobileImages.length ? { bestSellerMobileImages } : {}),
    newArrivalProductIds: sanitizeHomepageProductIds(settings.newArrivalProductIds),
    ...(newArrivalImages.length ? { newArrivalImages } : {}),
    ...(newArrivalMobileImages.length ? { newArrivalMobileImages } : {}),
  };
}

function sanitizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeSizeOptions(value) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((option) => ({
      id: sanitizeText(option.id),
      label: sanitizeText(option.label),
      priceInCents: Math.max(0, Math.round(sanitizeNumber(option.priceInCents))),
      ...(sanitizeText(option.badge) ? { badge: sanitizeText(option.badge) } : {}),
      ...(option.previewScale === '' || option.previewScale == null
        ? {}
        : { previewScale: sanitizeNumber(option.previewScale, 1) }),
    }))
    .filter((option) => option.id && option.label && option.priceInCents >= 0);
}

function normalizeSanitySizePresets(settings) {
  const sizePresets = { ...seedCatalog.sizePresets };
  const configuredPresets = settings?.sizePresets;

  if (!configuredPresets || typeof configuredPresets !== 'object') {
    return sizePresets;
  }

  Object.entries(configuredPresets).forEach(([presetKey, value]) => {
    const options = sanitizeSizeOptions(value);

    if (options?.length) {
      sizePresets[presetKey] = options;
    }
  });

  return sizePresets;
}

function sanitizeFrameOptions(value) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((option) => {
      const priceDeltaBySizeIdInCents =
        option.priceDeltaBySizeIdInCents && typeof option.priceDeltaBySizeIdInCents === 'object'
          ? Object.fromEntries(
              Object.entries(option.priceDeltaBySizeIdInCents)
                .map(([sizeId, amount]) => [
                  sanitizeText(sizeId),
                  Math.max(0, Math.round(sanitizeNumber(amount))),
                ])
                .filter(([sizeId]) => sizeId),
            )
          : undefined;

      return {
        id: sanitizeText(option.id),
        label: sanitizeText(option.label),
        priceDeltaInCents: Math.max(0, Math.round(sanitizeNumber(option.priceDeltaInCents))),
        priceDeltaBySizeIndexInCents: Array.isArray(option.priceDeltaBySizeIndexInCents)
          ? option.priceDeltaBySizeIndexInCents.map((amount) => Math.max(0, Math.round(sanitizeNumber(amount))))
          : undefined,
        ...(priceDeltaBySizeIdInCents && Object.keys(priceDeltaBySizeIdInCents).length
          ? { priceDeltaBySizeIdInCents }
          : {}),
        ...(Array.isArray(option.unavailableSizeIds)
          ? { unavailableSizeIds: sanitizeTextArray(option.unavailableSizeIds) }
          : {}),
        ...(sanitizeText(option.badge) ? { badge: sanitizeText(option.badge) } : {}),
      };
    })
    .filter((option) => option.id && option.label);
}

function normalizeSanityProduct(
  document,
  sizePresets = seedCatalog.sizePresets,
  defaultProductVideos = [],
) {
  const mainImageUrl = document.mainImageUrl || '';
  const gallery = Array.isArray(document.galleryImages)
    ? document.galleryImages
        .map((image) => image?.url || '')
        .filter(Boolean)
    : [];
  const productVideos = Array.isArray(document.productVideos) ? document.productVideos : [];
  const videos = sanitizeVideoEntries([...productVideos, ...defaultProductVideos]);

  return normalizeProduct(
    {
      id: document.productId || document._id,
      slug: document.slug,
      previousSlugs: Array.isArray(document.previousSlugs) ? document.previousSlugs : [],
      seoAliases: Array.isArray(document.seoAliases) ? document.seoAliases : [],
      title: document.title,
      seoTitle: document.seoTitle,
      seoDescription: document.seoDescription,
      description: document.description,
      longDescription: document.longDescription,
      label: document.label || document.title,
      image: mainImageUrl,
      framedBlackImage: document.framedBlackImageUrl || undefined,
      framedWhiteImage: document.framedWhiteImageUrl || undefined,
      imageAlt: document.imageAlt || document.mainImageAlt || document.title,
      artworkShape: getArtworkShapeFromSizePreset(document.sizePreset),
      aspectRatio: getProductAspectRatio(document),
      gallery,
      videos,
      tone: document.tone || 'minimal',
      collectionSlugs: Array.isArray(document.collectionSlugs) ? document.collectionSlugs : [],
      priceInCents: document.priceInCents,
      size: document.size || 'Canvas print',
      sizePreset: document.sizePreset,
      useCustomSizeOptions: document.useCustomSizeOptions === true,
      sizeOptions: document.sizeOptions,
      rating: Number(document.rating ?? 5),
      reviewCount: Number(document.reviewCount ?? 0),
      details: Array.isArray(document.details) ? document.details : [],
      published: document.published !== false,
    },
    sizePresets,
  );
}

const SANITY_CATALOG_SETTINGS_QUERY = `*[
  _type == "catalogSettings"
  && !(_id in path("drafts.**"))
][0]{
  sizePresets{
    portraitTwoThree[]{id, label, priceInCents, badge, previewScale},
    portraitThreeFour[]{id, label, priceInCents, badge, previewScale},
    landscapeWide[]{id, label, priceInCents, badge, previewScale},
    landscapeThreeTwo[]{id, label, priceInCents, badge, previewScale},
    landscapeFourThree[]{id, label, priceInCents, badge, previewScale},
    squareStandard[]{id, label, priceInCents, badge, previewScale}
  },
  "defaultProductVideo": defaultProductVideo{
    title,
    "url": coalesce(videoFile.asset->url, videoUrl),
    "thumbnail": thumbnail.asset->url
  }
}`;

const SANITY_HOMEPAGE_SETTINGS_QUERY = `*[
  _type == "homepageSettings"
  && !(_id in path("drafts.**"))
][0]{
  "heroProductIds": heroProducts[]->productId,
  "heroSlideshowImages": heroSlideshowImages[]{
    "url": asset->url,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height,
    "productSlug": linkedProduct->slug.current,
    "productTitle": linkedProduct->title
  },
  "heroMobileImage": heroMobileImage{
    "url": asset->url,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  },
  "heroDesktopImage": heroDesktopImage{
    "url": asset->url,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  },
  "bestSellerProductIds": bestSellerProducts[]->productId,
  "bestSellerImages": bestSellerImages[]{
    "url": asset->url,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height,
    "productSlug": linkedProduct->slug.current,
    "productTitle": linkedProduct->title
  },
  "bestSellerMobileImages": bestSellerMobileImages[]{
    "url": asset->url,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height,
    "productSlug": linkedProduct->slug.current,
    "productTitle": linkedProduct->title
  },
  "newArrivalProductIds": newArrivalProducts[]->productId,
  "newArrivalImages": newArrivalImages[]{
    "url": asset->url,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height,
    "productSlug": linkedProduct->slug.current,
    "productTitle": linkedProduct->title
  },
  "newArrivalMobileImages": newArrivalMobileImages[]{
    "url": asset->url,
    alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height,
    "productSlug": linkedProduct->slug.current,
    "productTitle": linkedProduct->title
  }
}`;

const SANITY_PRODUCTS_QUERY = `*[
  _type == "artworkProduct"
  && defined(slug.current)
  && !(_id in path("drafts.**"))
] | order(coalesce(sortOrder, 9999) asc, title asc) {
  _id,
  productId,
  "slug": slug.current,
  previousSlugs,
  seoAliases,
  title,
  seoTitle,
  seoDescription,
  description,
  longDescription,
  label,
  imageAlt,
  aspectRatio,
  "mainImageUrl": mainImage.asset->url,
  "mainImageAlt": mainImage.alt,
  "framedBlackImageUrl": mockupFramedBlack.asset->url,
  "framedWhiteImageUrl": mockupFramedWhite.asset->url,
  "galleryImages": galleryImages[]{
    "url": asset->url,
    alt
  },
  "productVideos": productVideos[]{
    title,
    "url": coalesce(videoFile.asset->url, videoUrl),
    "thumbnail": thumbnail.asset->url
  },
  tone,
  collectionSlugs,
  priceInCents,
  size,
  sizePreset,
  useCustomSizeOptions,
  sizeOptions,
  rating,
  reviewCount,
  details,
  published
}`;

export function sanitizeProductUpdate(existingProduct, update) {
  const next = {
    ...existingProduct,
    id: existingProduct.id,
  };

  const stringFields = [
    'slug',
    'title',
    'seoTitle',
    'seoDescription',
    'description',
    'longDescription',
    'label',
    'imageFolder',
    'image',
    'imageAlt',
    'artworkShape',
    'aspectRatio',
    'tone',
    'size',
    'sizePreset',
    'defaultSizeId',
  ];

  stringFields.forEach((field) => {
    if (field in update) {
      next[field] = sanitizeText(update[field]);
    }
  });

  if ('published' in update) {
    next.published = update.published !== false;
  }

  if ('useCustomSizeOptions' in update) {
    next.useCustomSizeOptions = update.useCustomSizeOptions === true;
  }

  if ('useCustomFrameOptions' in update) {
    next.useCustomFrameOptions = update.useCustomFrameOptions === true;
  }

  if ('rating' in update) {
    next.rating = sanitizeNumber(update.rating, existingProduct.rating || 0);
  }

  if ('reviewCount' in update) {
    next.reviewCount = Math.max(0, Math.round(sanitizeNumber(update.reviewCount, existingProduct.reviewCount || 0)));
  }

  if ('gallery' in update) {
    next.gallery = sanitizeTextArray(update.gallery);
  }

  if ('videos' in update) {
    next.videos = sanitizeVideoEntries(update.videos);
  }

  if ('previousSlugs' in update) {
    next.previousSlugs = sanitizeTextArray(update.previousSlugs);
  }

  if ('seoAliases' in update) {
    next.seoAliases = sanitizeTextArray(update.seoAliases);
  }

  if ('collectionSlugs' in update) {
    next.collectionSlugs = normalizeCollectionSlugs(sanitizeTextArray(update.collectionSlugs));
  }

  if ('details' in update) {
    next.details = sanitizeTextArray(update.details);
  }

  if ('sizeOptions' in update) {
    const sizeOptions = sanitizeSizeOptions(update.sizeOptions);
    if (sizeOptions?.length) {
      next.sizeOptions = sizeOptions;
    }
  }

  if ('frameOptions' in update) {
    const frameOptions = sanitizeFrameOptions(update.frameOptions);
    if (frameOptions?.length) {
      next.frameOptions = frameOptions;
    }
  }

  if (!next.slug || !next.title || !next.description || !next.longDescription || !next.imageAlt) {
    const error = new Error('Product must include slug, title, description, long description, and image alt text.');
    error.status = 400;
    throw error;
  }

  return next;
}

async function readLocalDatabase() {
  const parsed = await readJsonFile(productsFile, () => ({ products: [] }));

  return {
    products: Array.isArray(parsed?.products) ? parsed.products : [],
  };
}

async function writeLocalDatabase(database) {
  await writeJsonFileAtomic(productsFile, database);
}

class LocalProductStore {
  type = 'local-json';

  async init() {
    const database = await readLocalDatabase();
    const existingIds = new Set(database.products.map((product) => product.id));
    const missingSeedRows = seedRows().filter((product) => !existingIds.has(product.id));
    const nextDatabase = {
      products: [...database.products, ...missingSeedRows],
    };

    await writeLocalDatabase(nextDatabase);
  }

  async listCatalog(options = {}) {
    const database = await readLocalDatabase();
    return normalizeRowsToCatalog(database.products, options);
  }

  async listProducts(options = {}) {
    return (await this.listCatalog(options)).products;
  }

  async updateProduct(productId, update) {
    const database = await readLocalDatabase();
    const existingIndex = database.products.findIndex((product) => product.id === productId);

    if (existingIndex < 0) {
      return null;
    }

    const existingRow = database.products[existingIndex];
    const data = sanitizeProductUpdate(existingRow.data, update);
    const nextRow = {
      ...existingRow,
      slug: data.slug,
      published: data.published !== false,
      data,
      updatedAt: nowIso(),
    };

    database.products[existingIndex] = nextRow;
    await writeLocalDatabase(database);

    return normalizeProduct({ ...nextRow.data, published: nextRow.published }, seedCatalog.sizePresets);
  }
}

class PostgresProductStore {
  type = 'postgres';

  constructor(databaseUrl) {
    const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };

    this.pool = new Pool({
      connectionString: normalizeDatabaseUrl(databaseUrl),
      ssl,
    });
  }

  async init() {
    const client = await this.pool.connect();
    let advisoryLockAcquired = false;

    try {
      const lockResult = await client.query('select pg_try_advisory_lock(421042, 20260515) as acquired');
      advisoryLockAcquired = lockResult.rows[0]?.acquired === true;
      await client.query(`
        create table if not exists products (
          id text primary key,
          slug text unique not null,
          published boolean not null default true,
          sort_order integer not null default 0,
          data jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);

      for (const row of seedRows()) {
        await client.query(
          `
            insert into products (id, slug, published, sort_order, data, created_at, updated_at)
            values ($1, $2, $3, $4, $5::jsonb, $6, $7)
            on conflict do nothing
          `,
          [
            row.id,
            row.slug,
            row.published,
            row.sortOrder,
            JSON.stringify(row.data),
            row.createdAt,
            row.updatedAt,
          ],
        );
      }
    } finally {
      if (advisoryLockAcquired) {
        await client.query('select pg_advisory_unlock(421042, 20260515)').catch(() => {});
      }
      client.release();
    }
  }

  rowToStoreRow(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      slug: row.slug,
      published: row.published,
      sortOrder: row.sort_order,
      data: row.data || {},
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    };
  }

  async listCatalog(options = {}) {
    const result = await this.pool.query('select * from products order by sort_order asc, created_at asc');
    return normalizeRowsToCatalog(result.rows.map((row) => this.rowToStoreRow(row)), options);
  }

  async listProducts(options = {}) {
    return (await this.listCatalog(options)).products;
  }

  async getRow(productId) {
    const result = await this.pool.query('select * from products where id = $1 limit 1', [productId]);
    return this.rowToStoreRow(result.rows[0]);
  }

  async updateProduct(productId, update) {
    const existingRow = await this.getRow(productId);

    if (!existingRow) {
      return null;
    }

    const data = sanitizeProductUpdate(existingRow.data, update);
    const result = await this.pool.query(
      `
        update products
        set slug = $2,
            published = $3,
            data = $4::jsonb,
            updated_at = now()
        where id = $1
        returning *
      `,
      [productId, data.slug, data.published !== false, JSON.stringify(data)],
    );
    const row = this.rowToStoreRow(result.rows[0]);

    return normalizeProduct({ ...row.data, published: row.published }, seedCatalog.sizePresets);
  }
}

class SanityProductStore {
  type = 'sanity';

  constructor(config, fallbackStore) {
    this.client = getSanityClient(config);
    this.fallbackStore = fallbackStore;
    this.fallbackReady = null;
  }

  async init() {
    // Defer fallback setup so a slow Postgres connection cannot block Sanity-backed reads.
  }

  async getFallbackCatalog(options = {}) {
    this.fallbackReady ??= this.fallbackStore.init();
    await this.fallbackReady;

    return this.fallbackStore.listCatalog(options);
  }

  async listCatalog(options = {}) {
    const allowFallback = options.allowFallback !== false;

    try {
      const [settings, homepageSettingsDocument, documents] = await Promise.all([
        this.client.fetch(SANITY_CATALOG_SETTINGS_QUERY),
        this.client.fetch(SANITY_HOMEPAGE_SETTINGS_QUERY),
        this.client.fetch(SANITY_PRODUCTS_QUERY),
      ]);
      const sizePresets = normalizeSanitySizePresets(settings);
      const defaultProductVideos = sanitizeVideoEntries([settings?.defaultProductVideo]);
      const homepageSettings = normalizeSanityHomepageSettings(homepageSettingsDocument);
      const products = documents.map((document) =>
        normalizeSanityProduct(document, sizePresets, defaultProductVideos),
      );

      if (!products.length) {
        if (!allowFallback) {
          const error = new Error('Sanity returned an empty product catalog.');
          error.code = 'SANITY_CATALOG_EMPTY';
          throw error;
        }

        return this.getFallbackCatalog(options);
      }

      return {
        ...normalizeCatalogData({
          ...seedCatalog,
          sizePresets,
          homepageSettings,
          products: [],
        }),
        products: options.includeUnpublished ? products : products.filter((product) => product.published),
      };
    } catch (error) {
      if (!allowFallback) {
        throw error;
      }

      console.warn('Sanity catalog unavailable; using local catalog fallback.', error?.message || error);
      return this.getFallbackCatalog(options);
    }
  }

  async listProducts(options = {}) {
    return (await this.listCatalog(options)).products;
  }

  async updateProduct() {
    const error = new Error(
      'The live catalog is managed in Sanity Studio. Open /sanity to edit this product.',
    );
    error.status = 409;
    throw error;
  }
}

export function createProductStore() {
  const sanityConfig = getSanityConfig();
  const databaseUrl = getDatabaseUrl();
  const fallbackStore = databaseUrl ? new PostgresProductStore(databaseUrl) : new LocalProductStore();

  if (sanityConfig.enabled && sanityConfig.projectId && sanityConfig.dataset) {
    return new SanityProductStore(sanityConfig, fallbackStore);
  }

  return fallbackStore;
}

export async function getSanityCatalogDiagnostics() {
  const config = getSanityConfig();
  const client = getSanityClient(config);

  if (!client) {
    return {
      enabled: config.enabled,
      configured: false,
      projectId: Boolean(config.projectId),
      dataset: config.dataset,
      tokenPresent: Boolean(config.token),
      readable: false,
      count: 0,
    };
  }

  try {
    const result = await client.fetch(`{
      "count": count(*[
        _type == "artworkProduct"
        && defined(slug.current)
        && !(_id in path("drafts.**"))
      ]),
      "sample": *[
        _type == "artworkProduct"
        && defined(slug.current)
        && !(_id in path("drafts.**"))
      ] | order(coalesce(sortOrder, 9999) asc, title asc)[0]{
        title,
        "image": mainImage.asset->url
      }
    }`);

    return {
      enabled: config.enabled,
      configured: true,
      projectId: config.projectId,
      dataset: config.dataset,
      tokenPresent: Boolean(config.token),
      readable: true,
      count: result.count || 0,
      sample: result.sample || null,
    };
  } catch (error) {
    return {
      enabled: config.enabled,
      configured: true,
      projectId: config.projectId,
      dataset: config.dataset,
      tokenPresent: Boolean(config.token),
      readable: false,
      count: 0,
      error: error?.message || 'Sanity request failed.',
      statusCode: error?.statusCode,
    };
  }
}
