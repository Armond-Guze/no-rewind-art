import Image from 'next/image';
import type { Product } from '../../data/products';
import {
  getDisplayArtworkShape,
  getImageDimensions,
  getProductAspectRatio,
} from './product-utils';

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

  if (fill) {
    return (
      <Image
        className={className}
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
  const usesSquareSourcePortraitCrop = displayShape === 'portrait' && normalizedAspectRatio === '2/3';
  const usesSquareSourceLandscapeCrop = displayShape === 'landscape' && normalizedAspectRatio === '3/2';
  const classNames = [
    'product-canvas-image',
    `shape-${displayShape}`,
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

  return (
    <div className={classNames} style={{ aspectRatio }}>
      {shadow ? <span className="product-canvas-shadow" aria-hidden="true" /> : null}
      <div className={surfaceClassName}>
        <Image
          className="h-full w-full select-none object-cover object-center"
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
