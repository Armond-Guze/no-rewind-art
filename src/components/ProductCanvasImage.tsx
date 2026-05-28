import { useEffect, useState, type ReactNode } from 'react';

const failedCanvasImages = new Set<string>();

export type ProductCanvasImageProps = {
  src?: string;
  alt: string;
  aspectRatio?: string;
  shape?: 'landscape' | 'portrait' | 'square';
  className?: string;
  loading?: 'eager' | 'lazy';
  shadow?: boolean;
  fallback?: ReactNode;
};

export function ProductCanvasImage({
  src,
  alt,
  aspectRatio = '1 / 1',
  shape,
  className,
  loading = 'lazy',
  shadow = true,
  fallback,
}: ProductCanvasImageProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const imageFailed = Boolean(src && (failedCanvasImages.has(src) || failedImageSrc === src));
  const classNames = [
    'product-canvas-image',
    shape ? `shape-${shape}` : undefined,
    shadow ? 'has-canvas-shadow' : 'no-canvas-shadow',
    className,
  ].filter(Boolean).join(' ');
  const surfaceClassName = [
    'relative h-full w-full overflow-hidden rounded-sm bg-neutral-100',
    shadow ? 'shadow-[0_28px_45px_rgba(0,0,0,0.42)]' : 'shadow-none',
  ].join(' ');

  useEffect(() => {
    if (!src) {
      return;
    }

    let active = true;

    if (failedCanvasImages.has(src)) {
      const knownFailureId = window.setTimeout(() => {
        if (active) {
          setFailedImageSrc(src);
        }
      }, 0);

      return () => {
        active = false;
        window.clearTimeout(knownFailureId);
      };
    }

    const probeImage = new Image();

    probeImage.onload = () => {
      if (active && probeImage.naturalWidth === 0) {
        failedCanvasImages.add(src);
        setFailedImageSrc(src);
      }
    };

    probeImage.onerror = () => {
      if (active) {
        failedCanvasImages.add(src);
        setFailedImageSrc(src);
      }
    };

    probeImage.src = src;
    const failureCheckId = window.setTimeout(() => {
      if (active && probeImage.complete && probeImage.naturalWidth === 0) {
        failedCanvasImages.add(src);
        setFailedImageSrc(src);
      }
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(failureCheckId);
    };
  }, [src]);

  return (
    <div className={classNames} style={{ aspectRatio }}>
      {shadow ? <span className="product-canvas-shadow" aria-hidden="true" /> : null}
      <div className={surfaceClassName}>
        {src && !imageFailed ? (
          <img
            className="h-full w-full select-none object-cover object-center"
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            onError={() => {
              failedCanvasImages.add(src);
              setFailedImageSrc(src);
            }}
          />
        ) : (
          fallback
        )}
      </div>
    </div>
  );
}
