import { readFileSync } from 'node:fs';

export const seedCatalog = JSON.parse(
  readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'),
);

const fallbackFrameOptions = [
  { id: 'canvas', label: 'Canvas', priceDeltaInCents: 0 },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeFrameOptions(product) {
  if (Array.isArray(product.frameOptions) && product.frameOptions.length) {
    return product.frameOptions;
  }

  if (Array.isArray(product.framingOptions) && product.framingOptions.length) {
    return product.framingOptions.map((label) => ({
      id: slugify(label),
      label,
      priceDeltaInCents: 0,
    }));
  }

  return fallbackFrameOptions;
}

function getSizeOptionsForProduct(product, sizePresets) {
  if (product.useCustomSizeOptions && Array.isArray(product.sizeOptions) && product.sizeOptions.length) {
    return product.sizeOptions;
  }

  return (
    (product.sizePreset ? sizePresets[product.sizePreset] : undefined) ||
    sizePresets.landscapeWide ||
    []
  );
}

export function normalizeProduct(product, sizePresets = seedCatalog.sizePresets) {
  const sizeOptions = getSizeOptionsForProduct(product, sizePresets);
  const frameOptions = normalizeFrameOptions(product);
  const lowestSizePrice = sizeOptions.length
    ? Math.min(...sizeOptions.map((option) => option.priceInCents))
    : Number(product.priceInCents ?? 0);
  const lowestFrameDelta = Math.min(
    ...frameOptions.map((option) => option.priceDeltaBySizeIndexInCents?.[0] ?? option.priceDeltaInCents ?? 0),
  );

  return {
    ...product,
    name: product.title,
    imagePath: product.image || '',
    priceInCents: product.priceInCents ?? lowestSizePrice + lowestFrameDelta,
    sizeOptions,
    frameOptions,
    published: product.published !== false,
  };
}

export function normalizeCatalogData(catalog = seedCatalog) {
  return {
    sizePresets: catalog.sizePresets,
    collections: catalog.collections,
    products: catalog.products.map((product) => normalizeProduct(product, catalog.sizePresets)),
  };
}

export const catalog = normalizeCatalogData(seedCatalog);
export const products = catalog.products;

export function findProduct(productId, productList = products) {
  return productList.find((product) => product.id === productId && product.published !== false);
}

export function findSizeOption(product, sizeId) {
  return (
    product.sizeOptions.find((option) => option.id === sizeId) ??
    product.sizeOptions.find((option) => option.id === product.defaultSizeId) ??
    product.sizeOptions[0]
  );
}

export function findFrameOption(product, frameId) {
  return (
    product.frameOptions.find((option) => option.id === frameId) ??
    product.frameOptions[0] ??
    fallbackFrameOptions[0]
  );
}

export function getFramePriceDelta(product, sizeOption, frameOption) {
  if (Array.isArray(frameOption.priceDeltaBySizeIndexInCents)) {
    const sizeIndex = Math.max(
      0,
      product.sizeOptions.findIndex((option) => option.id === sizeOption.id),
    );
    const fallbackIndex = frameOption.priceDeltaBySizeIndexInCents.length - 1;

    return Number(
      frameOption.priceDeltaBySizeIndexInCents[sizeIndex] ??
        frameOption.priceDeltaBySizeIndexInCents[fallbackIndex] ??
        frameOption.priceDeltaInCents ??
        0,
    );
  }

  return Number(frameOption.priceDeltaInCents || 0);
}
