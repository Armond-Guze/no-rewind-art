'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FaArrowRotateLeft,
  FaCalendarDays,
  FaHammer,
  FaImage,
  FaPaintbrush,
  FaShield,
  FaTruckFast,
} from 'react-icons/fa6';
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Ruler,
  ShieldCheck,
  Star,
  StarHalf,
  Truck,
  X,
} from 'lucide-react';
import { addStoredCartItem } from '../../cart';
import { etsyReviewHighlights } from '../../data/reviews';
import type { FrameOption, Product, ProductVideo, SizeOption } from '../../data/products';
import { supabaseClient } from '../../lib/supabase';
import {
  createCheckoutRequestId,
  formatPrice,
  getAvailableFrameOptions,
  getBaseFrameOption,
  getConfiguredUnitPrice,
  getDisplayArtworkShape,
  getFeaturedSizeOption,
  getFramePreviewVariant,
  getProductAspectRatio,
  getProductMediaGallery,
  hasProductSpecificReviewSummary,
  isProductMockupImage,
  isSideMockupImage,
  sizeOptionMatches,
} from './product-utils';
import { CheckoutPolicyNotice } from './CheckoutPolicyNotice';
import {
  getProductTrackingItem,
  initStorefrontTracking,
  trackStorefrontEvent,
} from './analytics';
import { getCheckoutAttribution } from './attribution';
import { getNewsletterDiscountCode } from './discount';
import {
  OptimizedCanvasImage,
  OptimizedRawImage,
  ProductImage,
  ProductVisual,
} from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { useUrlSearchParam } from './url-search';

function addBusinessDays(start: Date, businessDays: number) {
  const next = new Date(start);
  let added = 0;

  while (added < businessDays) {
    next.setDate(next.getDate() + 1);
    const day = next.getDay();

    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return next;
}

function getDeliveryEstimate() {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const now = new Date();

  return `${formatter.format(addBusinessDays(now, 5))} – ${formatter.format(addBusinessDays(now, 8))}`;
}

const framePreviewImages: Record<string, string> = {
  canvas: '/product-support/frame-option-canvas.jpg',
  black: '/product-support/frame-option-black.jpg',
  white: '/product-support/frame-option-white.jpg',
};

const desktopMainProductGalleryImageSizes =
  '(max-width: 760px) 92vw, (max-width: 1900px) 1020px, 1120px';
const desktopSecondaryProductGalleryImageSizes =
  '(max-width: 760px) 92vw, (max-width: 1900px) 860px, 920px';

function FrameOptionPreview({ option }: { option: FrameOption }) {
  const variant = getFramePreviewVariant(option);
  const previewImage = framePreviewImages[variant] ?? framePreviewImages.canvas;

  return (
    <span
      className={`frame-option-preview ${variant} has-image`}
      aria-hidden="true"
    >
      <Image
        className="frame-option-preview-image"
        src={previewImage}
        alt=""
        width={420}
        height={420}
        sizes="76px"
      />
    </span>
  );
}

function ProductTrustStrip() {
  return (
    <div className="product-trust-strip" aria-label="Purchase confidence">
      <span>
        <Check aria-hidden="true" size={14} />
        Free U.S. shipping
      </span>
      <span>
        <Check aria-hidden="true" size={14} />
        Returns accepted
      </span>
      <span>
        <Check aria-hidden="true" size={14} />
        Damage support
      </span>
    </div>
  );
}

function getSizeDimensions(sizeOption: Pick<SizeOption, 'id' | 'label'>) {
  const match = `${sizeOption.label} ${sizeOption.id}`.match(
    /(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)/i,
  );

  return {
    width: Number(match?.[1] || 24),
    height: Number(match?.[2] || 16),
  };
}

function getSizeGuideRecommendation(width: number, height: number) {
  if (height > width) {
    if (height <= 18) {
      return 'Compact gallery walls and shelf styling.';
    }

    if (height <= 24) {
      return 'Narrow walls, desks, and reading corners.';
    }

    if (height <= 36) {
      return 'Entryways, offices, and bedroom walls.';
    }

    if (height <= 48) {
      return 'A tall focal point for open wall sections.';
    }

    return 'Statement scale for tall, open walls.';
  }

  if (width <= 24) {
    return 'Best for shelves, narrow walls, and compact desk setups.';
  }

  if (width <= 40) {
    return 'A balanced choice above desks, dressers, and reading areas.';
  }

  if (width <= 50) {
    return 'A strong focal point above a sofa, bed, or wide workstation.';
  }

  return 'Statement scale for large walls, offices, and open rooms.';
}

const SIZE_GUIDE_SOFA_WIDTH_INCHES = 72;
const SIZE_GUIDE_SOFA_WIDTH_PERCENT = 57;
const SIZE_GUIDE_DOOR_HEIGHT_INCHES = 80;
const SIZE_GUIDE_OPTION_MAX_EDGE_PX = 48;
const SIZE_GUIDE_LANDSCAPE_MAX_WIDTH_PERCENT = 88;
const SIZE_GUIDE_LANDSCAPE_MAX_HEIGHT_PERCENT = 54;
const SIZE_GUIDE_PORTRAIT_MAX_HEIGHT_PERCENT = 72;

type SizeGuideImageCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function getEmbeddedSizeFromImageUrl(src: string) {
  const match = src.match(/-(\d+)x(\d+)\.(?:png|jpe?g|webp|avif)(?:[?#]|$)/i);

  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  return width && height ? { width, height } : null;
}

function normalizeImageUrlForMatching(src: string) {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

function getSizeGuideSourceRatio(src: string) {
  const embeddedSize = getEmbeddedSizeFromImageUrl(src);

  if (embeddedSize) {
    return embeddedSize.width / embeddedSize.height;
  }

  if (/\/reminder life has no rewind\/reminder life has no rewind main-1\.png/i.test(normalizeImageUrlForMatching(src))) {
    return 1;
  }

  return null;
}

function getSizeGuideImageCrop(src: string | undefined, targetRatio: number): SizeGuideImageCrop | null {
  if (!src || !targetRatio) {
    return null;
  }

  const sourceRatio = getSizeGuideSourceRatio(src);

  if (!sourceRatio) {
    return null;
  }

  const isSquareSource = Math.abs(sourceRatio - 1) < 0.04;
  const ratioDelta = Math.abs(sourceRatio - targetRatio) / targetRatio;

  if (!isSquareSource || ratioDelta < 0.18) {
    return null;
  }

  if (targetRatio > sourceRatio) {
    const width = 0.9;
    const height = Math.min(0.9, (width * sourceRatio) / targetRatio);

    return {
      left: (1 - width) / 2,
      top: (1 - height) / 2,
      width,
      height,
    };
  }

  const height = 0.9;
  const width = Math.min(0.9, (targetRatio * height) / sourceRatio);

  return {
    left: (1 - width) / 2,
    top: (1 - height) / 2,
    width,
    height,
  };
}

function ProductSizeGuide({
  frameOption,
  onClose,
  onSelect,
  product,
  selectedOption,
}: {
  frameOption: FrameOption;
  onClose: () => void;
  onSelect: (sizeId: string) => void;
  product: Product;
  selectedOption: SizeOption;
}) {
  const { width, height } = getSizeDimensions(selectedOption);
  const isPortrait = height > width;
  const imageCrop = getSizeGuideImageCrop(product.image, width / height);
  const rawPreviewWidth = (width / SIZE_GUIDE_SOFA_WIDTH_INCHES) * SIZE_GUIDE_SOFA_WIDTH_PERCENT;
  const rawPreviewHeight = rawPreviewWidth * (height / width) * 1.5;
  const landscapeFitScale = Math.min(
    1,
    SIZE_GUIDE_LANDSCAPE_MAX_WIDTH_PERCENT / rawPreviewWidth,
    SIZE_GUIDE_LANDSCAPE_MAX_HEIGHT_PERCENT / rawPreviewHeight,
  );
  const rawPortraitPreviewHeight = (height / SIZE_GUIDE_DOOR_HEIGHT_INCHES) * 72;
  const portraitFitScale = Math.min(
    1,
    SIZE_GUIDE_PORTRAIT_MAX_HEIGHT_PERCENT / rawPortraitPreviewHeight,
  );
  const previewWidth = rawPreviewWidth * landscapeFitScale;
  const portraitPreviewHeight = rawPortraitPreviewHeight * portraitFitScale;
  const previewIsFitted = isPortrait ? portraitFitScale < 1 : landscapeFitScale < 1;
  const selectedReferenceRatio = Math.round(
    isPortrait
      ? (height / SIZE_GUIDE_DOOR_HEIGHT_INCHES) * 100
      : (width / SIZE_GUIDE_SOFA_WIDTH_INCHES) * 100,
  );
  const largestOptionEdge = Math.max(
    1,
    ...product.sizeOptions.map((option) => {
      const dimensions = getSizeDimensions(option);
      return Math.max(dimensions.width, dimensions.height);
    }),
  );
  const optionPreviewPixelsPerInch = SIZE_GUIDE_OPTION_MAX_EDGE_PX / largestOptionEdge;
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previewStyle = {
    '--size-guide-canvas-width': `${previewWidth}%`,
    '--size-guide-canvas-height': `${portraitPreviewHeight}%`,
    ...(imageCrop
      ? {
          '--size-guide-crop-display-left': `${(-100 * imageCrop.left) / imageCrop.width}%`,
          '--size-guide-crop-display-top': `${(-100 * imageCrop.top) / imageCrop.height}%`,
          '--size-guide-crop-display-width': `${100 / imageCrop.width}%`,
          '--size-guide-crop-display-height': `${100 / imageCrop.height}%`,
        }
      : {}),
    aspectRatio: `${width} / ${height}`,
  } as CSSProperties;
  const frameVariant =
    frameOption.id === 'black-frame'
      ? 'black'
      : frameOption.id === 'white-frame'
        ? 'white'
        : 'canvas';
  const frameClassName = [
    'size-guide-canvas-frame',
    frameVariant,
    imageCrop ? 'has-image-crop' : undefined,
  ].filter(Boolean).join(' ');
  const wallSceneClassName = `size-guide-wall-scene${isPortrait ? ' is-portrait' : ''}`;

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    closeButtonRef.current?.focus();

    return () => previouslyFocusedElement?.focus();
  }, []);

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);

    if (!focusableElements.length) {
      return;
    }

    const activeIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const lastIndex = focusableElements.length - 1;

    if (activeIndex === -1 || (!event.shiftKey && activeIndex === lastIndex)) {
      event.preventDefault();
      focusableElements[0].focus();
    } else if (event.shiftKey && activeIndex === 0) {
      event.preventDefault();
      focusableElements[lastIndex].focus();
    }
  }

  return (
    <div className="size-guide-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="size-guide-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        onKeyDown={handleDialogKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="size-guide-header">
          <div>
            <p className="eyebrow">Wall preview</p>
            <h2 id="size-guide-title">Choose the right scale.</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close size guide">
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="size-guide-layout">
          <div className="size-guide-preview-column">
            <div
              className={wallSceneClassName}
              aria-label={
                isPortrait
                  ? `${selectedOption.label} canvas beside a standard 80 inch doorway`
                  : `${selectedOption.label} canvas above a 72 inch sofa`
              }
            >
              {!isPortrait ? (
                <span className="size-guide-scene-label" aria-hidden="true">
                  <Ruler size={13} />
                  {previewIsFitted ? 'Fit to view' : 'Shown to scale'}
                </span>
              ) : null}
              <div className={frameClassName} style={previewStyle}>
                {product.image ? (
                  <OptimizedRawImage
                    className="size-guide-canvas-art"
                    src={product.image}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 72vw, 620px"
                  />
                ) : (
                  <span>{product.label}</span>
                )}
              </div>
              {isPortrait ? (
                <div className="size-guide-door-reference" aria-hidden="true">
                  <span className="size-guide-door"><i /></span>
                  <span className="size-guide-door-measure"><i>80 in</i></span>
                </div>
              ) : (
                <div className="size-guide-sofa-measure" aria-hidden="true">
                  <span /><b>72 in sofa</b><span />
                </div>
              )}
            </div>
            <div className="size-guide-current-size">
              <div className="size-guide-current-heading">
                <span>Selected canvas</span>
                <strong>{selectedOption.label} in</strong>
              </div>
              <div className="size-guide-proportion">
                <strong>{selectedReferenceRatio}%</strong>
                <span>{isPortrait ? 'of door height' : 'of sofa width'}</span>
              </div>
              <p>{getSizeGuideRecommendation(width, height)}</p>
            </div>
          </div>

          <div className="size-guide-options-column">
            <p>Compare sizes</p>
            <div className="size-guide-option-list" role="list">
              {product.sizeOptions.map((option) => {
                const dimensions = getSizeDimensions(option);
                const isSelected = option.id === selectedOption.id;
                const optionIsPortrait = dimensions.height > dimensions.width;
                const optionReferenceRatio = Math.round(
                  optionIsPortrait
                    ? (dimensions.height / SIZE_GUIDE_DOOR_HEIGHT_INCHES) * 100
                    : (dimensions.width / SIZE_GUIDE_SOFA_WIDTH_INCHES) * 100,
                );
                const optionFrame =
                  getAvailableFrameOptions(product, option).find(
                    (candidate) => candidate.id === frameOption.id,
                  ) ?? getBaseFrameOption(product);

                return (
                  <button
                    className={isSelected ? 'selected' : ''}
                    key={option.id}
                    type="button"
                    onClick={() => onSelect(option.id)}
                    aria-pressed={isSelected}
                  >
                    <span
                      className="size-guide-option-shape"
                      style={{
                        width: `${dimensions.width * optionPreviewPixelsPerInch}px`,
                        height: `${dimensions.height * optionPreviewPixelsPerInch}px`,
                      }}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{option.label} in</strong>
                      <small>{getSizeGuideRecommendation(dimensions.width, dimensions.height)}</small>
                      <em>
                        {optionReferenceRatio}% of {optionIsPortrait ? 'door height' : 'sofa width'}
                      </em>
                    </span>
                    <b>{formatPrice(getConfiguredUnitPrice(product, option, optionFrame))}</b>
                  </button>
                );
              })}
            </div>
            <button className="button button-primary size-guide-apply" type="button" onClick={onClose}>
              Select {selectedOption.label} in
            </button>
            <small className="size-guide-note">
              {previewIsFitted
                ? 'This oversize canvas is fitted within the room preview. Use the listed dimensions for exact scale.'
                : isPortrait
                ? 'Shown to scale with a standard 80 in doorway. Exact appearance varies by wall placement.'
                : 'Shown to scale with a 72 in sofa. Exact appearance varies by wall and furniture placement.'}
            </small>
          </div>
        </div>
      </section>
    </div>
  );
}

function StoreRating({ product }: { product: Product }) {
  const rating = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0);

  if (!hasProductSpecificReviewSummary(product)) {
    return null;
  }

  const clampedRating = Math.max(0, Math.min(rating, 5));
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating - fullStars >= 0.25 && clampedRating - fullStars < 0.75;
  const roundedFullStars = clampedRating - fullStars >= 0.75 ? Math.min(fullStars + 1, 5) : fullStars;

  return (
    <div
      className="store-rating"
      aria-label={`${product.title} rating: ${rating.toFixed(1)} out of 5 stars from ${reviewCount} reviews`}
    >
      <span className="store-rating-stars" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => {
          if (index < (hasHalfStar ? fullStars : roundedFullStars)) {
            return <Star fill="currentColor" key={index} size={17} strokeWidth={2.4} />;
          }

          if (hasHalfStar && index === fullStars) {
            return <StarHalf fill="currentColor" key={index} size={17} strokeWidth={2.4} />;
          }

          return <Star key={index} size={17} strokeWidth={2.4} />;
        })}
      </span>
      <span>{rating.toFixed(1)} stars</span>
      <span>{reviewCount} reviews</span>
    </div>
  );
}

function ProductVideoThumbnail({ video }: { video: ProductVideo }) {
  return (
    <span className="gallery-video-thumbnail">
      {video.thumbnail ? (
        <OptimizedRawImage src={video.thumbnail} alt="" fill sizes="82px" />
      ) : null}
      <span className="gallery-video-play">
        <Play aria-hidden="true" fill="currentColor" size={18} strokeWidth={2.4} />
      </span>
    </span>
  );
}

function ProductVideoPosterImage({ video }: { video: ProductVideo }) {
  return video.thumbnail ? (
    <OptimizedRawImage
      src={video.thumbnail}
      alt=""
      fill
      sizes="(max-width: 760px) 100vw, 760px"
    />
  ) : null;
}

function ProductVideoPlayer({
  active = true,
  title,
  video,
}: {
  active?: boolean;
  title: string;
  video: ProductVideo;
}) {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const shouldFocusVideoRef = useRef(false);
  const videoLabel = video.title || `${title} product video`;

  useEffect(() => {
    if (!active) {
      videoRef.current?.pause();
    }
  }, [active]);

  useEffect(() => {
    if (!shouldLoadVideo || videoLoadFailed) {
      return;
    }

    if (shouldFocusVideoRef.current && videoRef.current) {
      videoRef.current.focus({ preventScroll: true });
      shouldFocusVideoRef.current = false;
    }

    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const pauseVideo = () => videoRef.current?.pause();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseVideo();
      }
    };
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
            pauseVideo();
          }
        }, { threshold: [0, 0.25] })
      : null;

    observer?.observe(shell);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldLoadVideo, videoLoadFailed]);

  useEffect(() => {
    if (videoLoadFailed && active) {
      playButtonRef.current?.focus({ preventScroll: true });
    }
  }, [active, videoLoadFailed]);

  function loadVideo() {
    shouldFocusVideoRef.current = true;
    setIsVideoReady(false);
    setVideoLoadFailed(false);
    setShouldLoadVideo(true);
  }

  return (
    <div
      className="product-video-shell"
      ref={shellRef}
      aria-busy={shouldLoadVideo && !isVideoReady && !videoLoadFailed}
    >
      {!shouldLoadVideo || videoLoadFailed ? (
        <button
          className="product-video-poster"
          ref={playButtonRef}
          type="button"
          tabIndex={active ? 0 : -1}
          aria-label={`${videoLoadFailed ? 'Retry' : 'Play'} ${videoLabel}`}
          onClick={loadVideo}
        >
          <ProductVideoPosterImage video={video} />
          <span className="product-video-poster-play" aria-hidden="true">
            <Play fill="currentColor" size={34} strokeWidth={2.2} />
          </span>
          {videoLoadFailed ? (
            <span className="product-video-poster-error" role="status">
              Video unavailable
            </span>
          ) : null}
          <span className="product-video-poster-label">
            {videoLoadFailed ? 'Try video again' : 'Play video'}
          </span>
        </button>
      ) : (
        <>
          <video
            autoPlay={active}
            className={`product-video${isVideoReady ? '' : ' is-loading'}`}
            ref={videoRef}
            src={video.url}
            controls
            playsInline
            preload="metadata"
            tabIndex={active ? 0 : -1}
            aria-label={videoLabel}
            onCanPlay={() => setIsVideoReady(true)}
            onPlaying={() => setIsVideoReady(true)}
            onError={() => {
              setIsVideoReady(false);
              setVideoLoadFailed(true);
            }}
          />
          {!isVideoReady ? (
            <div className="product-video-loading" role="status">
              <ProductVideoPosterImage video={video} />
              <span className="product-video-loading-spinner" aria-hidden="true" />
              <span className="sr-only">Loading video</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

type RelatedProductsCarouselItem = {
  product: Product;
  key: string;
  clone: boolean;
  realStart: boolean;
};

function RelatedProductsCarousel({ products }: { products: Product[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const hasEdgePeek = products.length > 1;
  const carouselItems: RelatedProductsCarouselItem[] = hasEdgePeek
    ? [
        {
          product: products[products.length - 1],
          key: `leading-${products[products.length - 1].id}`,
          clone: true,
          realStart: false,
        },
        ...products.map((relatedProduct, index) => ({
          product: relatedProduct,
          key: `real-${index}-${relatedProduct.id}`,
          clone: false,
          realStart: index === 0,
        })),
        {
          product: products[0],
          key: `trailing-${products[0].id}`,
          clone: true,
          realStart: false,
        },
      ]
    : products.map((relatedProduct, index) => ({
        product: relatedProduct,
        key: `real-${index}-${relatedProduct.id}`,
        clone: false,
        realStart: index === 0,
      }));

  useEffect(() => {
    const carousel = carouselRef.current;

    if (
      !carousel ||
      !hasEdgePeek ||
      !window.matchMedia('(max-width: 900px)').matches
    ) {
      return;
    }

    const getLoopPositions = () => {
      const cards = Array.from(carousel.children) as HTMLElement[];
      const firstRealCard = carousel.querySelector<HTMLElement>('[data-carousel-real-start="true"]');
      const lastRealCard = cards[cards.length - 2];

      if (!firstRealCard || !lastRealCard) {
        return null;
      }

      const styles = window.getComputedStyle(carousel);
      const peek = Number.parseFloat(styles.getPropertyValue('--best-sellers-edge-peek')) || 44;
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const cardStep = firstRealCard.offsetWidth + gap;

      return {
        cardStep,
        firstTarget: Math.max(0, firstRealCard.offsetLeft - peek),
        lastTarget: Math.max(0, lastRealCard.offsetLeft - peek),
      };
    };

    const jumpTo = (scrollLeft: number) => {
      carousel.scrollTo({ left: scrollLeft, behavior: 'auto' });
      carousel.scrollLeft = scrollLeft;
    };

    const setInitialPeek = () => {
      const positions = getLoopPositions();

      if (!positions) {
        return;
      }

      jumpTo(positions.firstTarget);
    };

    let scrollTimer: number | undefined;
    const handleLoopScroll = () => {
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
      }

      scrollTimer = window.setTimeout(() => {
        const positions = getLoopPositions();

        if (!positions) {
          return;
        }

        const { cardStep, firstTarget, lastTarget } = positions;

        if (carousel.scrollLeft < firstTarget - cardStep / 2) {
          jumpTo(lastTarget);
          return;
        }

        if (carousel.scrollLeft > lastTarget + cardStep / 2) {
          jumpTo(firstTarget);
        }
      }, 120);
    };

    carousel.addEventListener('scroll', handleLoopScroll, { passive: true });
    const frame = window.requestAnimationFrame(setInitialPeek);
    const timeouts = [250, 900, 1800].map((delay) => window.setTimeout(setInitialPeek, delay));

    return () => {
      carousel.removeEventListener('scroll', handleLoopScroll);
      window.cancelAnimationFrame(frame);
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
      }
    };
  }, [hasEdgePeek, products]);

  return (
    <div
      className={[
        'related-products-grid best-sellers-carousel',
        hasEdgePeek ? 'has-edge-peek' : undefined,
      ].filter(Boolean).join(' ')}
      ref={carouselRef}
    >
      {carouselItems.map(({ clone, key, product: relatedProduct, realStart }) => (
        <article
          aria-hidden={clone ? true : undefined}
          aria-label={clone ? undefined : relatedProduct.title}
          className={['related-product product', clone ? 'best-sellers-edge-clone' : undefined].filter(Boolean).join(' ')}
          data-carousel-real-start={realStart ? 'true' : undefined}
          key={key}
        >
          <Link
            aria-label={clone ? undefined : `View ${relatedProduct.title}`}
            className="related-product-media product-image-link"
            href={`/products/${relatedProduct.slug}`}
            tabIndex={clone ? -1 : undefined}
          >
            <ProductImage
              product={relatedProduct}
              sizes="(max-width: 900px) calc(100vw - 64px), 25vw"
            />
          </Link>
        </article>
      ))}
    </div>
  );
}

export default function ProductPageClient({
  catalogProducts,
  product,
  relatedProducts,
  searchSizeId: initialSearchSizeId,
}: {
  catalogProducts: Product[];
  product: Product;
  relatedProducts: Product[];
  searchSizeId?: string;
}) {
  const querySizeId = useUrlSearchParam('size');
  const searchSizeId = initialSearchSizeId ?? querySizeId ?? undefined;
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedFrameId, setSelectedFrameId] = useState(product.frameOptions[0]?.id ?? 'canvas');
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [deliveryEstimate] = useState(getDeliveryEstimate);
  const [checkoutError, setCheckoutError] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [showMobilePurchaseBar, setShowMobilePurchaseBar] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const galleryItems = getProductMediaGallery(product);
  const selectedGalleryItem = galleryItems[selectedImage] ?? galleryItems[0];
  const selectedGalleryImageMetadata =
    selectedGalleryItem.type === 'image' ? selectedGalleryItem.image : undefined;
  const selectedGalleryImage =
    selectedGalleryImageMetadata?.url;
  const selectedGalleryVideo =
    selectedGalleryItem.type === 'video' ? selectedGalleryItem.video : null;
  const mobileGalleryRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollFrame = useRef<number | null>(null);
  const purchaseActionsRef = useRef<HTMLDivElement | null>(null);
  const checkoutRequest = useRef<{ id: string; signature: string } | null>(null);
  const lastTrackedProductId = useRef('');
  const isMockupGalleryImage = isProductMockupImage(product, selectedGalleryImage);
  const isSideGalleryImage = isSideMockupImage(selectedGalleryImage);
  const isFrontMockupGalleryImage = isMockupGalleryImage && !isSideGalleryImage;
  const defaultSizeOption = getFeaturedSizeOption(product);
  const requestedSizeOption = product.sizeOptions.find((option) => sizeOptionMatches(option, searchSizeId));
  const selectedOption =
    product.sizeOptions.find((option) => sizeOptionMatches(option, selectedSizeId || undefined)) ??
    requestedSizeOption ??
    defaultSizeOption;
  const selectedSize = product.sizeOptions.findIndex((option) => option.id === selectedOption.id);
  const availableFrameOptions = getAvailableFrameOptions(product, selectedOption);
  const selectedFrameOption =
    availableFrameOptions.find((option) => option.id === selectedFrameId) ?? getBaseFrameOption(product);
  const selectedFrameName = selectedFrameOption.label;
  const selectedUnitPrice = getConfiguredUnitPrice(product, selectedOption, selectedFrameOption);
  const productAspectRatio = getProductAspectRatio(product);
  const productDisplayShape = getDisplayArtworkShape(product);
  const shouldShowFramePreview = selectedGalleryItem.type === 'image' && selectedGalleryItem.isPrimary;
  const frameClass =
    !shouldShowFramePreview
      ? 'frame-none'
      : selectedFrameName === 'Black Frame'
        ? 'frame-black'
        : selectedFrameName === 'White Frame'
          ? 'frame-white'
          : 'frame-none';
  // Keep the baked black mockup when one exists. White Frame always uses the
  // live artwork so the supplied white frame can wrap it without replacing it.
  const framedMockupSrc =
    selectedFrameName === 'Black Frame'
      ? product.framedBlackImage
      : undefined;
  const mainCanvasSrc = framedMockupSrc || product.image;
  const mainCanvasFrameClass = framedMockupSrc ? 'frame-none' : frameClass;
  const selectedOptionId = selectedOption.id;
  const selectedFrameOptionId = selectedFrameOption.id;

  function selectGalleryImage(index: number) {
    setSelectedImage(index);

    const mobileGallery = mobileGalleryRef.current;

    if (mobileGallery) {
      mobileGallery.scrollTo({
        left: mobileGallery.clientWidth * index,
        behavior: 'smooth',
      });
    }
  }

  function updateMobileGalleryIndex(element: HTMLDivElement) {
    const slideWidth = element.clientWidth;

    if (!slideWidth) {
      return;
    }

    const nextIndex = Math.max(
      0,
      Math.min(galleryItems.length - 1, Math.round(element.scrollLeft / slideWidth)),
    );

    setSelectedImage((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
  }

  function queueMobileGalleryIndexUpdate(element: HTMLDivElement) {
    if (mobileScrollFrame.current !== null) {
      window.cancelAnimationFrame(mobileScrollFrame.current);
    }

    mobileScrollFrame.current = window.requestAnimationFrame(() => {
      mobileScrollFrame.current = null;
      updateMobileGalleryIndex(element);
    });
  }

  useEffect(() => {
    const purchaseActions = purchaseActionsRef.current;

    if (!purchaseActions || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setShowMobilePurchaseBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });

    observer.observe(purchaseActions);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [lightboxOpen]);

  useEffect(() => {
    if (!sizeGuideOpen) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSizeGuideOpen(false);
      }
    };

    document.body.classList.add('size-guide-lock');
    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.classList.remove('size-guide-lock');
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [sizeGuideOpen]);

  useEffect(() => {
    return () => {
      if (mobileScrollFrame.current !== null) {
        window.cancelAnimationFrame(mobileScrollFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!addedToCart) {
      return;
    }

    const timeoutId = window.setTimeout(() => setAddedToCart(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [addedToCart]);

  useEffect(() => {
    if (lastTrackedProductId.current === product.id) {
      return;
    }

    const trackedSizeOption =
      product.sizeOptions.find((option) => option.id === selectedOptionId) ?? selectedOption;
    const trackedFrameOption =
      product.frameOptions.find((option) => option.id === selectedFrameOptionId) ?? selectedFrameOption;

    initStorefrontTracking();
    lastTrackedProductId.current = product.id;
    trackStorefrontEvent('view_item', {
      currency: 'USD',
      value: selectedUnitPrice / 100,
      items: [getProductTrackingItem(product, trackedSizeOption, trackedFrameOption)],
    });
  }, [
    product,
    selectedFrameOption,
    selectedFrameOptionId,
    selectedOption,
    selectedOptionId,
    selectedUnitPrice,
  ]);

  function addSelectionToCart() {
    addStoredCartItem({
      productId: product.id,
      sizeId: selectedOption.id,
      frameId: selectedFrameOption.id,
      quantity: 1,
    });
    const trackingItem = getProductTrackingItem(product, selectedOption, selectedFrameOption);

    trackStorefrontEvent('add_to_cart', {
      currency: 'USD',
      value: selectedUnitPrice / 100,
      items: [trackingItem],
    });
    setAddedToCart(true);
  }

  async function startBuyNow() {
    setCheckoutState('loading');
    setCheckoutError('');
    const trackingItem = getProductTrackingItem(product, selectedOption, selectedFrameOption);
    const checkoutItems = [
      {
        id: product.id,
        sizeId: selectedOption.id,
        frameId: selectedFrameOption.id,
        quantity: 1,
      },
    ];
    const checkoutSignature = JSON.stringify(checkoutItems);

    if (!checkoutRequest.current || checkoutRequest.current.signature !== checkoutSignature) {
      checkoutRequest.current = {
        id: createCheckoutRequestId(),
        signature: checkoutSignature,
      };
    }

    trackStorefrontEvent('begin_checkout', {
      currency: 'USD',
      value: selectedUnitPrice / 100,
      items: [trackingItem],
    });

    try {
      const { data: authData } = supabaseClient
        ? await supabaseClient.auth.getSession()
        : { data: { session: null } };
      const accessToken = authData.session?.access_token;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          attribution: getCheckoutAttribution(),
          checkoutRequestId: checkoutRequest.current.id,
          items: checkoutItems,
          ...(getNewsletterDiscountCode() ? { discountCode: getNewsletterDiscountCode() } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || 'Checkout request failed');
      }

      const data = (await response.json()) as { url?: string };

      if (!data.url) {
        throw new Error('Checkout URL missing');
      }

      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout request failed');
      setCheckoutState('error');
    }
  }

  return (
    <StorefrontShell products={catalogProducts}>
      <StorefrontTracker />
      <main className="product-page">
        <div className="product-page-header">
          <Link className="back-link" href="/collections/best-sellers">
            <ArrowLeft aria-hidden="true" size={16} />
            Back to Shop
          </Link>
        </div>

        <section className="listing-layout">
          <div className="listing-gallery">
            <div className="gallery-rail" aria-label="Product media">
              {galleryItems.map((item, index) => (
                <button
                  aria-pressed={index === selectedImage}
                  className={index === selectedImage ? 'active' : ''}
                  key={`${product.id}-${item.key}`}
                  type="button"
                  onClick={() => selectGalleryImage(index)}
                  aria-label={`View ${product.title} ${item.type === 'video' ? 'video' : 'image'} ${index + 1}`}
                >
                  {item.type === 'placeholder' ? (
                    <ProductVisual product={product} />
                  ) : item.type === 'video' ? (
                    <ProductVideoThumbnail video={item.video} />
                  ) : item.isPrimary ? (
                    <OptimizedCanvasImage
                      className="gallery-thumbnail-canvas"
                      product={product}
                      src={item.src}
                      alt=""
                      aspectRatio={productAspectRatio}
                      sanityImage={item.image}
                      shape={productDisplayShape}
                      shadow={false}
                      sizes="82px"
                    />
                  ) : (
                    <OptimizedRawImage
                      src={item.src}
                      alt=""
                      aspectRatio={productAspectRatio}
                      sanityImage={item.image}
                      sizes="82px"
                    />
                  )}
                </button>
              ))}
            </div>

            <div
              className="mobile-gallery-carousel"
              ref={mobileGalleryRef}
              onScroll={(event) => queueMobileGalleryIndexUpdate(event.currentTarget)}
              onDragStart={(event) => event.preventDefault()}
              aria-label={`${product.title} product media`}
              aria-roledescription="carousel"
              role="region"
            >
              {galleryItems.map((item, index) => {
                const mobileGalleryImageMetadata = item.type === 'image' ? item.image : undefined;
                const mobileGalleryImage = mobileGalleryImageMetadata?.url;
                const mobileGalleryVideo = item.type === 'video' ? item.video : null;
                const mobileIsMockupImage = isProductMockupImage(product, mobileGalleryImage);
                const mobileIsSideImage = isSideMockupImage(mobileGalleryImage);
                const mobileIsFrontMockupImage = mobileIsMockupImage && !mobileIsSideImage;
                const mobileFrameClass =
                  item.type === 'image' && item.isPrimary ? mainCanvasFrameClass : 'frame-none';

                return (
                  <div
                    aria-hidden={index !== selectedImage}
                    className={`mobile-gallery-slide${index === selectedImage ? ' is-active' : ''}`}
                    inert={index !== selectedImage}
                    key={`${product.id}-mobile-${item.key}`}
                  >
                    <div
                      className={`main-product-image ${
                        mobileGalleryImage || mobileGalleryVideo ? 'gallery-product-image' : ''
                      } ${mobileGalleryVideo ? 'video-product-image' : ''} ${
                        mobileIsMockupImage ? 'mockup-product-image' : ''
                      }`}
                    >
                      <div
                        className={`detail-artwork-shell frame-none shape-${productDisplayShape} ${
                          mobileIsMockupImage ? 'mockup-product-shell' : ''
                        } ${mobileIsFrontMockupImage ? 'front-product-shell' : ''} ${
                          mobileIsSideImage ? 'side-product-shell' : ''
                        }`}
                      >
                        <div className="detail-artwork-surface">
                          {mobileGalleryVideo ? (
                            <ProductVideoPlayer
                              active={index === selectedImage}
                              title={product.title}
                              video={mobileGalleryVideo}
                            />
                          ) : mobileGalleryImage === product.image ? (
                            <OptimizedCanvasImage
                              className={`detail-artwork-image front-product-canvas ${mobileFrameClass}`}
                              product={product}
                              src={mainCanvasSrc}
                              alt={mobileGalleryImageMetadata?.alt || product.imageAlt}
                              aspectRatio={productAspectRatio}
                              sanityImage={framedMockupSrc ? undefined : mobileGalleryImageMetadata}
                              shape={productDisplayShape}
                              priority={index === 0}
                            />
                          ) : mobileGalleryImage ? (
                            <OptimizedRawImage
                              className="detail-gallery-image"
                              src={mobileGalleryImage}
                              alt={mobileGalleryImageMetadata?.alt || product.imageAlt}
                              aspectRatio={productAspectRatio}
                              sanityImage={mobileGalleryImageMetadata}
                              priority={index === 0}
                            />
                          ) : (
                            <ProductVisual product={product} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="mobile-gallery-hint"
              role="group"
              aria-label={`Choose ${product.title} product media`}
            >
              {galleryItems.map((item, index) => (
                <button
                  aria-label={`View ${product.title} ${item.type === 'video' ? 'video' : 'image'} ${index + 1}`}
                  aria-pressed={index === selectedImage}
                  className={index === selectedImage ? 'is-active' : ''}
                  key={`${product.id}-mobile-hint-${item.key}`}
                  type="button"
                  onClick={() => selectGalleryImage(index)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>

            <div
              className={`main-product-image ${
                selectedGalleryImage || selectedGalleryVideo ? 'gallery-product-image' : ''
              } ${selectedGalleryVideo ? 'video-product-image' : ''} ${
                isMockupGalleryImage ? 'mockup-product-image' : ''
              } ${selectedGalleryImage ? 'has-lightbox' : ''}`}
              onClick={selectedGalleryImage ? () => setLightboxOpen(true) : undefined}
            >
              <div
                className="product-gallery-transition"
                key={`${product.id}-gallery-${selectedGalleryItem.key}-${frameClass}`}
              >
                <div
                  className={`detail-artwork-shell frame-none shape-${productDisplayShape} ${
                    isMockupGalleryImage ? 'mockup-product-shell' : ''
                  } ${isFrontMockupGalleryImage ? 'front-product-shell' : ''} ${
                    isSideGalleryImage ? 'side-product-shell' : ''
                  }`}
                >
                  <div className="detail-artwork-surface">
                    {selectedGalleryVideo ? (
                      <ProductVideoPlayer title={product.title} video={selectedGalleryVideo} />
                    ) : selectedGalleryImage === product.image ? (
                      <OptimizedCanvasImage
                        className={`detail-artwork-image front-product-canvas ${mainCanvasFrameClass}`}
                        product={product}
                        src={mainCanvasSrc}
                        alt={selectedGalleryImageMetadata?.alt || product.imageAlt}
                        aspectRatio={productAspectRatio}
                        sanityImage={framedMockupSrc ? undefined : selectedGalleryImageMetadata}
                        shape={productDisplayShape}
                        sizes={desktopMainProductGalleryImageSizes}
                        priority
                      />
                    ) : selectedGalleryImage ? (
                      <OptimizedRawImage
                        className="detail-gallery-image"
                        src={selectedGalleryImage}
                        alt={selectedGalleryImageMetadata?.alt || product.imageAlt}
                        aspectRatio={productAspectRatio}
                        sanityImage={selectedGalleryImageMetadata}
                        sizes={desktopSecondaryProductGalleryImageSizes}
                        priority
                      />
                    ) : (
                      <ProductVisual product={product} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="listing-panel">
            <p className="listing-kicker">Armoze Original</p>
            <StoreRating product={product} />
            <h1>{product.title}</h1>
            <p className="listing-price">{formatPrice(selectedUnitPrice)}</p>
            <ProductTrustStrip />

            <div className="option-group">
              <div className="option-label">
                <span>Framing Options:</span>
                <strong>{selectedFrameName}</strong>
              </div>
              <div className="frame-options">
                {availableFrameOptions.map((option) => (
                  <button
                    className={option.id === selectedFrameOption.id ? 'selected' : ''}
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSelectedFrameId(option.id);
                      selectGalleryImage(0);
                    }}
                    aria-label={`Select ${option.label}`}
                  >
                    <FrameOptionPreview option={option} />
                    <span className="sr-only">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <div className="option-label">
                <span>Size:</span>
                <strong>{selectedOption.label}</strong>
                <button
                  className="size-guide-trigger"
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                >
                  <Ruler aria-hidden="true" size={15} />
                  Size guide
                </button>
              </div>
              <div className="size-options">
                {product.sizeOptions.map((option, index) => {
                  const badge = option.badge?.trim().toLowerCase() === 'popular' ? option.badge : null;

                  return (
                    <button
                      className={[
                        index === selectedSize ? 'selected' : '',
                        badge ? 'has-badge' : '',
                      ].filter(Boolean).join(' ')}
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedSizeId(option.id)}
                    >
                      {badge ? <span>{badge}</span> : null}
                      {option.label}
                      <em className="size-option-price">
                        {formatPrice(getConfiguredUnitPrice(product, option, selectedFrameOption))}
                      </em>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="installment-note">
              Pay in 4 interest-free installments with eligible payment methods at checkout.
            </div>

            <div className="listing-purchase-actions" ref={purchaseActionsRef}>
              <button
                className="button button-secondary listing-cart-button listing-buy-now-button"
                type="button"
                disabled={checkoutState === 'loading'}
                onClick={() => void startBuyNow()}
              >
                {checkoutState === 'loading' ? 'Opening checkout' : 'Buy it now'}
              </button>

              <button
                className="button button-primary listing-cart-button listing-add-cart-button"
                type="button"
                onClick={addSelectionToCart}
              >
                {addedToCart ? 'Added to cart' : 'Add to cart'}
              </button>
            </div>

            <CheckoutPolicyNotice compact />

            {deliveryEstimate ? (
              <div className="product-delivery-note">
                <span className="product-delivery-icon" aria-hidden="true">
                  <Truck size={18} strokeWidth={2.3} />
                </span>
                <span className="product-delivery-copy">
                  <span className="product-delivery-label">Estimated arrival</span>
                  <strong>{deliveryEstimate}</strong>
                </span>
              </div>
            ) : null}

            {checkoutState === 'error' ? (
              <p className="checkout-error">
                {checkoutError || 'Checkout could not be started. Please try again.'}
              </p>
            ) : null}

            <div className="trust-grid">
              <div>
                <Box aria-hidden="true" size={24} />
                <span>Free Shipping</span>
              </div>
              <div>
                <ShieldCheck aria-hidden="true" size={24} />
                <span>Secure Checkout</span>
              </div>
              <div>
                <BadgeCheck aria-hidden="true" size={24} />
                <span>Made To Order</span>
              </div>
            </div>

            <div className="product-info-drawers">
              <div className="product-details-drawer">
                <button
                  type="button"
                  aria-expanded={descriptionOpen}
                  aria-controls={`${product.id}-description`}
                  onClick={() => setDescriptionOpen((open) => !open)}
                >
                  <span>Description</span>
                  {descriptionOpen ? (
                    <ChevronUp aria-hidden="true" size={18} strokeWidth={2.4} />
                  ) : (
                    <ChevronDown aria-hidden="true" size={18} strokeWidth={2.4} />
                  )}
                </button>
                {descriptionOpen ? (
                  <div
                    className="product-details-content product-description-content"
                    id={`${product.id}-description`}
                  >
                    <p>{product.longDescription}</p>
                  </div>
                ) : null}
              </div>

              <div className="product-details-drawer">
                <button
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-controls={`${product.id}-details`}
                  onClick={() => setDetailsOpen((open) => !open)}
                >
                  <span>Product Details</span>
                  {detailsOpen ? (
                    <ChevronUp aria-hidden="true" size={18} strokeWidth={2.4} />
                  ) : (
                    <ChevronDown aria-hidden="true" size={18} strokeWidth={2.4} />
                  )}
                </button>
                {detailsOpen ? (
                  <div className="product-details-content" id={`${product.id}-details`}>
                    <ul className="product-info-list">
                      <li><span className="product-info-flag-badge" aria-hidden="true"><span className="product-info-flag" /></span> Made in USA</li>
                      <li><FaImage className="product-info-icon product-info-icon-blue" aria-hidden="true" /> Ready-to-hang canvas print</li>
                      <li><FaHammer className="product-info-icon product-info-icon-terracotta" aria-hidden="true" /> Made to order, just for you</li>
                      <li><FaPaintbrush className="product-info-icon product-info-icon-plum" aria-hidden="true" /> Premium matte canvas finish</li>
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="product-details-drawer">
                <button
                  type="button"
                  aria-expanded={shippingOpen}
                  aria-controls={`${product.id}-shipping-returns`}
                  onClick={() => setShippingOpen((open) => !open)}
                >
                  <span>Shipping &amp; Returns</span>
                  {shippingOpen ? (
                    <ChevronUp aria-hidden="true" size={18} strokeWidth={2.4} />
                  ) : (
                    <ChevronDown aria-hidden="true" size={18} strokeWidth={2.4} />
                  )}
                </button>
                {shippingOpen ? (
                  <div className="product-details-content" id={`${product.id}-shipping-returns`}>
                    <ul className="product-info-list">
                      <li><FaTruckFast className="product-info-icon product-info-icon-blue" aria-hidden="true" /> Free U.S. shipping</li>
                      <li><FaCalendarDays className="product-info-icon product-info-icon-violet" aria-hidden="true" /> Expected arrival in 5–8 business days</li>
                      <li><FaArrowRotateLeft className="product-info-icon product-info-icon-terracotta" aria-hidden="true" /> 30-day returns on eligible orders</li>
                      <li><FaShield className="product-info-icon product-info-icon-green" aria-hidden="true" /> Support for damaged or incorrect orders</li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </section>

        {relatedProducts.length ? (
          <section className="related-products-section" aria-labelledby="related-products-title">
            <div className="product-section-heading">
              <h2 id="related-products-title">Related products</h2>
            </div>
            <RelatedProductsCarousel products={relatedProducts} />
            {relatedProducts.length > 1 ? (
              <div className="related-products-scroll-cue" aria-hidden="true">
                <span />
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="product-proof-section" aria-labelledby="product-proof-title">
          <div className="product-section-heading">
            <p className="eyebrow">What arrives</p>
            <h2 id="product-proof-title">Made to arrive ready</h2>
            <p className="product-proof-subline">
              Stretched, finished, and protected before it ships. All that is left is choosing
              the wall.
            </p>
          </div>

          <div className="product-proof-grid">
            <article className="product-proof-card">
              <div className="product-proof-image">
                <OptimizedRawImage
                  src="/product-support/what-arrives-packaging-v2.jpg"
                  alt="Stretched canvas print being unpacked from protective wrapping and corner guards"
                  aspectRatio="3 / 2"
                  sizes="(max-width: 900px) 92vw, 33vw"
                  fill
                />
              </div>
              <div className="product-proof-copy">
                <div className="product-proof-kicker">
                  <span className="product-proof-icon" aria-hidden="true">
                    <Box size={17} strokeWidth={2.2} />
                  </span>
                  <p className="product-proof-step">01 / Protected</p>
                </div>
                <h3>Packed with intention</h3>
                <p>
                  Protective wrap, corner guards, and a snug box help keep every surface and edge
                  protected in transit.
                </p>
              </div>
            </article>

            <article className="product-proof-card">
              <div className="product-proof-image">
                <OptimizedRawImage
                  src="/product-support/what-arrives-canvas-detail-v2.jpg"
                  alt="Macro detail of woven canvas texture and a clean gallery-wrapped corner"
                  aspectRatio="3 / 2"
                  sizes="(max-width: 900px) 92vw, 33vw"
                  fill
                />
              </div>
              <div className="product-proof-copy">
                <div className="product-proof-kicker">
                  <span className="product-proof-icon" aria-hidden="true">
                    <BadgeCheck size={17} strokeWidth={2.2} />
                  </span>
                  <p className="product-proof-step">02 / Finished</p>
                </div>
                <h3>Detail in every edge</h3>
                <p>
                  Fine woven texture, clean folds, and crisp matte color give the canvas a premium
                  finish from every angle.
                </p>
              </div>
            </article>

            <article className="product-proof-card">
              <div className="product-proof-image">
                <OptimizedRawImage
                  src="/product-support/what-arrives-ready-to-hang-v2.jpg"
                  alt="Finished gallery-wrapped canvas being positioned on a wall"
                  aspectRatio="3 / 2"
                  sizes="(max-width: 900px) 92vw, 33vw"
                  fill
                />
              </div>
              <div className="product-proof-copy">
                <div className="product-proof-kicker">
                  <span className="product-proof-icon" aria-hidden="true">
                    <Clock size={17} strokeWidth={2.2} />
                  </span>
                  <p className="product-proof-step">03 / Wall-ready</p>
                </div>
                <h3>Up in minutes</h3>
                <p>
                  Your canvas arrives stretched and ready to hang, so it can go from the box to
                  your wall without extra setup.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="storefront-social-proof product-reviews" aria-labelledby="product-reviews-title">
          <div className="storefront-social-proof-heading">
            <p className="eyebrow">Customer feedback</p>
            <h2 id="product-reviews-title">Reviews</h2>
          </div>
          <div className="storefront-review-carousel" aria-label="Buyer reviews">
            {etsyReviewHighlights.map((review) => (
              <article className="storefront-review-card" key={`${review.name}-${review.date}`}>
                <div className="storefront-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: review.rating }).map((_, starIndex) => (
                    <Star aria-hidden="true" fill="currentColor" key={starIndex} size={17} strokeWidth={2.4} />
                  ))}
                </div>
                <div className="storefront-review-meta">
                  <strong>{review.name}</strong>
                  <span>{review.date}</span>
                </div>
                <p className="storefront-review-detail">{review.detail}</p>
                <p className="storefront-review-quote">{review.quote}</p>
              </article>
            ))}
          </div>
        </section>

        <div
          className={`product-mobile-purchase-bar${showMobilePurchaseBar ? ' is-visible' : ''}`}
          aria-hidden={showMobilePurchaseBar ? undefined : true}
        >
          <div>
            <span>{selectedOption.label} · {selectedFrameName}</span>
            <strong>{formatPrice(selectedUnitPrice)}</strong>
          </div>
          <button
            className="button button-primary"
            type="button"
            tabIndex={showMobilePurchaseBar ? undefined : -1}
            onClick={addSelectionToCart}
          >
            {addedToCart ? 'Added' : 'Add to cart'}
          </button>
        </div>

        {sizeGuideOpen ? (
          <ProductSizeGuide
            frameOption={selectedFrameOption}
            onClose={() => setSizeGuideOpen(false)}
            onSelect={setSelectedSizeId}
            product={product}
            selectedOption={selectedOption}
          />
        ) : null}

        {lightboxOpen && selectedGalleryImage ? (
          <div
            className="product-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${product.title} enlarged image`}
            onClick={() => setLightboxOpen(false)}
          >
            <button className="product-lightbox-close" type="button" aria-label="Close image viewer">
              ×
            </button>
            <OptimizedRawImage
              src={selectedGalleryImage}
              alt={selectedGalleryImageMetadata?.alt || product.imageAlt}
              aspectRatio={productAspectRatio}
              sanityImage={selectedGalleryImageMetadata}
              sizes="92vw"
            />
          </div>
        ) : null}
      </main>
    </StorefrontShell>
  );
}
