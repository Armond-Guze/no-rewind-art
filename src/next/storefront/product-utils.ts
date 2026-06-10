import type { Collection, FrameOption, Product, SizeOption } from '../../data/products';

export const supportEmail = 'hello@armoze.com';
export const supportMailto = `mailto:${supportEmail}`;
export const launchOfferCode = 'FIRST10';

export function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
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

export function getProductGallery(product: Product) {
  return [product.image, ...(product.gallery ?? [])].filter(
    (image, index, gallery): image is string => Boolean(image) && gallery.indexOf(image) === index,
  );
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
  return products
    .filter((candidate) => candidate.id !== product.id && candidate.published)
    .map((candidate) => {
      const sharedCollections = candidate.collectionSlugs.filter((slug) =>
        product.collectionSlugs.includes(slug),
      ).length;
      const toneMatch = candidate.tone === product.tone ? 1 : 0;

      return {
        product: candidate,
        score: sharedCollections * 2 + toneMatch,
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
