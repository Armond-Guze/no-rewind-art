'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import type { HomepageHeroImage, HomepageSettings, Product } from '../../data/products';
import {
  formatPrice,
  supportEmail,
  supportMailto,
} from './product-utils';
import { GoogleCustomerReviewsOptIn } from './GoogleCustomerReviewsOptIn';
import { ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { useUrlSearchParam } from './url-search';

const heroWordPool = ['present', 'driven', 'focused', 'steady', 'bold'];

type NewArrivalsShowcaseItem =
  | {
      type: 'image';
      id: string;
      image: HomepageHeroImage;
    }
  | {
      type: 'product';
      id: string;
      product: Product;
    };

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
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <article className="product">
      <Link className="product-image-link" href={`/products/${product.slug}`}>
        <ProductImage product={product} priority={priority} />
      </Link>
      <div className="product-copy">
        <span className="product-card-thumb" aria-hidden="true">
          <ProductImage product={product} />
        </span>
        <div className="product-title-row">
          <h3>
            <Link href={`/products/${product.slug}`}>{product.title}</Link>
          </h3>
        </div>
        <div className="product-card-meta">
          <strong>{formatPrice(product.priceInCents)}</strong>
        </div>
      </div>
    </article>
  );
}

function NewArrivalsMobileShowcase({ items }: { items: NewArrivalsShowcaseItem[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="new-arrivals-mobile-showcase" aria-label="New arrivals artwork preview">
      <div className="new-arrivals-mobile-viewport">
        <div className="new-arrivals-mobile-track">
          {[0, 1].map((reelIndex) => (
            <div
              aria-hidden={reelIndex === 1 ? true : undefined}
              className="new-arrivals-mobile-reel"
              key={reelIndex}
            >
              {items.map((item, index) => {
                const className = `new-arrivals-mobile-slide new-arrivals-mobile-slide-${(index % 3) + 1}`;
                const key = `${reelIndex}-${item.id}`;

                if (item.type === 'image') {
                  const { image } = item;

                  return (
                    <div className={className} key={key}>
                      <img
                        alt={reelIndex === 1 ? '' : image.alt || 'Armoze new arrivals artwork'}
                        height={image.height || undefined}
                        loading={reelIndex === 0 && index === 0 ? 'eager' : 'lazy'}
                        src={image.url}
                        width={image.width || undefined}
                      />
                    </div>
                  );
                }

                return (
                  <Link
                    aria-label={`View ${item.product.title}`}
                    className={className}
                    href={`/products/${item.product.slug}`}
                    key={key}
                    tabIndex={reelIndex === 1 ? -1 : undefined}
                  >
                    <ProductImage product={item.product} />
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StorefrontHeroMedia({
  mobileImage,
  desktopImage,
}: {
  mobileImage?: HomepageHeroImage;
  desktopImage?: HomepageHeroImage;
}) {
  const fallbackImage = desktopImage ?? mobileImage;

  if (!fallbackImage?.url) {
    return null;
  }

  const fallbackAlt = fallbackImage.alt || mobileImage?.alt || desktopImage?.alt || 'Armoze room mockup';
  const className = [
    'storefront-hero-art',
    'storefront-hero-media-frame',
    'is-active',
    mobileImage?.url ? 'has-mobile-image' : undefined,
    desktopImage?.url ? 'has-desktop-image' : undefined,
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <picture className="storefront-hero-media">
        {mobileImage?.url ? <source media="(max-width: 760px)" srcSet={mobileImage.url} /> : null}
        {desktopImage?.url ? <source media="(min-width: 761px)" srcSet={desktopImage.url} /> : null}
        <img
          src={fallbackImage.url}
          alt={fallbackAlt}
          width={fallbackImage.width || undefined}
          height={fallbackImage.height || undefined}
          loading="eager"
        />
      </picture>
    </div>
  );
}

export default function HomePageClient({
  checkoutResult: initialCheckoutResult,
  featuredProducts,
  newArrivalProducts,
  heroProducts,
  homepageSettings,
}: {
  checkoutResult?: string;
  featuredProducts: Product[];
  newArrivalProducts: Product[];
  heroProducts: Product[];
  homepageSettings?: HomepageSettings;
}) {
  const queryCheckoutResult = useUrlSearchParam('checkout');
  const checkoutResult = initialCheckoutResult ?? queryCheckoutResult ?? undefined;
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
  const hasHomepageMobileHeroMedia = Boolean(homepageSettings?.heroMobileImage?.url);
  const hasHomepageDesktopHeroMedia = Boolean(homepageSettings?.heroDesktopImage?.url);
  const hasHomepageHeroMedia = hasHomepageMobileHeroMedia || hasHomepageDesktopHeroMedia;
  const newArrivalShowcaseItems = useMemo<NewArrivalsShowcaseItem[]>(
    () => {
      const uploadedImages = homepageSettings?.newArrivalMobileImages
        ?.filter((image) => image.url)
        .slice(0, 5)
        .map((image, index) => ({
          type: 'image' as const,
          id: `${image.url}-${index}`,
          image,
        }));

      if (uploadedImages?.length) {
        return uploadedImages;
      }

      return newArrivalProducts
        .filter((product) => product.image)
        .slice(0, 5)
        .map((product) => ({
          type: 'product' as const,
          id: product.id,
          product,
        }));
    },
    [homepageSettings?.newArrivalMobileImages, newArrivalProducts],
  );
  const heroGalleryClassName = [
    'storefront-hero-gallery',
    hasHomepageMobileHeroMedia ? 'has-mobile-hero-media' : undefined,
    hasHomepageDesktopHeroMedia ? 'has-desktop-hero-media' : undefined,
  ].filter(Boolean).join(' ');

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
          </div>

          <div className={heroGalleryClassName} aria-label="Featured artwork">
            {hasHomepageHeroMedia ? (
              <StorefrontHeroMedia
                mobileImage={homepageSettings?.heroMobileImage}
                desktopImage={homepageSettings?.heroDesktopImage}
              />
            ) : null}
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

          <div className="product-grid best-sellers-carousel">
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
              <span>Built for <em>focus.</em></span>
            </h2>
            <p>
              Ready-to-hang canvas prints for bedrooms, offices, studios, and focused spaces.
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
            <h2 id="storefront-social-proof-title">Reviews</h2>
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

          <NewArrivalsMobileShowcase items={newArrivalShowcaseItems} />

          <div className="product-grid">
            {newArrivalProducts.map((product, index) => (
              <HomeProductCard
                key={product.id}
                product={product}
                priority={index < 2}
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
