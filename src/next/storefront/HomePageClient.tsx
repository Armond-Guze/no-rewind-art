'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Star } from 'lucide-react';
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

const etsyReviewHighlights = [
  {
    name: 'Lorie',
    date: 'May 11, 2025',
    rating: 5,
    detail: 'Size: 24 x 18 | Style: No Frame',
    quote:
      "This cool piece just arrived & from the moment we opened it - we loved it. It's going to be such a nice addition to our rec room. I love the nostalgia aspect & the inspirational quote. It was shipped rather quickly & is just what we hoped it would be.",
  },
  {
    name: 'Davis',
    date: 'Jan 31, 2025',
    rating: 5,
    detail: 'Size: 24 x 18 | Style: Black Frame',
    quote: 'This has great resolution and is perfect in our retro themed office',
  },
  {
    name: 'Alex',
    date: 'Jan 19, 2025',
    rating: 5,
    detail: 'Size: 16 x 12 | Style: Black Frame',
    quote: 'Great picture for small home or wall!',
  },
  {
    name: 'Michelle',
    date: 'Sep 18, 2024',
    rating: 5,
    detail: 'Size: 48 x 32 | Style: Black Frame',
    quote: 'Item was perfect and exactly how it was described',
  },
  {
    name: 'Amanda',
    date: 'Jul 23, 2024',
    rating: 5,
    detail: 'Etsy verified purchase',
    quote: 'Looks amazing in our passport office',
  },
  {
    name: 'Nicolas',
    date: 'Dec 19, 2022',
    rating: 5,
    detail: 'Style: Black Frame | Size: 36 x 24',
    quote: 'Great quality and frame. Print is very clear and arrived very quickly and well packaged.',
  },
];

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

        <section className="storefront-story-cta" aria-labelledby="storefront-story-title">
          <div className="storefront-story-copy">
            <p className="eyebrow">Why Armoze</p>
            <h2 id="storefront-story-title">
              <span>Made for rooms where you <em>lock in.</em></span>
            </h2>
            <p>
              Made-to-order canvas prints for bedrooms, offices, studios, gyms, and creative spaces.
              Sharp wall pieces built to push focus, ambition, and daily momentum.
            </p>
            <Link className="button button-primary" href="/collections/best-sellers">
              Shop the Collection
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="storefront-story-points" aria-label="Armoze canvas details">
            <span>Made to order</span>
            <span>Ready to hang</span>
            <span>Built for focused spaces</span>
          </div>
        </section>

        <section className="storefront-social-proof" aria-labelledby="storefront-social-proof-title">
          <div className="storefront-social-proof-heading">
            <p className="eyebrow">What Etsy buyers said</p>
            <h2 id="storefront-social-proof-title">Proof from the first run.</h2>
            <p>
              Before Armoze.com, the work sold on Etsy as Mantality: 115 sales, a 4.7 average,
              and 23 buyer reviews.
            </p>
            <span className="storefront-social-proof-source">Originally reviewed on Etsy</span>
          </div>

          <div className="storefront-review-carousel" aria-label="Etsy buyer reviews">
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
