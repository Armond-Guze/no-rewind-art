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
  products: CatalogProduct[];
};

export type NormalizedCatalog = {
  sizePresets: Record<string, SizeOption[]>;
  collections: Collection[];
  products: Product[];
};

const catalogData = catalog as CatalogData;

const fallbackFrameOptions: FrameOption[] = [
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

function normalizeFrameOptions(): FrameOption[] {
  return fallbackFrameOptions;
}

function getArtworkShapeFromSizePreset(sizePreset?: string): ArtworkShape {
  if (sizePreset === 'portraitTwoThree') {
    return 'portrait';
  }

  if (sizePreset === 'squareStandard') {
    return 'square';
  }

  return 'landscape';
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
    artworkShape: product.artworkShape || getArtworkShapeFromSizePreset(product.sizePreset),
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
    return collection.productIds
      .map((productId) => publishedProducts.find((product) => product.id === productId))
      .filter((product): product is Product => Boolean(product));
  }

  if (collection.tones) {
    return publishedProducts.filter(
      (product) =>
        collection.tones?.includes(product.tone) ||
        product.collectionSlugs.includes(collection.slug),
    );
  }

  return publishedProducts.filter((product) => product.collectionSlugs.includes(collection.slug));
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
