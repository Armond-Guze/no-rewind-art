'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { addStoredCartItem } from '../../cart';
import type { Product } from '../../data/products';
import {
  formatPrice,
  getBaseFrameOption,
  getBaseSizeOption,
  getConfiguredUnitPrice,
  supportEmail,
  supportMailto,
} from './product-utils';
import { getProductTrackingItem, trackStorefrontEvent } from './analytics';
import { GoogleCustomerReviewsOptIn } from './GoogleCustomerReviewsOptIn';
import { ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

const heroWordPool = ['present', 'driven', 'focused', 'steady', 'bold'];

function getHeroKeywordCandidates(product: Product, index: number) {
  const productText = `${product.title} ${product.description} ${product.tone}`.toLowerCase();

  if (/(money|rubber|paycheck|cash|bank|million|rent|vault|dollar)/.test(productText)) {
    return ['driven', 'bold', 'focused'];
  }

  if (/(life|rewind|clock|time|\bmoment\b)/.test(productText)) {
    return ['present', 'steady', 'bold'];
  }

  if (/(book|study|focus|learn|creative)/.test(productText)) {
    return ['focused', 'steady', 'driven'];
  }

  if (/(calm|pressure)/.test(productText)) {
    return ['steady', 'focused', 'present'];
  }

  if (/(stairs|discipline|97|to do|keep going|daily)/.test(productText)) {
    return ['focused', 'driven', 'bold'];
  }

  return [heroWordPool[index % heroWordPool.length]];
}

function HomeProductCard({
  product,
  priority = false,
  showDescription = true,
}: {
  product: Product;
  priority?: boolean;
  showDescription?: boolean;
}) {
  function quickAdd() {
    const sizeOption = getBaseSizeOption(product);
    const frameOption = getBaseFrameOption(product);

    addStoredCartItem({
      productId: product.id,
      sizeId: sizeOption.id,
      frameId: frameOption.id,
      quantity: 1,
    });
    trackStorefrontEvent('add_to_cart', {
      currency: 'USD',
      value: getConfiguredUnitPrice(product, sizeOption, frameOption) / 100,
      items: [getProductTrackingItem(product, sizeOption, frameOption)],
    });
  }

  return (
    <article className="product">
      <Link className="product-image-link" href={`/products/${product.slug}`}>
        <ProductImage product={product} priority={priority} />
      </Link>
      <div className="product-copy">
        <div className="product-title-row">
          <div>
            <h3>
              <Link href={`/products/${product.slug}`}>{product.title}</Link>
            </h3>
          </div>
          <strong>{formatPrice(product.priceInCents)}</strong>
        </div>
        {showDescription ? <p>{product.description}</p> : null}
        <div className="product-actions">
          <Link className="text-action" href={`/products/${product.slug}`}>
            View Details
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
          <button className="text-action" type="button" onClick={quickAdd}>
            Add to Cart
            <Plus aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function HomePageClient({
  checkoutResult,
  featuredProducts,
  newArrivalProducts,
  heroProducts,
}: {
  checkoutResult?: string;
  featuredProducts: Product[];
  newArrivalProducts: Product[];
  heroProducts: Product[];
}) {
  useEffect(() => {
    if (checkoutResult !== 'success') {
      return;
    }

    const trackingKey = 'armoze_purchase_return_tracked';

    if (window.sessionStorage.getItem(trackingKey) === '1') {
      return;
    }

    trackStorefrontEvent('purchase', { currency: 'USD' });
    window.sessionStorage.setItem(trackingKey, '1');
  }, [checkoutResult]);

  const heroSlides = useMemo(() => {
    const productsWithImages = heroProducts.filter((product) => product.image);
    const slideProducts = productsWithImages.length ? productsWithImages : heroProducts;
    const usedKeywords = new Set<string>();

    return slideProducts.slice(0, 5).map((product, index) => {
      const keyword =
        [...getHeroKeywordCandidates(product, index), ...heroWordPool].find(
          (candidate) => !usedKeywords.has(candidate),
        ) ?? heroWordPool[index % heroWordPool.length];

      usedKeywords.add(keyword);

      return { product, keyword };
    });
  }, [heroProducts]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const activeHeroSlideIndex = heroSlides.length ? activeHeroIndex % heroSlides.length : 0;
  const activeHeroSlide = heroSlides[activeHeroSlideIndex];

  useEffect(() => {
    if (heroSlides.length <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const slideTimer = window.setInterval(() => {
      setActiveHeroIndex((index) => (index + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(slideTimer);
  }, [heroSlides.length]);

  return (
    <StorefrontShell>
      <StorefrontTracker />
      <GoogleCustomerReviewsOptIn checkoutResult={checkoutResult} />
      <main id="top" className="home-page storefront-home">
        {checkoutResult === 'success' ? (
          <div className="checkout-banner success">
            <span>Payment complete. Your order is being prepared.</span>
            <Link href="/account">View order history</Link>
          </div>
        ) : null}

        {checkoutResult === 'cancelled' ? (
          <div className="checkout-banner cancelled">
            Checkout was cancelled. Your cart is still here when you are ready.
          </div>
        ) : null}

        <section className="storefront-hero" aria-labelledby="storefront-title">
          <div className="storefront-hero-copy">
            <p className="eyebrow">Armoze canvas prints</p>
            <h1 id="storefront-title">
              <span>Art for the </span>
              <span>
                <em className="storefront-hero-keyword" key={activeHeroSlide?.product.id ?? 'refined'}>
                  {activeHeroSlide?.keyword ?? 'refined'}.
                </em>
              </span>
            </h1>
            <p>Ready to hang. Built for focus.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/collections/best-sellers">
                Shop Best Sellers
                <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
              <Link className="button button-secondary" href="/collections/new-arrivals">
                New Arrivals
              </Link>
            </div>
            <div className="storefront-proof-row" aria-label="Store benefits">
              <span>Made to order</span>
              <span>Canvas prints</span>
              <span>Free U.S. shipping</span>
            </div>
          </div>

          <div className="storefront-hero-gallery" aria-label="Featured artwork">
            {heroSlides.map(({ product }, index) => (
              <Link
                className={`storefront-hero-art storefront-hero-art-${index + 1}${
                  index === activeHeroSlideIndex ? ' is-active' : ''
                }`}
                key={product.id}
                href={`/products/${product.slug}`}
                aria-hidden={index === activeHeroSlideIndex ? undefined : true}
                tabIndex={index === activeHeroSlideIndex ? undefined : -1}
              >
                <ProductImage product={product} priority={index === 0} />
                <span>{product.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="shop" className="section shop-section storefront-shop-section">
          <div className="section-heading">
            <div>
              <h2>Best sellers</h2>
              <p className="storefront-section-subcopy">Shop our best</p>
            </div>
            <Link className="section-link" href="/collections/best-sellers">
              View All
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>

          <div className="product-grid">
            {featuredProducts.map((product, index) => (
              <HomeProductCard
                key={product.id}
                product={product}
                priority={index < 2}
              />
            ))}
          </div>
        </section>

        <section className="storefront-quote-cta" aria-labelledby="storefront-quote-title">
          <p className="eyebrow">Made for momentum</p>
          <h2 id="storefront-quote-title">
            <span>Made for those who <em>build.</em></span>
          </h2>
          <p className="storefront-quote-copy">
            Canvas prints for focused, ambitious rooms.
          </p>
          <Link className="button button-primary" href="/collections/best-sellers">
            Shop Best Sellers
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </section>

        <section className="section shop-section storefront-shop-section new-arrivals-preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fresh artwork</p>
              <h2>New arrivals.</h2>
            </div>
            <Link className="section-link" href="/collections/new-arrivals">
              View Drop
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>

          <div className="product-grid">
            {newArrivalProducts.map((product, index) => (
              <HomeProductCard
                key={product.id}
                product={product}
                priority={index < 2}
                showDescription={false}
              />
            ))}
          </div>
        </section>

        <section id="support" className="storefront-help-strip" aria-label="Shop support">
          <span>Customer support</span>
          <Link href="/support">Get Help</Link>
          <a href={supportMailto}>{supportEmail}</a>
          <small>Replies within 1 business day</small>
        </section>
      </main>
    </StorefrontShell>
  );
}
