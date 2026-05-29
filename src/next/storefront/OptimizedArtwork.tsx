import Image, { type ImageLoaderProps } from 'next/image';
import type { Product } from '../../data/products';
import {
  getDisplayArtworkShape,
  getImageDimensions,
  getProductAspectRatio,
} from './product-utils';

function isSanityImageUrl(src: string) {
  return /^https:\/\/cdn\.sanity\.io\//i.test(src);
}

function sanityImageLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  url.searchParams.set('auto', 'format');
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality ?? 82));
  return url.toString();
}

function getImageLoader(src: string) {
  return isSanityImageUrl(src) ? sanityImageLoader : undefined;
}

type OptimizedArtworkProps = {
  product: Product;
  src?: string;
  alt?: string;
  aspectRatio?: string;
  shape?: 'landscape' | 'portrait' | 'square';
  className?: string;
  priority?: boolean;
  shadow?: boolean;
  sizes?: string;
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
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
}) {
  const dimensions = getImageDimensions(src, aspectRatio);
  const imageLoader = getImageLoader(src);

  if (fill) {
    return (
      <Image
        className={className}
        loader={imageLoader}
        src={src}
        alt={alt}
        fill
        preload={priority}
        loading={priority ? 'eager' : undefined}
        sizes={sizes}
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
      loading={priority ? 'eager' : undefined}
      sizes={sizes}
    />
  );
}

function isSquareSourceImage(src: string) {
  const embeddedSize = src.match(/-(\d+)x(\d+)\.(?:png|jpe?g|webp|avif)(?:\?|$)/i);

  if (!embeddedSize) {
    return false;
  }

  const width = Number(embeddedSize[1]);
  const height = Number(embeddedSize[2]);

  if (!width || !height) {
    return false;
  }

  return Math.abs(width - height) / Math.max(width, height) < 0.04;
}

export function OptimizedCanvasImage({
  product,
  src = product.image,
  alt = product.imageAlt,
  aspectRatio = getProductAspectRatio(product),
  shape = getDisplayArtworkShape(product),
  className,
  priority = false,
  shadow = true,
  sizes = '(max-width: 760px) 92vw, 760px',
}: OptimizedArtworkProps) {
  if (!src) {
    return <ProductVisual product={product} />;
  }

  const normalizedAspectRatio = aspectRatio.replace(/\s/g, '');
  const displayShape =
    normalizedAspectRatio === '2/3'
      ? 'portrait'
      : normalizedAspectRatio === '1/1'
        ? 'square'
        : shape;
  const hasSquareSource = isSquareSourceImage(src);
  const usesSquareSourceWideCrop = hasSquareSource && displayShape === 'landscape' && normalizedAspectRatio === '2/1';
  const usesSquareSourcePortraitCrop = hasSquareSource && displayShape === 'portrait' && normalizedAspectRatio === '2/3';
  const usesSquareSourceLandscapeCrop = hasSquareSource && displayShape === 'landscape' && normalizedAspectRatio === '3/2';
  const classNames = [
    'product-canvas-image',
    `shape-${displayShape}`,
    usesSquareSourceWideCrop ? 'crop-square-source-2x1' : undefined,
    usesSquareSourcePortraitCrop ? 'crop-square-source-2x3' : undefined,
    usesSquareSourceLandscapeCrop ? 'crop-square-source-3x2' : undefined,
    shadow ? 'has-canvas-shadow' : 'no-canvas-shadow',
    className,
  ].filter(Boolean).join(' ');
  const surfaceClassName = [
    'relative h-full w-full overflow-hidden rounded-sm bg-neutral-100',
    shadow ? 'shadow-[0_28px_45px_rgba(0,0,0,0.42)]' : 'shadow-none',
  ].join(' ');
  const dimensions = getImageDimensions(src, aspectRatio);
  const imageLoader = getImageLoader(src);

  return (
    <div className={classNames} style={{ aspectRatio }}>
      {shadow ? <span className="product-canvas-shadow" aria-hidden="true" /> : null}
      <div className={surfaceClassName}>
        <Image
          className="h-full w-full select-none object-cover object-center"
          loader={imageLoader}
          src={src}
          alt={alt}
          width={dimensions.width}
          height={dimensions.height}
          preload={priority}
          loading={priority ? 'eager' : undefined}
          sizes={sizes}
        />
      </div>
    </div>
  );
}

export function ProductImage({ product, priority = false }: { product: Product; priority?: boolean }) {
  if (product.image) {
    return (
      <OptimizedCanvasImage
        product={product}
        priority={priority}
        sizes="(max-width: 760px) 90vw, (max-width: 1200px) 48vw, 760px"
      />
    );
  }

  return <ProductVisual product={product} />;
}
