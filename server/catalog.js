import { readFileSync } from 'node:fs';
import path from 'node:path';

export const seedCatalog = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'src/data/catalog.json'), 'utf8'),
);

const primaryCollectionSlug = 'best-sellers';
const excludedNewArrivalSlug = 'new-arrivals';

export function normalizeCollectionSlugs(collectionSlugs = []) {
  const uniqueSlugs = [...new Set((Array.isArray(collectionSlugs) ? collectionSlugs : []).filter(Boolean))];

  if (!uniqueSlugs.includes(primaryCollectionSlug)) {
    return uniqueSlugs;
  }

  return uniqueSlugs.filter((slug) => slug !== excludedNewArrivalSlug);
}

const fallbackFrameOptions = [
  { id: 'canvas', label: 'Canvas', priceDeltaInCents: 0 },
  {
    id: 'black-frame',
    label: 'Black Frame',
    priceDeltaInCents: 0,
    priceDeltaBySizeIndexInCents: [4000, 4000, 6000, 8000, 10000],
    priceDeltaBySizeIdInCents: {
      '12x18': 4000,
      '16x24': 4000,
      '18x12': 4000,
      '20x10': 4000,
      '24x16': 4000,
      '24x36': 6000,
      '32x48': 13000,
      '36x24': 6000,
      '40x60': 10000,
      '48x24': 8000,
      '48x32': 13000,
      '60x30': 10000,
      '60x40': 10000,
    },
    unavailableSizeIds: ['30x15', '40x20'],
  },
  {
    id: 'white-frame',
    label: 'White Frame',
    priceDeltaInCents: 0,
    priceDeltaBySizeIndexInCents: [4000, 4000, 6000, 8000, 10000],
    priceDeltaBySizeIdInCents: {
      '12x18': 4000,
      '16x24': 4000,
      '18x12': 4000,
      '20x10': 4000,
      '24x16': 4000,
      '24x36': 6000,
      '32x48': 13000,
      '36x24': 6000,
      '40x60': 10000,
      '48x24': 8000,
      '48x32': 13000,
      '60x30': 10000,
      '60x40': 10000,
    },
    unavailableSizeIds: ['30x15', '40x20'],
  },
];

function getCanonicalSizeId(option) {
  const labelId = String(option.label || '')
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\s+/g, '');

  return /^\d+x\d+$/.test(labelId) ? labelId : option.id;
}

function normalizeSizeOptions(sizeOptions = []) {
  return sizeOptions.map((option) => {
    const canonicalId = getCanonicalSizeId(option);
    const legacyIds = [
      ...(option.legacyIds || []),
      ...(canonicalId !== option.id ? [option.id] : []),
    ];

    return {
      ...option,
      id: canonicalId,
      ...(legacyIds.length ? { legacyIds: [...new Set(legacyIds)] } : {}),
    };
  });
}

function normalizeSizePresets(sizePresets = {}) {
  return Object.fromEntries(
    Object.entries(sizePresets).map(([presetName, sizeOptions]) => [
      presetName,
      normalizeSizeOptions(sizeOptions),
    ]),
  );
}

function normalizeSizeId(sizeId, sizeOptions) {
  if (!sizeId) {
    return sizeId;
  }

  const match = sizeOptions.find(
    (option) => option.id === sizeId || option.legacyIds?.includes(sizeId),
  );

  return match?.id || sizeId;
}

function normalizeFrameOptions(sizeOptions) {
  return fallbackFrameOptions.map((option) => {
    const priceDeltaBySizeIdInCents = option.priceDeltaBySizeIdInCents
      ? Object.fromEntries(
          Object.entries(option.priceDeltaBySizeIdInCents).map(([sizeId, priceDelta]) => [
            normalizeSizeId(sizeId, sizeOptions),
            priceDelta,
          ]),
        )
      : undefined;
    const unavailableSizeIds = option.unavailableSizeIds?.map((sizeId) =>
      normalizeSizeId(sizeId, sizeOptions) || sizeId,
    );

    return {
      ...option,
      ...(priceDeltaBySizeIdInCents ? { priceDeltaBySizeIdInCents } : {}),
      ...(unavailableSizeIds ? { unavailableSizeIds } : {}),
    };
  });
}

export function getArtworkShapeFromSizePreset(sizePreset) {
  if (sizePreset === 'portraitThreeFour' || sizePreset === 'portraitTwoThree') {
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
    portraitThreeFour: '3 / 4',
    portraitTwoThree: '2 / 3',
    squareStandard: '1 / 1',
  };

  return sizePreset ? aspectRatiosByPreset[sizePreset] : undefined;
}

export function getProductAspectRatio(product) {
  const presetAspectRatio = getAspectRatioFromSizePreset(product.sizePreset);

  if (presetAspectRatio) {
    return presetAspectRatio;
  }

  if (product.aspectRatio) {
    return product.aspectRatio;
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
  const sizeOptions = normalizeSizeOptions(getSizeOptionsForProduct(product, sizePresets));
  const frameOptions = normalizeFrameOptions(sizeOptions);
  const normalizedDefaultSizeId = normalizeSizeId(product.defaultSizeId, sizeOptions);
  const defaultSizeId = sizeOptions.some((option) => option.id === normalizedDefaultSizeId)
    ? normalizedDefaultSizeId
    : sizeOptions[0]?.id || normalizedDefaultSizeId;
  const lowestSizePrice = sizeOptions.length
    ? Math.min(...sizeOptions.map((option) => option.priceInCents))
    : Number(product.priceInCents ?? 0);
  const lowestFrameDelta = Math.min(
    ...frameOptions.map((option) => option.priceDeltaBySizeIndexInCents?.[0] ?? option.priceDeltaInCents ?? 0),
  );

  return {
    ...product,
    collectionSlugs: normalizeCollectionSlugs(product.collectionSlugs),
    name: product.title,
    imagePath: product.image || '',
    artworkShape: product.artworkShape || getArtworkShapeFromSizePreset(product.sizePreset),
    aspectRatio: getProductAspectRatio(product),
    priceInCents: product.priceInCents ?? lowestSizePrice + lowestFrameDelta,
    defaultSizeId,
    sizeOptions,
    frameOptions,
    published: product.published !== false,
  };
}

export function normalizeCatalogData(catalog = seedCatalog) {
  const sizePresets = normalizeSizePresets(catalog.sizePresets);

  return {
    sizePresets,
    collections: catalog.collections,
    homepageSettings: catalog.homepageSettings || {},
    products: catalog.products.map((product) => normalizeProduct(product, sizePresets)),
  };
}

export const catalog = normalizeCatalogData(seedCatalog);
export const products = catalog.products;

export function findProduct(productId, productList = products) {
  return productList.find((product) => product.id === productId && product.published !== false);
}

export function findSizeOption(product, sizeId) {
  return (
    product.sizeOptions.find(
      (option) => option.id === sizeId || option.legacyIds?.includes(sizeId),
    ) ??
    product.sizeOptions.find((option) => option.id === product.defaultSizeId) ??
    product.sizeOptions[0]
  );
}

export function isFrameOptionAvailableForSize(frameOption, sizeOption) {
  return !sizeOption || !frameOption.unavailableSizeIds?.includes(sizeOption.id);
}

export function findFrameOption(product, frameId, sizeOption) {
  const frameOption = product.frameOptions.find((option) => option.id === frameId);

  if (frameOption && (!sizeOption || isFrameOptionAvailableForSize(frameOption, sizeOption))) {
    return frameOption;
  }

  return (
    product.frameOptions.find((option) => !sizeOption || isFrameOptionAvailableForSize(option, sizeOption)) ??
    product.frameOptions[0] ??
    fallbackFrameOptions[0]
  );
}

export function getFramePriceDelta(product, sizeOption, frameOption) {
  if (!isFrameOptionAvailableForSize(frameOption, sizeOption)) {
    return 0;
  }

  if (frameOption.priceDeltaBySizeIdInCents?.[sizeOption.id] != null) {
    return Number(frameOption.priceDeltaBySizeIdInCents[sizeOption.id]);
  }

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
