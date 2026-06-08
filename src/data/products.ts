import catalog from './catalog.json';

export type ProductTone = 'cassette' | 'focus' | 'space' | 'money' | 'minimal';
export type ArtworkShape = 'portrait' | 'landscape' | 'square';

export type SizeOption = {
  id: string;
  label: string;
  priceInCents: number;
  badge?: string;
  previewScale?: number;
};

export type FrameOption = {
  id: string;
  label: string;
  priceDeltaInCents?: number;
  priceDeltaBySizeIndexInCents?: number[];
  badge?: string;
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
  bestSellerProductIds?: string[];
  newArrivalProductIds?: string[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  previousSlugs?: string[];
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  description: string;
  longDescription: string;
  label: string;
  imageFolder?: string;
  image?: string;
  imageAlt: string;
  artworkShape: ArtworkShape;
  aspectRatio?: string;
  gallery?: string[];
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
    priceDeltaBySizeIndexInCents: [3000, 4500, 6500, 9000, 12000],
  },
  {
    id: 'white-frame',
    label: 'White Frame',
    priceDeltaInCents: 0,
    priceDeltaBySizeIndexInCents: [3000, 4500, 6500, 9000, 12000],
  },
];

function normalizeFrameOptions(): FrameOption[] {
  return fallbackFrameOptions;
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

export function normalizeProduct(
  product: CatalogProduct,
  sizePresets: Record<string, SizeOption[]> = catalogData.sizePresets,
): Product {
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
    collectionSlugs: normalizeCollectionSlugs(product.collectionSlugs || []),
    artworkShape: product.artworkShape || getArtworkShapeFromSizePreset(product.sizePreset),
    aspectRatio: getProductAspectRatio(product),
    priceInCents: product.priceInCents ?? lowestSizePrice + lowestFrameDelta,
    sizeOptions,
    frameOptions,
    published: product.published !== false,
  };
}

export function normalizeCatalogData(data: CatalogData): NormalizedCatalog {
  return {
    sizePresets: data.sizePresets,
    collections: data.collections,
    homepageSettings: data.homepageSettings || {},
    products: data.products.map((product) => normalizeProduct(product, data.sizePresets)),
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

    const sizeOption = product.sizeOptions.find((option) => itemId === `${product.id}-${option.id}`);

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
