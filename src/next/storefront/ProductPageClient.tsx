'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { addStoredCartItem } from '../../cart';
import type { FrameOption, Product } from '../../data/products';
import {
  formatFramePriceDelta,
  formatPrice,
  getBaseFrameOption,
  getConfiguredUnitPrice,
  getDisplayArtworkShape,
  getFeaturedSizeOption,
  getFramePreviewVariant,
  getProductAspectRatio,
  getProductGallery,
  isProductMockupImage,
  isSideMockupImage,
  launchOfferCode,
  launchOfferText,
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

function FrameOptionPreview({ option }: { option: FrameOption }) {
  return (
    <span
      className={`frame-option-preview ${getFramePreviewVariant(option)}`}
      aria-hidden="true"
    >
      <span className="frame-preview-corner">
        <span className="frame-preview-artwork" />
      </span>
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
        Secure Stripe checkout
      </span>
      <span>
        <Check aria-hidden="true" size={14} />
        Damage support
      </span>
    </div>
  );
}

function LaunchOffer({ className = '' }: { className?: string }) {
  return (
    <div className={['launch-offer', className].filter(Boolean).join(' ')}>
      <Sparkles aria-hidden="true" size={16} />
      <span>{launchOfferText}</span>
    </div>
  );
}

export default function ProductPageClient({
  product,
  relatedProducts,
  searchSizeId,
}: {
  product: Product;
  relatedProducts: Product[];
  searchSizeId?: string;
}) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(searchSizeId || null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const gallery = getProductGallery(product);
  const selectedGalleryImage = gallery[selectedImage];
  const isMockupGalleryImage = isProductMockupImage(product, selectedGalleryImage);
  const isSideGalleryImage = isSideMockupImage(selectedGalleryImage);
  const isFrontMockupGalleryImage = isMockupGalleryImage && !isSideGalleryImage;
  const defaultSizeOption = getFeaturedSizeOption(product);
  const requestedSizeOption = product.sizeOptions.find((option) => option.id === searchSizeId);
  const selectedOption =
    product.sizeOptions.find((option) => option.id === selectedSizeId) ??
    requestedSizeOption ??
    defaultSizeOption;
  const selectedSize = product.sizeOptions.findIndex((option) => option.id === selectedOption.id);
  const selectedFrameOption = product.frameOptions[selectedFrame] ?? getBaseFrameOption(product);
  const selectedFrameName = selectedFrameOption.label;
  const selectedUnitPrice = getConfiguredUnitPrice(product, selectedOption, selectedFrameOption);
  const productAspectRatio = getProductAspectRatio(product);
  const productDisplayShape = getDisplayArtworkShape(product);
  const shouldShowFramePreview = selectedImage === 0;
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
    router.push(
      `/cart?item=${encodeURIComponent(`${product.id}-${selectedOption.id}`)}&frame=${encodeURIComponent(selectedFrameOption.id)}`,
    );
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
    <StorefrontShell>
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
            <div className="gallery-rail" aria-label="Product images">
              {(gallery.length ? gallery : ['placeholder']).map((image, index) => (
                <button
                  className={index === selectedImage ? 'active' : ''}
                  key={`${product.id}-${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View ${product.title} image ${index + 1}`}
                >
                  {image === 'placeholder' ? (
                    <ProductVisual product={product} />
                  ) : (
                    <OptimizedRawImage
                      src={image}
                      alt=""
                      aspectRatio={productAspectRatio}
                      sizes="82px"
                      priority={index === 0}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="mobile-gallery-carousel" aria-label={`${product.title} product images`}>
              {(gallery.length ? gallery : ['placeholder']).map((image, index) => {
                const mobileGalleryImage = image === 'placeholder' ? undefined : image;
                const mobileIsMockupImage = isProductMockupImage(product, mobileGalleryImage);
                const mobileIsSideImage = isSideMockupImage(mobileGalleryImage);
                const mobileIsFrontMockupImage = mobileIsMockupImage && !mobileIsSideImage;
                const mobileFrameClass = index === 0 ? selectedFrameClass : 'frame-none';

                return (
                  <div className="mobile-gallery-slide" key={`${product.id}-mobile-${image}-${index}`}>
                    <div
                      className={`main-product-image ${mobileGalleryImage ? 'gallery-product-image' : ''} ${
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
                          {mobileGalleryImage === product.image ? (
                            <OptimizedCanvasImage
                              className={`detail-artwork-image ${mobileFrameClass}`}
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
              {(gallery.length ? gallery : ['placeholder']).map((image, index) => (
                <span key={`${product.id}-mobile-hint-${image}-${index}`} />
              ))}
            </div>

            <div
              className={`main-product-image ${selectedGalleryImage ? 'gallery-product-image' : ''} ${
                isMockupGalleryImage ? 'mockup-product-image' : ''
              }`}
            >
              <div
                className={`detail-artwork-shell frame-none shape-${productDisplayShape} ${
                  isMockupGalleryImage ? 'mockup-product-shell' : ''
                } ${isFrontMockupGalleryImage ? 'front-product-shell' : ''} ${
                  isSideGalleryImage ? 'side-product-shell' : ''
                }`}
              >
                <div className="detail-artwork-surface">
                  {selectedGalleryImage === product.image ? (
                    <OptimizedCanvasImage
                      className={`detail-artwork-image ${frameClass}`}
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

          <aside className="listing-panel">
            <p className="listing-kicker">Armoze Original</p>
            <h1>{product.title}</h1>
            <p className="listing-price">{formatPrice(selectedUnitPrice)}</p>
            <ProductTrustStrip />
            <p className="listing-description">{product.longDescription}</p>

            <div className="option-group">
              <div className="option-label">
                <span>Framing Options:</span>
                <strong>{selectedFrameName}</strong>
              </div>
              <div className="frame-options">
                {product.frameOptions.map((option, index) => (
                  <button
                    className={index === selectedFrame ? 'selected' : ''}
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSelectedFrame(index);
                      setSelectedImage(0);
                    }}
                    aria-label={`Select ${option.label}`}
                  >
                    <FrameOptionPreview option={option} />
                    <span className="sr-only">{option.label}</span>
                    {formatFramePriceDelta(product, selectedOption, option) ? (
                      <small>{formatFramePriceDelta(product, selectedOption, option)}</small>
                    ) : null}
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
                {product.sizeOptions.map((option, index) => (
                  <button
                    className={index === selectedSize ? 'selected' : ''}
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedSizeId(option.id)}
                  >
                    {option.badge ? <span>{option.badge}</span> : null}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="installment-note">
              Pay in 4 interest-free installments with Stripe-compatible payment methods at checkout.
            </div>

            <LaunchOffer className="product-launch-offer" />

            <button
              className="button button-primary listing-cart-button"
              type="button"
              onClick={addSelectionToCart}
            >
              Add to Cart
            </button>

            <button
              className="button button-secondary listing-cart-button"
              type="button"
              disabled={checkoutState === 'loading'}
              onClick={() => void startBuyNow()}
            >
              {checkoutState === 'loading' ? 'Opening Checkout' : 'Buy Now'}
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

            <div className="product-details-drawer">
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls={`${product.id}-details`}
                onClick={() => setDetailsOpen((open) => !open)}
              >
                <span>Product Details</span>
                <span aria-hidden="true">{detailsOpen ? '-' : '+'}</span>
              </button>
              {detailsOpen ? (
                <div className="product-details-content" id={`${product.id}-details`}>
                  <h2>{product.title}</h2>
                  <p>{product.title} - Armoze canvas art</p>

                  <h3>Canvas Details</h3>
                  <ul>
                    <li>Fully assembled</li>
                    <li>Ready to hang</li>
                    <li>Made to order</li>
                    <li>Premium canvas materials</li>
                    <li>Secure packaging to protect corners and surface quality</li>
                    <li>Processing time: 3-5 business days</li>
                    <li>Shipping time in the US: 5-10 business days</li>
                  </ul>

                  <h3>Artwork Notes</h3>
                  <ul>
                    {product.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </section>

        {relatedProducts.length ? (
          <section className="related-products-section" aria-labelledby="related-products-title">
            <div className="product-section-heading">
              <p className="eyebrow">More to consider</p>
              <h2 id="related-products-title">Related products</h2>
            </div>
            <div className="related-products-grid">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  className="related-product"
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.slug}`}
                >
                  <ProductImage product={relatedProduct} />
                  <span>{relatedProduct.title}</span>
                  <strong>{formatPrice(relatedProduct.priceInCents)}</strong>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="product-proof-section" aria-labelledby="product-proof-title">
          <div className="product-section-heading">
            <p className="eyebrow">What arrives</p>
            <h2 id="product-proof-title">Built to feel finished before it hits the wall.</h2>
          </div>

          <div className="product-proof-grid">
            <article>
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
              <div>
                <h3>Protected from box to wall</h3>
                <p>
                  Each canvas is packed to protect the surface, corners, and back side while it
                  moves through shipping.
                </p>
              </div>
            </article>

            <article>
              <div className="product-proof-image">
                <OptimizedRawImage
                  src="/product-support/canvas-quality-closeup.jpg"
                  alt="Close-up of canvas print texture and wrapped canvas edge"
                  aspectRatio="4 / 3"
                  sizes="(max-width: 760px) 92vw, 50vw"
                  fill
                />
              </div>
              <div>
                <h3>Texture you can actually see</h3>
                <p>
                  A close-up look at the woven canvas surface, wrapped edge, and sturdy print
                  construction.
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
