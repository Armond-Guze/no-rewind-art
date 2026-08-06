import type { Collection, FrameOption, Product, ProductVideo, SizeOption } from '../../data/products';

export const supportEmail = 'hello@armoze.com';
export const supportMailto = `mailto:${supportEmail}`;
export const launchOfferCode = 'FIRST15';
export const launchOfferDiscount = '15%';

export function createCheckoutRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// Temporary compatibility for live Sanity documents that still carry the retired
// discipline-focus tag. Keep this list explicit so unrelated discipline art does
// not spill into the Music collection; remove it after those documents are migrated.
const legacyMusicProductIds = new Set([
  'life-has-no-rewind-canvas',
  'reminder-life-has-no-rewind-canvas',
  'daily-reminder-canvas',
  'you-cant-turn-back-the-clock-canvas',
]);

export function productMatchesCollection(
  product: Pick<Product, 'id' | 'collectionSlugs'>,
  collectionSlug: string,
) {
  return (
    product.collectionSlugs.includes(collectionSlug) ||
    (collectionSlug === 'music' && legacyMusicProductIds.has(product.id))
  );
}

export function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function hasProductSpecificReviewSummary(
  product: Pick<Product, 'rating' | 'reviewCount'>,
) {
  const rating = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0);
  const isLegacyCatalogPlaceholder = rating === 4.8 && reviewCount === 61;

  return rating > 0 && reviewCount > 0 && !isLegacyCatalogPlaceholder;
}

export function getBaseSizeOption(product: Product) {
  return product.sizeOptions[0];
}

export function getFeaturedSizeOption(product: Product) {
  return (
    product.sizeOptions.find((option) => option.id === product.defaultSizeId) ??
    product.sizeOptions[0]
  );
}

export function sizeOptionMatches(option: SizeOption, sizeId: string | undefined) {
  return Boolean(sizeId && (option.id === sizeId || option.legacyIds?.includes(sizeId)));
}

export function getSizeOption(product: Product, sizeId: string) {
  return product.sizeOptions.find((option) => sizeOptionMatches(option, sizeId)) ?? getBaseSizeOption(product);
}

function getGreatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));

  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a || 1;
}

function getSimplifiedAspectRatio(width: number, height: number) {
  const normalizedWidth = Math.round(width * 1000);
  const normalizedHeight = Math.round(height * 1000);

  if (!normalizedWidth || !normalizedHeight) {
    return undefined;
  }

  const divisor = getGreatestCommonDivisor(normalizedWidth, normalizedHeight);

  return `${normalizedWidth / divisor} / ${normalizedHeight / divisor}`;
}

export function getSizeOptionAspectRatio(sizeOption?: Pick<SizeOption, 'id' | 'label'>) {
  if (!sizeOption) {
    return undefined;
  }

  const sizeMatch =
    sizeOption.id.match(/(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)/i) ??
    sizeOption.label.match(/(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)/i);

  if (!sizeMatch) {
    return undefined;
  }

  const width = Number(sizeMatch[1]);
  const height = Number(sizeMatch[2]);

  return getSimplifiedAspectRatio(width, height);
}

export function getBaseFrameOption(product: Product) {
  return product.frameOptions[0];
}

export function isFrameOptionAvailableForSize(frameOption: FrameOption, sizeOption: SizeOption) {
  return !frameOption.unavailableSizeIds?.includes(sizeOption.id);
}

export function getAvailableFrameOptions(product: Product, sizeOption: SizeOption) {
  const availableFrameOptions = product.frameOptions.filter((option) =>
    isFrameOptionAvailableForSize(option, sizeOption),
  );

  return availableFrameOptions.length ? availableFrameOptions : [getBaseFrameOption(product)];
}

export function getFrameOption(product: Product, frameId: string, sizeOption?: SizeOption) {
  const frameOption = product.frameOptions.find((option) => option.id === frameId);

  if (frameOption && (!sizeOption || isFrameOptionAvailableForSize(frameOption, sizeOption))) {
    return frameOption;
  }

  return sizeOption ? getAvailableFrameOptions(product, sizeOption)[0] : getBaseFrameOption(product);
}

export function getFramePriceDelta(product: Product, sizeOption: SizeOption, frameOption: FrameOption) {
  if (!isFrameOptionAvailableForSize(frameOption, sizeOption)) {
    return 0;
  }

  if (frameOption.priceDeltaBySizeIdInCents?.[sizeOption.id] != null) {
    return frameOption.priceDeltaBySizeIdInCents[sizeOption.id];
  }

  if (frameOption.priceDeltaBySizeIndexInCents?.length) {
    const sizeIndex = Math.max(
      0,
      product.sizeOptions.findIndex((option) => option.id === sizeOption.id),
    );
    const fallbackIndex = frameOption.priceDeltaBySizeIndexInCents.length - 1;

    return (
      frameOption.priceDeltaBySizeIndexInCents[sizeIndex] ??
      frameOption.priceDeltaBySizeIndexInCents[fallbackIndex] ??
      frameOption.priceDeltaInCents ??
      0
    );
  }

  return frameOption.priceDeltaInCents ?? 0;
}

export function getConfiguredUnitPrice(product: Product, sizeOption: SizeOption, frameOption: FrameOption) {
  return sizeOption.priceInCents + getFramePriceDelta(product, sizeOption, frameOption);
}

export function formatFramePriceDelta(product: Product, sizeOption: SizeOption, frameOption: FrameOption) {
  const framePriceDelta = getFramePriceDelta(product, sizeOption, frameOption);

  if (!framePriceDelta) {
    return '';
  }

  return `+${formatPrice(framePriceDelta)}`;
}

export function getDisplayArtworkShape(product: Pick<Product, 'aspectRatio' | 'artworkShape' | 'sizePreset'>) {
  const normalizedAspectRatio = getProductAspectRatio(product).replace(/\s/g, '');

  if (normalizedAspectRatio === '2/3' || normalizedAspectRatio === '3/4' || normalizedAspectRatio === '4/5') {
    return 'portrait';
  }

  if (normalizedAspectRatio === '1/1') {
    return 'square';
  }

  return 'landscape';
}

function getAspectRatioFromSizePreset(sizePreset?: string) {
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

export function getProductAspectRatio(product: Pick<Product, 'aspectRatio' | 'artworkShape' | 'sizePreset'>) {
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

export function getCartProductImage(product: Pick<Product, 'gallery' | 'image'>) {
  const sourceImage = product.gallery?.find((image) =>
    /(?:^|[/_-])source(?:[._-]|$)/i.test(image),
  );

  return sourceImage ?? product.image;
}

export function getProductGallery(product: Product) {
  return [product.image, ...(product.gallery ?? [])].filter(
    (image, index, gallery): image is string => Boolean(image) && gallery.indexOf(image) === index,
  );
}

export type ProductGalleryItem =
  | { type: 'placeholder'; key: 'placeholder' }
  | { type: 'image'; key: string; src: string; isPrimary: boolean }
  | { type: 'video'; key: string; video: ProductVideo };

export function getProductVideos(product: Pick<Product, 'videos'>) {
  const seenUrls = new Set<string>();

  return (product.videos ?? [])
    .map((video) => {
      const id = typeof video.id === 'string' ? video.id.trim() : undefined;
      const title = typeof video.title === 'string' ? video.title.trim() : undefined;
      const url = typeof video.url === 'string' ? video.url.trim() : '';
      const thumbnail = typeof video.thumbnail === 'string' ? video.thumbnail.trim() : undefined;

      return {
        ...(id ? { id } : {}),
        ...(title ? { title } : {}),
        url,
        ...(thumbnail ? { thumbnail } : {}),
      };
    })
    .filter((video) => {
      if (!video.url || seenUrls.has(video.url)) {
        return false;
      }

      seenUrls.add(video.url);
      return true;
    });
}

export function getProductMediaGallery(product: Product): ProductGalleryItem[] {
  const images = getProductGallery(product).map((src, index) => ({
    type: 'image' as const,
    key: `image-${index}-${src}`,
    src,
    isPrimary: src === product.image,
  }));
  const videos = getProductVideos(product).map((video, index) => ({
    type: 'video' as const,
    key: `video-${index}-${video.url}`,
    video,
  }));
  const media = [...images, ...videos];

  return media.length ? media : [{ type: 'placeholder', key: 'placeholder' }];
}

export function isProductMockupImage(product: Product, image: string | undefined) {
  if (!image) {
    return false;
  }

  return (
    image === product.image ||
    /\/0[12]-(main|side)\.(png|jpe?g|webp|avif)$/i.test(image)
  );
}

export function isSideMockupImage(image: string | undefined) {
  return /\/02-side\.(png|jpe?g|webp|avif)$/i.test(image ?? '');
}

export function getFramePreviewVariant(option: FrameOption) {
  const value = `${option.id} ${option.label}`.toLowerCase();

  if (value.includes('black')) {
    return 'black';
  }

  if (value.includes('white')) {
    return 'white';
  }

  return 'canvas';
}

export function getRelatedProducts(products: Product[], product: Product) {
  const collectionRelationshipWeights: Record<string, number> = {
    'best-sellers': 1,
    'new-arrivals': 1,
    'money-ambition': 4,
    'study-creative': 4,
    'discipline-focus': 4,
    music: 6,
  };

  return products
    .filter((candidate) => candidate.id !== product.id && candidate.published)
    .map((candidate) => {
      const sharedCollectionScore = candidate.collectionSlugs
        .filter((slug) => product.collectionSlugs.includes(slug))
        .reduce(
          (score, slug) => score + (collectionRelationshipWeights[slug] ?? 3),
          0,
        );
      const toneMatch = candidate.tone === product.tone ? 1 : 0;

      return {
        product: candidate,
        score: sharedCollectionScore + toneMatch,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title))
    .slice(0, 4)
    .map((item) => item.product);
}

function filterProductsForCollectionRules(products: Product[], collectionSlug: string) {
  if (collectionSlug !== 'new-arrivals') {
    return products;
  }

  return products.filter((product) => !product.collectionSlugs.includes('best-sellers'));
}

export function getProductsForCollection(products: Product[], collection: Collection) {
  const publishedProducts = products.filter((product) => product.published);

  if (collection.productIds) {
    const taggedProducts = filterProductsForCollectionRules(
      publishedProducts.filter((product) => productMatchesCollection(product, collection.slug)),
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
          productMatchesCollection(product, collection.slug),
      ),
      collection.slug,
    );
  }

  return filterProductsForCollectionRules(
    publishedProducts.filter((product) => productMatchesCollection(product, collection.slug)),
    collection.slug,
  );
}

export function getImageDimensions(src: string, aspectRatio = '1 / 1') {
  const embeddedSize = src.match(/-(\d+)x(\d+)\.(?:png|jpe?g|webp|avif)(?:\?|$)/i);

  if (embeddedSize) {
    return {
      width: Number(embeddedSize[1]),
      height: Number(embeddedSize[2]),
    };
  }

  const ratioParts = aspectRatio.split('/').map((part) => Number(part.trim()));
  const ratio = ratioParts.length === 2 && ratioParts[0] && ratioParts[1]
    ? ratioParts[0] / ratioParts[1]
    : 1;
  const width = 1600;

  return {
    width,
    height: Math.round(width / ratio),
  };
}
