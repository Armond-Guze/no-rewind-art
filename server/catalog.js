import { readFileSync } from 'node:fs';
import path from 'node:path';

export const seedCatalog = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'src/data/catalog.json'), 'utf8'),
);

const fallbackFrameOptions = [
  { id: 'canvas', label: 'Canvas', priceDeltaInCents: 0 },
  {
    id: 'black-frame',
    label: 'Black Frame',
    priceDeltaInCents: 0,
    priceDeltaBySizeIndexInCents: [2000, 3000, 4000, 5000, 6000],
  },
  {
    id: 'white-frame',
    label: 'White Frame',
    priceDeltaInCents: 0,
    priceDeltaBySizeIndexInCents: [2000, 3000, 4000, 5000, 6000],
  },
];

function normalizeFrameOptions() {
  return fallbackFrameOptions;
}

export function getArtworkShapeFromSizePreset(sizePreset) {
  if (sizePreset === 'portraitTwoThree') {
    return 'portrait';
  }

  if (sizePreset === 'squareStandard') {
    return 'square';
  }

  return 'landscape';
}

export function getAspectRatioFromSizePreset(sizePreset) {
  const aspectRatiosByPreset = {
    landscapeFourThree: '4 / 3',
    landscapeThreeTwo: '3 / 2',
    landscapeWide: '2 / 1',
    portraitTwoThree: '2 / 3',
    squareStandard: '1 / 1',
  };

  return sizePreset ? aspectRatiosByPreset[sizePreset] : undefined;
}

export function getProductAspectRatio(product) {
  if (product.aspectRatio) {
    return product.aspectRatio;
  }

  const presetAspectRatio = getAspectRatioFromSizePreset(product.sizePreset);

  if (presetAspectRatio) {
    return presetAspectRatio;
  }

  if (product.artworkShape === 'portrait') {
    return '2 / 3';
  }

  if (product.artworkShape === 'landscape') {
    return '2 / 1';
  }

  return '1 / 1';
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
  const frameOptions = normalizeFrameOptions();
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
    artworkShape: product.artworkShape || getArtworkShapeFromSizePreset(product.sizePreset),
    aspectRatio: getProductAspectRatio(product),
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
