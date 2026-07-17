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
  loading?: 'eager' | 'lazy';
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
  loading,
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  loading?: 'eager' | 'lazy';
}) {
  const dimensions = getImageDimensions(src, aspectRatio);
  const imageLoader = getImageLoader(src);
  const imageLoading = loading ?? (priority ? 'eager' : undefined);

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
  loading,
  priority = false,
  shadow = true,
  sizes = '(max-width: 760px) 92vw, 760px',
}: OptimizedArtworkProps) {
  if (!src) {
    return <ProductVisual product={product} />;
  }

  // v2 baked-mockup rendering: the image files now contain the real canvas
  // presentation (soft shadow, lit fold edges, side bezel, framed variants).
  // Render the full square uncropped and let the file do the work — no CSS
  // shadows, no edge-to-edge crops, no frame fakes. Legacy rules stay inert
  // because none of the crop-square-source-* / ratio-* / has-canvas-shadow /
  // frame-* classes are emitted anymore.
  void aspectRatio;
  void shadow;
  const displayShape = shape;
  const dimensions = getImageDimensions(src, '1 / 1');
  const squareSide = Math.min(dimensions.width, dimensions.height);
  const imageLoader = getImageLoader(src);
  const imageLoading = loading ?? (priority ? 'eager' : undefined);
  const classNames = [
    'product-canvas-image',
    'v2-canvas',
    `shape-${displayShape}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} style={{ aspectRatio: '1 / 1' }}>
      <Image
        className="h-full w-full select-none object-contain object-center"
        loader={imageLoader}
        src={src}
        alt={alt}
        width={squareSide}
        height={squareSide}
        preload={priority}
        loading={imageLoading}
        sizes={sizes}
      />
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
        sizes={sizes}
      />
    );
  }

  return <ProductVisual product={product} />;
}
