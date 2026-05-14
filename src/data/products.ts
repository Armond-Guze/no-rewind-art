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

type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
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
  sizeOptions?: SizeOption[];
  defaultSizeId?: string;
  rating: number;
  reviewCount: number;
  frameOptions?: FrameOption[];
  framingOptions?: string[];
  details: string[];
};

export type Product = Omit<CatalogProduct, 'frameOptions' | 'framingOptions' | 'priceInCents'> & {
  priceInCents: number;
  sizeOptions: SizeOption[];
  frameOptions: FrameOption[];
};

type CatalogData = {
  sizePresets: Record<string, SizeOption[]>;
  collections: Collection[];
  products: CatalogProduct[];
};

const catalogData = catalog as CatalogData;

const fallbackFrameOptions: FrameOption[] = [
  { id: 'canvas', label: 'Canvas', priceDeltaInCents: 0 },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeFrameOptions(product: CatalogProduct): FrameOption[] {
  if (product.frameOptions?.length) {
    return product.frameOptions;
  }

  if (product.framingOptions?.length) {
    return product.framingOptions.map((label) => ({
      id: slugify(label),
      label,
      priceDeltaInCents: 0,
    }));
  }

  return fallbackFrameOptions;
}

function normalizeProduct(product: CatalogProduct): Product {
  const sizeOptions =
    product.sizeOptions ||
    (product.sizePreset ? catalogData.sizePresets[product.sizePreset] : undefined) ||
    catalogData.sizePresets.landscapeWide ||
    [];
  const frameOptions = normalizeFrameOptions(product);
  const lowestSizePrice = Math.min(...sizeOptions.map((option) => option.priceInCents));
  const lowestFrameDelta = Math.min(
    ...frameOptions.map((option) => option.priceDeltaBySizeIndexInCents?.[0] ?? option.priceDeltaInCents ?? 0),
  );

  return {
    ...product,
    priceInCents: product.priceInCents ?? lowestSizePrice + lowestFrameDelta,
    sizeOptions,
    frameOptions,
  };
}

export const sizePresets = catalogData.sizePresets;
export const collections = catalogData.collections;
export const products = catalogData.products.map(normalizeProduct);

export function getProductBySlug(slug: string | undefined) {
  return products.find((product) => product.slug === slug);
}

export function getCollectionBySlug(slug: string | undefined) {
  return collections.find((collection) => collection.slug === slug);
}

export function getProductsForCollection(slug: string | undefined) {
  const collection = getCollectionBySlug(slug);

  if (!collection) {
    return [];
  }

  if (collection.productIds) {
    return collection.productIds
      .map((productId) => products.find((product) => product.id === productId))
      .filter((product): product is Product => Boolean(product));
  }

  if (collection.tones) {
    return products.filter(
      (product) =>
        collection.tones?.includes(product.tone) ||
        product.collectionSlugs.includes(collection.slug),
    );
  }

  return products.filter((product) => product.collectionSlugs.includes(collection.slug));
}
