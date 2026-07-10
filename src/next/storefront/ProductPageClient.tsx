'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  Play,
  RotateCcw,
  ShieldCheck,
  Star,
  StarHalf,
  Truck,
} from 'lucide-react';
import { addStoredCartItem } from '../../cart';
import { etsyReviewHighlights } from '../../data/reviews';
import type { FrameOption, Product, ProductVideo } from '../../data/products';
import {
  formatPrice,
  getAvailableFrameOptions,
  getBaseFrameOption,
  getConfiguredUnitPrice,
  getDisplayArtworkShape,
  getFeaturedSizeOption,
  getFramePreviewVariant,
  getProductAspectRatio,
  getProductMediaGallery,
  isProductMockupImage,
  isSideMockupImage,
  launchOfferCode,
  sizeOptionMatches,
} from './product-utils';
import {
  getProductTrackingItem,
  initStorefrontTracking,
  trackStorefrontEvent,
} from './analytics';
import {
  OptimizedCanvasImage,
  OptimizedRawImage,
  ProductImage,
  ProductVisual,
} from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { useUrlSearchParam } from './url-search';

const framePreviewImages: Record<string, string> = {
  canvas: '/product-support/frame-option-canvas.jpg',
  black: '/product-support/frame-option-black.jpg',
  white: '/product-support/frame-option-white.jpg',
};

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

function StoreRating({ product }: { product: Product }) {
  const rating = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0);

  if (!rating || !reviewCount) {
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
        <Image src={video.thumbnail} alt="" fill sizes="82px" />
      ) : null}
      <span className="gallery-video-play">
        <Play aria-hidden="true" fill="currentColor" size={18} strokeWidth={2.4} />
      </span>
    </span>
  );
}

function ProductVideoPlayer({ title, video }: { title: string; video: ProductVideo }) {
  return (
    <div className="product-video-shell">
      <video
        className="product-video"
        src={video.url}
        poster={video.thumbnail}
        controls
        playsInline
        preload="metadata"
        aria-label={video.title || `${title} product video`}
      />
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
      {carouselItems.map(({ clone, key, product: relatedProduct, realStart }, index) => (
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
            <ProductImage product={relatedProduct} priority={!clone && index < 3} />
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
  const [checkoutError, setCheckoutError] = useState('');
  const galleryItems = getProductMediaGallery(product);
  const selectedGalleryItem = galleryItems[selectedImage] ?? galleryItems[0];
  const selectedGalleryImage =
    selectedGalleryItem.type === 'image' ? selectedGalleryItem.src : undefined;
  const selectedGalleryVideo =
    selectedGalleryItem.type === 'video' ? selectedGalleryItem.video : null;
  const mobileGalleryRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollFrame = useRef<number | null>(null);
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
  const selectedFrameClass =
    selectedFrameName === 'Black Frame'
      ? 'frame-black'
      : selectedFrameName === 'White Frame'
        ? 'frame-white'
        : 'frame-none';
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
    return () => {
      if (mobileScrollFrame.current !== null) {
        window.cancelAnimationFrame(mobileScrollFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    const trackedSizeOption =
      product.sizeOptions.find((option) => option.id === selectedOptionId) ?? selectedOption;
    const trackedFrameOption =
      product.frameOptions.find((option) => option.id === selectedFrameOptionId) ?? selectedFrameOption;

    initStorefrontTracking();
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
  }

  async function startBuyNow() {
    setCheckoutState('loading');
    setCheckoutError('');
    const trackingItem = getProductTrackingItem(product, selectedOption, selectedFrameOption);

    trackStorefrontEvent('begin_checkout', {
      currency: 'USD',
      value: selectedUnitPrice / 100,
      coupon: launchOfferCode,
      items: [trackingItem],
    });

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              id: product.id,
              sizeId: selectedOption.id,
              frameId: selectedFrameOption.id,
              quantity: 1,
            },
          ],
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
                      shape={productDisplayShape}
                      shadow={false}
                      sizes="82px"
                      priority={index === 0}
                    />
                  ) : (
                    <OptimizedRawImage
                      src={item.src}
                      alt=""
                      aspectRatio={productAspectRatio}
                      sizes="82px"
                      priority={index === 0}
                    />
                  )}
                </button>
              ))}
            </div>

            <div
              className="mobile-gallery-carousel"
              ref={mobileGalleryRef}
              onScroll={(event) => queueMobileGalleryIndexUpdate(event.currentTarget)}
              aria-label={`${product.title} product media`}
            >
              {galleryItems.map((item, index) => {
                const mobileGalleryImage = item.type === 'image' ? item.src : undefined;
                const mobileGalleryVideo = item.type === 'video' ? item.video : null;
                const mobileIsMockupImage = isProductMockupImage(product, mobileGalleryImage);
                const mobileIsSideImage = isSideMockupImage(mobileGalleryImage);
                const mobileIsFrontMockupImage = mobileIsMockupImage && !mobileIsSideImage;
                const mobileFrameClass =
                  item.type === 'image' && item.isPrimary ? selectedFrameClass : 'frame-none';

                return (
                  <div
                    className={`mobile-gallery-slide${index === selectedImage ? ' is-active' : ''}`}
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
                            <ProductVideoPlayer title={product.title} video={mobileGalleryVideo} />
                          ) : mobileGalleryImage === product.image ? (
                            <OptimizedCanvasImage
                              className={`detail-artwork-image front-product-canvas ${mobileFrameClass}`}
                              product={product}
                              src={mobileGalleryImage}
                              alt={product.imageAlt}
                              aspectRatio={productAspectRatio}
                              shape={productDisplayShape}
                              priority={index === 0}
                            />
                          ) : mobileGalleryImage ? (
                            <OptimizedRawImage
                              className="detail-gallery-image"
                              src={mobileGalleryImage}
                              alt={product.imageAlt}
                              aspectRatio={productAspectRatio}
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
            <div className="mobile-gallery-hint" aria-hidden="true">
              {galleryItems.map((item, index) => (
                <span
                  className={index === selectedImage ? 'is-active' : ''}
                  key={`${product.id}-mobile-hint-${item.key}`}
                />
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
                        className={`detail-artwork-image front-product-canvas ${frameClass}`}
                        product={product}
                        src={selectedGalleryImage}
                        alt={product.imageAlt}
                        aspectRatio={productAspectRatio}
                        shape={productDisplayShape}
                        priority
                      />
                    ) : selectedGalleryImage ? (
                      <OptimizedRawImage
                        className="detail-gallery-image"
                        src={selectedGalleryImage}
                        alt={product.imageAlt}
                        aspectRatio={productAspectRatio}
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
              </div>
              <div className="size-options">
                {product.sizeOptions.map((option, index) => {
                  const badge = option.badge?.trim().toLowerCase() === 'popular' ? option.badge : null;

                  return (
                    <button
                      className={index === selectedSize ? 'selected' : ''}
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
              Pay in 4 interest-free installments with Stripe-compatible payment methods at checkout.
            </div>

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
              Add to cart
            </button>

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
                      <li><Check aria-hidden="true" size={16} strokeWidth={2.6} /> Ready-to-hang canvas print</li>
                      <li><Check aria-hidden="true" size={16} strokeWidth={2.6} /> Made to order, just for you</li>
                      <li><Check aria-hidden="true" size={16} strokeWidth={2.6} /> Premium matte canvas finish</li>
                      <li><Check aria-hidden="true" size={16} strokeWidth={2.6} /> Securely packed for delivery</li>
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
                      <li><Truck aria-hidden="true" size={16} strokeWidth={2.4} /> Free U.S. shipping</li>
                      <li><Clock aria-hidden="true" size={16} strokeWidth={2.4} /> Made in 2-3 business days</li>
                      <li><Package aria-hidden="true" size={16} strokeWidth={2.4} /> Ships in 2-5 business days after production</li>
                      <li><RotateCcw aria-hidden="true" size={16} strokeWidth={2.4} /> 30-day returns on eligible orders</li>
                      <li><ShieldCheck aria-hidden="true" size={16} strokeWidth={2.4} /> Support for damaged or incorrect orders</li>
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
            <h2 id="product-proof-title">Ready to hang</h2>
            <p className="product-proof-subline">
              Stretched, packed with care, and ready for the wall in minutes.
            </p>
          </div>

          <div className="product-proof-grid">
            <article className="product-proof-card">
              <div className="product-proof-image">
                <OptimizedRawImage
                  src="/product-support/canvas-unboxing-back.jpg"
                  alt="Back of a stretched canvas print being unboxed from protective packaging"
                  aspectRatio="4 / 3"
                  sizes="(max-width: 760px) 92vw, 50vw"
                  loading="eager"
                  fill
                />
              </div>
              <div className="product-proof-copy">
                <p className="product-proof-step">01 · Packaging</p>
                <h3>Protected from box to wall</h3>
                <p>
                  Each canvas is packed to protect the surface, corners, and back side while it
                  moves through shipping.
                </p>
              </div>
            </article>

            <article className="product-proof-card">
              <div className="product-proof-image">
                <OptimizedRawImage
                  src="/product-support/canvas-quality-closeup.jpg"
                  alt="Close-up of canvas print texture and wrapped canvas edge"
                  aspectRatio="4 / 3"
                  sizes="(max-width: 760px) 92vw, 50vw"
                  fill
                />
              </div>
              <div className="product-proof-copy">
                <p className="product-proof-step">02 · Craft</p>
                <h3>Texture you can actually see</h3>
                <p>
                  A close-up look at the woven canvas surface, wrapped edge, and sturdy print
                  construction.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="storefront-social-proof product-reviews" aria-labelledby="product-reviews-title">
          <div className="storefront-social-proof-heading">
            <h2 id="product-reviews-title">Reviews</h2>
          </div>
          <div className="storefront-review-carousel" aria-label="Buyer reviews">
            {etsyReviewHighlights.slice(0, 3).map((review) => (
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
              alt={product.imageAlt}
              aspectRatio={productAspectRatio}
              sizes="92vw"
            />
          </div>
        ) : null}
      </main>
    </StorefrontShell>
  );
}
