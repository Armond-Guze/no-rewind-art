import Image, { type ImageLoaderProps } from 'next/image';
import type { Product, ProductGalleryImage } from '../../data/products';
import {
  getCartProductImage,
  getDisplayArtworkShape,
  getImageDimensions,
  getProductAspectRatio,
  getProductGallery,
} from './product-utils';

function isSanityImageUrl(src: string) {
  return /^https:\/\/cdn\.sanity\.io\//i.test(src);
}

function getSanityCropRect(image: ProductGalleryImage | undefined) {
  const sourceWidth = Number(image?.width);
  const sourceHeight = Number(image?.height);
  const crop = image?.crop;

  if (!sourceWidth || !sourceHeight || !crop) {
    return undefined;
  }

  const left = Math.round(sourceWidth * crop.left);
  const top = Math.round(sourceHeight * crop.top);
  const width = Math.max(1, Math.round(sourceWidth * (1 - crop.left - crop.right)));
  const height = Math.max(1, Math.round(sourceHeight * (1 - crop.top - crop.bottom)));

  if (left === 0 && top === 0 && width === sourceWidth && height === sourceHeight) {
    return undefined;
  }

  return `${left},${top},${width},${height}`;
}

function sanityImageLoader(
  { src, width, quality }: ImageLoaderProps,
  image?: ProductGalleryImage,
) {
  const url = new URL(src);
  const cropRect = getSanityCropRect(image);

  if (cropRect) {
    url.searchParams.set('rect', cropRect);
  }

  url.searchParams.set('auto', 'format');
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality ?? 82));
  return url.toString();
}

function getImageLoader(src: string, image?: ProductGalleryImage) {
  return isSanityImageUrl(src)
    ? (loaderProps: ImageLoaderProps) => sanityImageLoader(loaderProps, image)
    : undefined;
}

function getSanityImageDimensions(
  src: string,
  aspectRatio: string,
  image?: ProductGalleryImage,
) {
  const metadataDimensions = getMetadataImageDimensions(image);

  if (!metadataDimensions) {
    return getImageDimensions(src, aspectRatio);
  }

  return metadataDimensions;
}

function getSanityHotspotPosition(image?: ProductGalleryImage) {
  const hotspot = image?.hotspot;

  if (!hotspot) {
    return undefined;
  }

  const crop = image.crop;
  const visibleWidth = 1 - (crop?.left || 0) - (crop?.right || 0);
  const visibleHeight = 1 - (crop?.top || 0) - (crop?.bottom || 0);
  const relativeX = visibleWidth > 0 ? (hotspot.x - (crop?.left || 0)) / visibleWidth : 0.5;
  const relativeY = visibleHeight > 0 ? (hotspot.y - (crop?.top || 0)) / visibleHeight : 0.5;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  return `${clamp(relativeX) * 100}% ${clamp(relativeY) * 100}%`;
}

type OptimizedArtworkProps = {
  product: Product;
  src?: string;
  alt?: string;
  aspectRatio?: string;
  shape?: 'landscape' | 'portrait' | 'square';
  className?: string;
  loading?: 'eager' | 'lazy';
  priority?: boolean;
  shadow?: boolean;
  sizes?: string;
  sanityImage?: ProductGalleryImage;
};

export function ProductVisual({ product, useImage = false }: { product: Product; useImage?: boolean }) {
  const displayShape = getDisplayArtworkShape(product);

  return (
    <div className={`product-art ${product.tone}-art shape-${displayShape}`}>
      {product.image && useImage ? (
        <OptimizedRawImage
          src={product.image}
          alt={product.imageAlt}
          aspectRatio={getProductAspectRatio(product)}
          sanityImage={product.mainImage}
          sizes="(max-width: 760px) 88vw, 720px"
        />
      ) : (
        <span>{product.label}</span>
      )}
    </div>
  );
}

export function OptimizedRawImage({
  src,
  alt,
  aspectRatio = '1 / 1',
  className,
  priority = false,
  sizes = '(max-width: 760px) 92vw, 860px',
  fill = false,
  loading,
  sanityImage,
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  loading?: 'eager' | 'lazy';
  sanityImage?: ProductGalleryImage;
}) {
  const dimensions = getSanityImageDimensions(src, aspectRatio, sanityImage);
  const imageLoader = getImageLoader(src, sanityImage);
  const imageLoading = priority ? undefined : loading;
  const objectPosition = getSanityHotspotPosition(sanityImage);

  if (fill) {
    return (
      <Image
        className={className}
        loader={imageLoader}
        src={src}
        alt={alt}
        fill
        preload={priority}
        loading={imageLoading}
        sizes={sizes}
        style={objectPosition ? { objectPosition } : undefined}
      />
    );
  }

  return (
    <Image
      className={className}
      loader={imageLoader}
      src={src}
      alt={alt}
      width={dimensions.width}
      height={dimensions.height}
      preload={priority}
      loading={imageLoading}
      sizes={sizes}
      style={objectPosition ? { objectPosition } : undefined}
    />
  );
}

function getEmbeddedImageSize(src: string) {
  const embeddedSize = src.match(/-(\d+)x(\d+)\.(?:png|jpe?g|webp|avif)(?:\?|$)/i);

  if (!embeddedSize) {
    return null;
  }

  const width = Number(embeddedSize[1]);
  const height = Number(embeddedSize[2]);

  if (!width || !height) {
    return null;
  }

  return { width, height };
}

function getMetadataImageDimensions(image?: ProductGalleryImage) {
  const sourceWidth = Number(image?.width);
  const sourceHeight = Number(image?.height);

  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const crop = image?.crop;

  return {
    width: Math.max(1, Math.round(sourceWidth * (1 - (crop?.left || 0) - (crop?.right || 0)))),
    height: Math.max(1, Math.round(sourceHeight * (1 - (crop?.top || 0) - (crop?.bottom || 0)))),
  };
}

function getRatioValue(aspectRatio: string) {
  const ratioParts = aspectRatio.split('/').map((part) => Number(part.trim()));
  return ratioParts.length === 2 && ratioParts[0] && ratioParts[1]
    ? ratioParts[0] / ratioParts[1]
    : null;
}

function isSquareSourceImage(src: string, image?: ProductGalleryImage) {
  const sourceDimensions = getMetadataImageDimensions(image) || getEmbeddedImageSize(src);

  if (!sourceDimensions) {
    return false;
  }

  const { width, height } = sourceDimensions;
  return Math.abs(width - height) / Math.max(width, height) < 0.04;
}

function isSourceRatioMismatch(
  src: string,
  aspectRatio: string,
  image?: ProductGalleryImage,
) {
  const sourceDimensions = getMetadataImageDimensions(image) || getEmbeddedImageSize(src);
  const targetRatio = getRatioValue(aspectRatio);

  if (!sourceDimensions || !targetRatio || isSquareSourceImage(src, image)) {
    return false;
  }

  const sourceRatio = sourceDimensions.width / sourceDimensions.height;
  return Math.abs(sourceRatio - targetRatio) / targetRatio > 0.04;
}

export function OptimizedCanvasImage({
  product,
  src = product.image,
  alt = product.imageAlt,
  aspectRatio = getProductAspectRatio(product),
  shape = getDisplayArtworkShape(product),
  className,
  loading,
  priority = false,
  shadow = true,
  sizes = '(max-width: 760px) 92vw, 760px',
  sanityImage,
}: OptimizedArtworkProps) {
  if (!src) {
    return <ProductVisual product={product} />;
  }

  const normalizedAspectRatio = aspectRatio.replace(/\s/g, '');
  const ratioClassName = `ratio-${normalizedAspectRatio.replace('/', 'x')}`;
  const displayShape =
    normalizedAspectRatio === '2/3' || normalizedAspectRatio === '3/4' || normalizedAspectRatio === '4/5'
      ? 'portrait'
      : normalizedAspectRatio === '1/1'
        ? 'square'
        : shape;
  const hasSquareSource = isSquareSourceImage(src, sanityImage);
  const usesSquareSourceWideCrop = hasSquareSource && displayShape === 'landscape' && normalizedAspectRatio === '2/1';
  const usesSquareSourceFourThreeCrop = hasSquareSource && displayShape === 'landscape' && normalizedAspectRatio === '4/3';
  const usesSquareSourcePortraitCrop = hasSquareSource && displayShape === 'portrait' && normalizedAspectRatio === '2/3';
  const usesSquareSourceThreeFourCrop = hasSquareSource && displayShape === 'portrait' && normalizedAspectRatio === '3/4';
  const usesSquareSourceLandscapeCrop = hasSquareSource && displayShape === 'landscape' && normalizedAspectRatio === '3/2';
  const usesSourceRatioMismatch = isSourceRatioMismatch(src, aspectRatio, sanityImage);
  const imageFitClassName = usesSourceRatioMismatch ? 'object-contain' : 'object-cover';
  const classNames = [
    'product-canvas-image',
    `shape-${displayShape}`,
    ratioClassName,
    usesSquareSourceWideCrop ? 'crop-square-source-2x1' : undefined,
    usesSquareSourceFourThreeCrop ? 'crop-square-source-4x3' : undefined,
    usesSquareSourcePortraitCrop ? 'crop-square-source-2x3' : undefined,
    usesSquareSourceThreeFourCrop ? 'crop-square-source-3x4' : undefined,
    usesSquareSourceLandscapeCrop ? 'crop-square-source-3x2' : undefined,
    usesSourceRatioMismatch ? 'source-ratio-mismatch' : undefined,
    shadow ? 'has-canvas-shadow' : 'no-canvas-shadow',
    className,
  ].filter(Boolean).join(' ');
  const surfaceClassName = [
    'relative h-full w-full overflow-hidden rounded-sm bg-neutral-100',
    shadow ? 'shadow-[0_28px_45px_rgba(0,0,0,0.42)]' : 'shadow-none',
  ].join(' ');
  const dimensions = getSanityImageDimensions(src, aspectRatio, sanityImage);
  const imageLoader = getImageLoader(src, sanityImage);
  const imageLoading = priority ? undefined : loading;
  const objectPosition = getSanityHotspotPosition(sanityImage);

  return (
    <div className={classNames} style={{ aspectRatio }}>
      {shadow ? <span className="product-canvas-shadow" aria-hidden="true" /> : null}
      <div className={surfaceClassName}>
        <Image
          className={`h-full w-full select-none ${imageFitClassName} object-center`}
          loader={imageLoader}
          src={src}
          alt={alt}
          width={dimensions.width}
          height={dimensions.height}
          preload={priority}
          loading={imageLoading}
          sizes={sizes}
          style={objectPosition ? { objectPosition } : undefined}
        />
      </div>
    </div>
  );
}

export function ProductImage({
  product,
  src,
  aspectRatio,
  className,
  priority = false,
  loading,
  sizes = '(max-width: 760px) 90vw, (max-width: 1200px) 48vw, 760px',
}: {
  product: Product;
  src?: string;
  aspectRatio?: string;
  className?: string;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  sizes?: string;
}) {
  const imageSrc = src ?? product.image;

  if (imageSrc) {
    return (
      <OptimizedCanvasImage
        product={product}
        src={imageSrc}
        aspectRatio={aspectRatio}
        className={className}
        loading={loading}
        priority={priority}
        sanityImage={imageSrc === product.image ? product.mainImage : undefined}
        sizes={sizes}
      />
    );
  }

  return <ProductVisual product={product} />;
}

// Small cart previews use the source image itself. Canvas mockup geometry and
// decorative edges belong to larger product displays, not fixed thumbnail boxes.
export function ProductThumbnail({ product, sizes = '96px' }: { product: Product; sizes?: string }) {
  const src = getCartProductImage(product);
  if (!src) return <span>{product.title}</span>;

  return (
    <OptimizedRawImage
      src={src}
      alt={`${product.title} canvas print`}
      sanityImage={getProductGallery(product).find((image) => image.url === src)}
      className="cart-product-thumbnail"
      sizes={sizes}
      fill
    />
  );
}
