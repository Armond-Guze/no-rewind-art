import catalog from './catalog.json';

export type ProductTone = 'cassette' | 'focus' | 'space' | 'money' | 'minimal';
export type ArtworkShape = 'portrait' | 'landscape' | 'square';

export type SizeOption = {
  id: string;
  label: string;
  priceInCents: number;
  badge?: string;
  previewScale?: number;
  legacyIds?: string[];
};

export type FrameOption = {
  id: string;
  label: string;
  priceDeltaInCents?: number;
  priceDeltaBySizeIndexInCents?: number[];
  priceDeltaBySizeIdInCents?: Record<string, number>;
  unavailableSizeIds?: string[];
  badge?: string;
};

export type ProductVideo = {
  id?: string;
  title?: string;
  url: string;
  thumbnail?: string;
};

export type ProductImageCrop = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type ProductImageHotspot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProductGalleryImage = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  crop?: ProductImageCrop;
  hotspot?: ProductImageHotspot;
};

export type HomepageHeroImage = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  productSlug?: string;
  productTitle?: string;
};

export type Collection = {
  slug: string;
  title: string;
  navLabel: string;
  description: string;
  productIds?: string[];
  tones?: ProductTone[];
};

export type HomepageSettings = {
  heroProductIds?: string[];
  heroSlideshowImages?: HomepageHeroImage[];
  heroMobileImage?: HomepageHeroImage;
  heroDesktopImage?: HomepageHeroImage;
  bestSellerProductIds?: string[];
  bestSellerImages?: HomepageHeroImage[];
  bestSellerMobileImages?: HomepageHeroImage[];
  newArrivalProductIds?: string[];
  newArrivalImages?: HomepageHeroImage[];
  newArrivalMobileImages?: HomepageHeroImage[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  previousSlugs?: string[];
  seoAliases?: string[];
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  description: string;
  longDescription: string;
  label: string;
  imageFolder?: string;
  image?: string;
  mainImage?: ProductGalleryImage;
  framedBlackImage?: string;
  framedWhiteImage?: string;
  imageAlt: string;
  artworkShape: ArtworkShape;
  aspectRatio?: string;
  gallery?: string[];
  galleryImages?: ProductGalleryImage[];
  videos?: ProductVideo[];
  tone: ProductTone;
  collectionSlugs: string[];
  priceInCents?: number;
  size: string;
  sizePreset?: string;
  useCustomSizeOptions?: boolean;
  sizeOptions?: SizeOption[];
  defaultSizeId?: string;
  rating: number;
  reviewCount: number;
  useCustomFrameOptions?: boolean;
  frameOptions?: FrameOption[];
  framingOptions?: string[];
  details: string[];
  published?: boolean;
};

export type Product = Omit<CatalogProduct, 'frameOptions' | 'framingOptions' | 'priceInCents'> & {
  priceInCents: number;
  sizeOptions: SizeOption[];
  frameOptions: FrameOption[];
  published: boolean;
};

export type CatalogData = {
  sizePresets: Record<string, SizeOption[]>;
  collections: Collection[];
  homepageSettings?: HomepageSettings;
  defaultProductVideo?: ProductVideo;
  defaultProductVideos?: ProductVideo[];
  products: CatalogProduct[];
};

export type NormalizedCatalog = {
  sizePresets: Record<string, SizeOption[]>;
  collections: Collection[];
  homepageSettings: HomepageSettings;
  products: Product[];
};

const catalogData = catalog as CatalogData;
const primaryCollectionSlug = 'best-sellers';
const excludedNewArrivalSlug = 'new-arrivals';

export function normalizeCollectionSlugs(collectionSlugs: string[] = []) {
  const uniqueSlugs = [...new Set(collectionSlugs.filter(Boolean))];

  if (!uniqueSlugs.includes(primaryCollectionSlug)) {
    return uniqueSlugs;
  }

  return uniqueSlugs.filter((slug) => slug !== excludedNewArrivalSlug);
}

function filterProductsForCollectionRules<T extends Pick<Product, 'collectionSlugs'>>(
  products: T[],
  collectionSlug: string,
) {
  if (collectionSlug !== excludedNewArrivalSlug) {
    return products;
  }

  return products.filter((product) => !product.collectionSlugs.includes(primaryCollectionSlug));
}

const fallbackFrameOptions: FrameOption[] = [
  { id: 'canvas', label: 'Canvas', priceDeltaInCents: 0 },
  {
    id: 'black-frame',
    label: 'Black Frame',
    priceDeltaInCents: 0,
    priceDeltaBySizeIndexInCents: [2500, 2000, 3500, 5500, 7500],
    priceDeltaBySizeIdInCents: {
      '12x12': 2500,
      '12x18': 2500,
      '16x16': 2000,
      '16x24': 2000,
      '18x12': 2500,
      '20x10': 2500,
      '24x16': 2000,
      '24x24': 7000,
      '24x36': 3500,
      '30x30': 5500,
      '32x48': 5500,
      '36x24': 3500,
      '40x60': 7500,
      '48x24': 5500,
      '48x32': 5500,
      '60x30': 7500,
      '60x40': 7500,
    },
    unavailableSizeIds: ['30x15', '40x20'],
  },
  {
    id: 'white-frame',
    label: 'White Frame',
    priceDeltaInCents: 0,
    priceDeltaBySizeIndexInCents: [2500, 2000, 3500, 5500, 7500],
    priceDeltaBySizeIdInCents: {
      '12x12': 2500,
      '12x18': 2500,
      '16x16': 2000,
      '16x24': 2000,
      '18x12': 2500,
      '20x10': 2500,
      '24x16': 2000,
      '24x24': 7000,
      '24x36': 3500,
      '30x30': 5500,
      '32x48': 5500,
      '36x24': 3500,
      '40x60': 7500,
      '48x24': 5500,
      '48x32': 5500,
      '60x30': 7500,
      '60x40': 7500,
    },
    unavailableSizeIds: ['30x15', '40x20'],
  },
];

function getCanonicalSizeId(option: Pick<SizeOption, 'id' | 'label'>) {
  const labelId = option.label
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\s+/g, '');

  return /^\d+x\d+$/.test(labelId) ? labelId : option.id;
}

function normalizeSizeOptions(sizeOptions: SizeOption[] = []) {
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

function normalizeSizePresets(sizePresets: Record<string, SizeOption[]>) {
  return Object.fromEntries(
    Object.entries(sizePresets).map(([presetName, sizeOptions]) => [
      presetName,
      normalizeSizeOptions(sizeOptions),
    ]),
  );
}

function normalizeSizeId(sizeId: string | undefined, sizeOptions: SizeOption[]) {
  if (!sizeId) {
    return sizeId;
  }

  const match = sizeOptions.find(
    (option) => option.id === sizeId || option.legacyIds?.includes(sizeId),
  );

  return match?.id || sizeId;
}

function normalizeFrameOptions(sizeOptions: SizeOption[]): FrameOption[] {
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

function getArtworkShapeFromSizePreset(sizePreset?: string): ArtworkShape {
  if (sizePreset === 'portraitThreeFour' || sizePreset === 'portraitTwoThree') {
    return 'portrait';
  }

  if (sizePreset === 'squareStandard') {
    return 'square';
  }

  return 'landscape';
}

export function getAspectRatioFromSizePreset(sizePreset?: string) {
  const aspectRatiosByPreset: Record<string, string> = {
    landscapeFourThree: '4 / 3',
    landscapeThreeTwo: '3 / 2',
    landscapeWide: '2 / 1',
    portraitThreeFour: '3 / 4',
    portraitTwoThree: '2 / 3',
    squareStandard: '1 / 1',
  };

  return sizePreset ? aspectRatiosByPreset[sizePreset] : undefined;
}

export function getProductAspectRatio(product: Pick<CatalogProduct, 'aspectRatio' | 'artworkShape' | 'sizePreset'>) {
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

function getSizeOptionsForProduct(
  product: CatalogProduct,
  sizePresets: Record<string, SizeOption[]>,
) {
  if (product.useCustomSizeOptions && product.sizeOptions?.length) {
    return product.sizeOptions;
  }

  return (
    (product.sizePreset ? sizePresets[product.sizePreset] : undefined) ||
    sizePresets.landscapeWide ||
    []
  );
}

function normalizeProductVideos(videos: ProductVideo[] = []) {
  const videosByUrl = new Map<string, ProductVideo>();

  videos.forEach((video) => {
    const url = video.url.trim();

    if (!url) {
      return;
    }

    const normalizedVideo = {
      ...(video.id ? { id: video.id.trim() } : {}),
      ...(video.title ? { title: video.title.trim() } : {}),
      url,
      ...(video.thumbnail ? { thumbnail: video.thumbnail.trim() } : {}),
    };
    const existingVideo = videosByUrl.get(url) || {};

    videosByUrl.set(url, { ...normalizedVideo, ...existingVideo, url });
  });

  return [...videosByUrl.values()];
}

export function normalizeProduct(
  product: CatalogProduct,
  sizePresets: Record<string, SizeOption[]> = catalogData.sizePresets,
  defaultProductVideos: ProductVideo[] = [],
): Product {
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
    seoAliases: Array.isArray(product.seoAliases)
      ? [...new Set(product.seoAliases.map((alias) => String(alias).trim()).filter(Boolean))]
      : [],
    videos: normalizeProductVideos([...(product.videos || []), ...defaultProductVideos]),
    collectionSlugs: normalizeCollectionSlugs(product.collectionSlugs || []),
    artworkShape: product.artworkShape || getArtworkShapeFromSizePreset(product.sizePreset),
    aspectRatio: getProductAspectRatio(product),
    priceInCents: product.priceInCents ?? lowestSizePrice + lowestFrameDelta,
    defaultSizeId,
    sizeOptions,
    frameOptions,
    published: product.published !== false,
  };
}

export function normalizeCatalogData(data: CatalogData): NormalizedCatalog {
  const sizePresets = normalizeSizePresets(data.sizePresets);
  const defaultProductVideos = normalizeProductVideos([
    ...(data.defaultProductVideos || []),
    ...(data.defaultProductVideo ? [data.defaultProductVideo] : []),
  ]);

  return {
    sizePresets,
    collections: data.collections,
    homepageSettings: data.homepageSettings || {},
    products: data.products.map((product) => normalizeProduct(product, sizePresets, defaultProductVideos)),
  };
}

export const initialCatalog = normalizeCatalogData(catalogData);
export const sizePresets = initialCatalog.sizePresets;
export const collections = initialCatalog.collections;
export const products = initialCatalog.products;

export function getProductBySlugFromCatalog(
  catalogState: NormalizedCatalog,
  slug: string | undefined,
) {
  return catalogState.products.find(
    (product) => product.published && (product.slug === slug || product.previousSlugs?.includes(slug || '')),
  );
}

export function getCollectionBySlugFromCatalog(
  catalogState: NormalizedCatalog,
  slug: string | undefined,
) {
  return catalogState.collections.find((collection) => collection.slug === slug);
}

export function getProductsForCollectionFromCatalog(
  catalogState: NormalizedCatalog,
  slug: string | undefined,
) {
  const collection = getCollectionBySlugFromCatalog(catalogState, slug);

  if (!collection) {
    return [];
  }

  const publishedProducts = catalogState.products.filter((product) => product.published);

  if (collection.productIds) {
    const taggedProducts = filterProductsForCollectionRules(
      publishedProducts.filter((product) => product.collectionSlugs.includes(collection.slug)),
      collection.slug,
    );

    if (taggedProducts.length) {
      return taggedProducts;
    }

    return filterProductsForCollectionRules(
      collection.productIds
        .map((productId) => publishedProducts.find((product) => product.id === productId))
        .filter((product): product is Product => Boolean(product)),
      collection.slug,
    );
  }

  if (collection.tones) {
    return filterProductsForCollectionRules(
      publishedProducts.filter(
        (product) =>
          collection.tones?.includes(product.tone) ||
          product.collectionSlugs.includes(collection.slug),
      ),
      collection.slug,
    );
  }

  return filterProductsForCollectionRules(
    publishedProducts.filter((product) => product.collectionSlugs.includes(collection.slug)),
    collection.slug,
  );
}

export function getProductByGoogleItemIdFromCatalog(
  catalogState: NormalizedCatalog,
  itemId: string | undefined,
) {
  if (!itemId) {
    return null;
  }

  for (const product of catalogState.products) {
    if (!product.published) {
      continue;
    }

    const sizeOption = product.sizeOptions.find(
      (option) =>
        itemId === `${product.id}-${option.id}` ||
        option.legacyIds?.some((legacyId) => itemId === `${product.id}-${legacyId}`),
    );

    if (sizeOption) {
      return { product, sizeOption };
    }
  }

  return null;
}

export function getProductBySlug(slug: string | undefined) {
  return getProductBySlugFromCatalog(initialCatalog, slug);
}

export function getCollectionBySlug(slug: string | undefined) {
  return getCollectionBySlugFromCatalog(initialCatalog, slug);
}

export function getProductsForCollection(slug: string | undefined) {
  return getProductsForCollectionFromCatalog(initialCatalog, slug);
}
