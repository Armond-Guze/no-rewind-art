'use client';

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import type { HomepageHeroImage, HomepageSettings, Product } from '../../data/products';
import { etsyReviewHighlights } from '../../data/reviews';
import {
  formatPrice,
  supportEmail,
  supportMailto,
} from './product-utils';
import { GoogleCustomerReviewsOptIn } from './GoogleCustomerReviewsOptIn';
import { OptimizedRawImage, ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { useUrlSearchParam } from './url-search';

const heroWordPool = ['present', 'driven', 'focused', 'steady', 'bold'];
const newArrivalsMobileReelCount = 2;

type HomepageMediaItem =
  | {
      type: 'image';
      id: string;
      image: HomepageHeroImage;
      product?: Product;
    }
  | {
      type: 'product';
      id: string;
      product: Product;
    };

type HeroShowcaseSlide =
  | {
      type: 'image';
      id: string;
      image: HomepageHeroImage;
      keyword: string;
    }
  | {
      type: 'product';
      id: string;
      product: Product;
      keyword: string;
    };

type BestSellersCarouselItem = {
  item: HomepageMediaItem;
  key: string;
  clone: boolean;
  realStart: boolean;
};


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
  className,
  interactive = true,
  realStart = false,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
  interactive?: boolean;
  realStart?: boolean;
}) {
  return (
    <article
      aria-hidden={interactive ? undefined : true}
      className={['product', className].filter(Boolean).join(' ')}
      data-carousel-real-start={realStart ? 'true' : undefined}
    >
      <Link
        className="product-image-link"
        href={`/products/${product.slug}`}
        tabIndex={interactive ? undefined : -1}
      >
        <ProductImage product={product} priority={priority} />
      </Link>
      <div className="product-copy">
        <div className="product-title-row">
          <h3>
            <Link href={`/products/${product.slug}`} tabIndex={interactive ? undefined : -1}>
              {product.title}
            </Link>
          </h3>
        </div>
        <div className="product-card-meta">
          <strong>{formatPrice(product.priceInCents)}</strong>
        </div>
      </div>
    </article>
  );
}

function optimizeSanityImageUrl(url: string, width: number, quality = 78) {
  if (!/^https:\/\/cdn\.sanity\.io\//i.test(url)) {
    return url;
  }

  const optimized = new URL(url);
  optimized.searchParams.set('auto', 'format');
  optimized.searchParams.set('w', String(width));
  optimized.searchParams.set('q', String(quality));
  return optimized.toString();
}

function getHomepageImageProductHref(image: HomepageHeroImage) {
  return image.productSlug ? `/products/${image.productSlug}` : undefined;
}

function getHomepageImageLinkLabel(image: HomepageHeroImage, fallback: string) {
  return image.productTitle ? `View ${image.productTitle}` : fallback;
}

function HomeImageCard({
  image,
  product,
  priority = false,
  className,
  interactive = true,
  realStart = false,
  showProductOverlay = false,
}: {
  image: HomepageHeroImage;
  product?: Product;
  priority?: boolean;
  className?: string;
  interactive?: boolean;
  realStart?: boolean;
  showProductOverlay?: boolean;
}) {
  const href = product ? `/products/${product.slug}` : getHomepageImageProductHref(image);
  const overlayProduct = showProductOverlay ? product : undefined;
  const imageElement = (
    <img
      alt={image.alt || 'Armoze artwork preview'}
      decoding="async"
      height={image.height || undefined}
      loading={priority ? 'eager' : 'lazy'}
      src={optimizeSanityImageUrl(image.url, 1200)}
      width={image.width || undefined}
    />
  );

  return (
    <article
      aria-hidden={interactive ? undefined : true}
      className={['product homepage-image-card', className].filter(Boolean).join(' ')}
      data-carousel-real-start={realStart ? 'true' : undefined}
    >
      {href ? (
        <Link
          aria-label={getHomepageImageLinkLabel(image, 'View featured product')}
          className="product-image-link homepage-image-card-media"
          href={href}
          tabIndex={interactive ? undefined : -1}
        >
          {imageElement}
        </Link>
      ) : (
        <div className="product-image-link homepage-image-card-media">
          {imageElement}
        </div>
      )}
      {overlayProduct ? (
        <Link
          aria-label={`View ${overlayProduct.title}`}
          className="product-copy homepage-image-product-copy"
          href={`/products/${overlayProduct.slug}`}
          tabIndex={interactive ? undefined : -1}
        >
          <div className="product-title-row">
            <h3>
              {overlayProduct.title}
            </h3>
          </div>
          <div className="product-card-meta">
            <strong>{formatPrice(overlayProduct.priceInCents)}</strong>
          </div>
        </Link>
      ) : null}
    </article>
  );
}

function HomeMediaCard({
  item,
  priority = false,
  className,
  interactive = true,
  realStart = false,
  showImageProductOverlay = false,
}: {
  item: HomepageMediaItem;
  priority?: boolean;
  className?: string;
  interactive?: boolean;
  realStart?: boolean;
  showImageProductOverlay?: boolean;
}) {
  if (item.type === 'image') {
    return (
      <HomeImageCard
        className={className}
        image={item.image}
        interactive={interactive}
        product={item.product}
        priority={priority}
        realStart={realStart}
        showProductOverlay={showImageProductOverlay}
      />
    );
  }

  return (
    <HomeProductCard
      className={className}
      interactive={interactive}
      priority={priority}
      product={item.product}
      realStart={realStart}
    />
  );
}

function BestSellersCarousel({
  className,
  items,
}: {
  className?: string;
  items: HomepageMediaItem[];
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const hasEdgePeek = items.length > 1;
  const carouselItems: BestSellersCarouselItem[] = hasEdgePeek
    ? [
        {
          item: items[items.length - 1],
          key: `leading-${items[items.length - 1].id}`,
          clone: true,
          realStart: false,
        },
        ...items.map((item, index) => ({
          item,
          key: `real-${index}-${item.id}`,
          clone: false,
          realStart: index === 0,
        })),
        {
          item: items[0],
          key: `trailing-${items[0].id}`,
          clone: true,
          realStart: false,
        },
      ]
    : items.map((item, index) => ({
        item,
        key: `real-${index}-${item.id}`,
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
  }, [hasEdgePeek, items]);

  return (
    <div
      className={[
        'product-grid best-sellers-carousel',
        hasEdgePeek ? 'has-edge-peek' : undefined,
        className,
      ].filter(Boolean).join(' ')}
      ref={carouselRef}
    >
      {carouselItems.map(({ clone, item, key, realStart }) => (
        <HomeMediaCard
          className={clone ? 'best-sellers-edge-clone' : undefined}
          interactive={!clone}
          item={item}
          key={key}
          priority={false}
          realStart={realStart}
          showImageProductOverlay
        />
      ))}
    </div>
  );
}

function getHomepageMediaItemOrderKey(item: HomepageMediaItem) {
  if (item.type === 'image') {
    return item.image.productSlug || item.image.url;
  }

  return item.product.slug || item.product.id;
}

function keepOrderedUniqueNeighbors(items: HomepageMediaItem[]) {
  const orderedItems: HomepageMediaItem[] = [];

  items.forEach((item) => {
    const lastItem = orderedItems[orderedItems.length - 1];

    if (lastItem && getHomepageMediaItemOrderKey(lastItem) === getHomepageMediaItemOrderKey(item)) {
      return;
    }

    orderedItems.push(item);
  });

  while (
    orderedItems.length > 1 &&
    getHomepageMediaItemOrderKey(orderedItems[0]) === getHomepageMediaItemOrderKey(orderedItems[orderedItems.length - 1])
  ) {
    orderedItems.pop();
  }

  return orderedItems;
}

function NewArrivalsMobileShowcase({ items }: { items: HomepageMediaItem[] }) {
  const orderedItems = keepOrderedUniqueNeighbors(items);
  const reelIndexes = Array.from({ length: newArrivalsMobileReelCount }, (_, index) => index);
  const trackStyle = {
    '--new-arrivals-mobile-loop-shift': `-${100 / newArrivalsMobileReelCount}%`,
  } as CSSProperties;

  if (!orderedItems.length) {
    return null;
  }

  return (
    <div
      className="new-arrivals-mobile-showcase"
      aria-label="New arrivals artwork preview"
    >
      <div className="new-arrivals-mobile-viewport">
        <div className="new-arrivals-mobile-track" style={trackStyle}>
          {reelIndexes.map((reelIndex) => (
            <div
              aria-hidden={reelIndex > 0 ? true : undefined}
              className="new-arrivals-mobile-reel"
              key={reelIndex}
            >
              {orderedItems.map((item, index) => {
                const className = `new-arrivals-mobile-slide new-arrivals-mobile-slide-${(index % 3) + 1}`;
                const key = `${reelIndex}-${index}-${item.id}`;
                const ariaHidden = reelIndex > 0 ? true : undefined;
                const loading = 'lazy';

                if (item.type === 'image') {
                  const { image } = item;
                  const imageElement = (
                    <img
                      alt={reelIndex > 0 ? '' : image.alt || 'Armoze new arrivals artwork'}
                      height={image.height || undefined}
                      loading={loading}
                      src={optimizeSanityImageUrl(image.url, 600)}
                      width={image.width || undefined}
                    />
                  );

                  return (
                    <div aria-hidden={ariaHidden} className={className} key={key}>
                      {imageElement}
                    </div>
                  );
                }

                return (
                  <div
                    aria-hidden={ariaHidden}
                    className={className}
                    key={key}
                  >
                    <ProductImage product={item.product} loading={loading} />
                  </div>
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
        {mobileImage?.url ? (
          <source
            media="(max-width: 760px)"
            srcSet={`${optimizeSanityImageUrl(mobileImage.url, 828)} 828w, ${optimizeSanityImageUrl(mobileImage.url, 1170)} 1170w`}
            sizes="100vw"
          />
        ) : null}
        {desktopImage?.url ? <source media="(min-width: 761px)" srcSet={optimizeSanityImageUrl(desktopImage.url, 1920)} /> : null}
        <img
          src={optimizeSanityImageUrl(fallbackImage.url, 1920)}
          alt={fallbackAlt}
          width={fallbackImage.width || undefined}
          height={fallbackImage.height || undefined}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </div>
  );
}

export default function HomePageClient({
  allProducts,
  checkoutResult: initialCheckoutResult,
  featuredProducts,
  newArrivalProducts,
  heroProducts,
  homepageSettings,
}: {
  allProducts: Product[];
  checkoutResult?: string;
  featuredProducts: Product[];
  newArrivalProducts: Product[];
  heroProducts: Product[];
  homepageSettings?: HomepageSettings;
}) {
  const queryCheckoutResult = useUrlSearchParam('checkout');
  const checkoutResult = initialCheckoutResult ?? queryCheckoutResult ?? undefined;
  const heroSlideshowImages = homepageSettings?.heroSlideshowImages;
  const homepageBestSellerImages = homepageSettings?.bestSellerImages;
  const homepageBestSellerMobileImages = homepageSettings?.bestSellerMobileImages;
  const homepageNewArrivalImages = homepageSettings?.newArrivalImages;
  const homepageNewArrivalMobileImages = homepageSettings?.newArrivalMobileImages;
  const productsBySlug = useMemo(() => {
    return new Map(allProducts.map((product) => [product.slug, product]));
  }, [allProducts]);
  const getLinkedImageProduct = useCallback(
    (image: HomepageHeroImage) => (image.productSlug ? productsBySlug.get(image.productSlug) : undefined),
    [productsBySlug],
  );
  const heroSlides = useMemo<HeroShowcaseSlide[]>(() => {
    const heroImageSlides = heroSlideshowImages
      ?.filter((image) => image.url)
      .slice(0, 5)
      .map((image, index) => ({
        type: 'image' as const,
        id: `${image.url}-${index}`,
        image,
        keyword: heroWordPool[index % heroWordPool.length],
      }));

    if (heroImageSlides?.length) {
      return heroImageSlides;
    }

    const productsWithImages = heroProducts.filter((product) => product.image);
    const slideProducts = productsWithImages.length ? productsWithImages : heroProducts;
    const usedKeywords = new Set<string>();

    return slideProducts.slice(0, 5).map((product, index) => {
      const keyword =
        [...getHeroKeywordCandidates(product, index), ...heroWordPool].find(
          (candidate) => !usedKeywords.has(candidate),
        ) ?? heroWordPool[index % heroWordPool.length];

      usedKeywords.add(keyword);

      return {
        type: 'product' as const,
        id: product.id,
        product,
        keyword,
      };
    });
  }, [heroSlideshowImages, heroProducts]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const activeHeroSlideIndex = heroSlides.length ? activeHeroIndex % heroSlides.length : 0;
  const activeHeroSlide = heroSlides[activeHeroSlideIndex];
  const hasHomepageMobileHeroMedia = Boolean(homepageSettings?.heroMobileImage?.url);
  const hasHomepageDesktopHeroMedia = Boolean(homepageSettings?.heroDesktopImage?.url);
  const hasHeroSlideshowImages = heroSlides.some((slide) => slide.type === 'image');
  const hasHomepageHeroMedia =
    !hasHeroSlideshowImages && (hasHomepageMobileHeroMedia || hasHomepageDesktopHeroMedia);
  const bestSellerGridImages = useMemo(
    () => homepageBestSellerImages?.filter((image) => image.url).slice(0, 8) ?? [],
    [homepageBestSellerImages],
  );
  const bestSellerMobileImages = useMemo(
    () => (homepageBestSellerMobileImages?.length ? homepageBestSellerMobileImages : homepageBestSellerImages)
      ?.filter((image) => image.url)
      .slice(0, 8) ?? [],
    [homepageBestSellerImages, homepageBestSellerMobileImages],
  );
  const newArrivalGridImages = useMemo(
    () => homepageNewArrivalImages?.filter((image) => image.url).slice(0, 4) ?? [],
    [homepageNewArrivalImages],
  );
  const bestSellerGridItems = useMemo<HomepageMediaItem[]>(
    () => {
      if (bestSellerGridImages.length) {
        return bestSellerGridImages.map((image, index) => ({
          type: 'image' as const,
          id: `${image.url}-${index}`,
          image,
          product: getLinkedImageProduct(image),
        }));
      }

      return featuredProducts.map((product) => ({
        type: 'product' as const,
        id: product.id,
        product,
      }));
    },
    [bestSellerGridImages, featuredProducts, getLinkedImageProduct],
  );
  const bestSellerMobileItems = useMemo<HomepageMediaItem[]>(
    () => bestSellerMobileImages.map((image, index) => ({
      type: 'image' as const,
      id: `${image.url}-${index}`,
      image,
      product: getLinkedImageProduct(image),
    })),
    [bestSellerMobileImages, getLinkedImageProduct],
  );
  const newArrivalShowcaseItems = useMemo<HomepageMediaItem[]>(
    () => {
      const uploadedImages = (homepageNewArrivalMobileImages?.length
        ? homepageNewArrivalMobileImages
        : homepageNewArrivalImages
      )
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
    [homepageNewArrivalImages, homepageNewArrivalMobileImages, newArrivalProducts],
  );
  const heroGalleryClassName = [
    'storefront-hero-gallery',
    hasHomepageHeroMedia && hasHomepageMobileHeroMedia ? 'has-mobile-hero-media' : undefined,
    hasHomepageHeroMedia && hasHomepageDesktopHeroMedia ? 'has-desktop-hero-media' : undefined,
  ].filter(Boolean).join(' ');
  const nextHeroSlideIndex = heroSlides.length
    ? (activeHeroSlideIndex + 1) % heroSlides.length
    : 0;
  const renderedHeroSlides =
    hasHomepageMobileHeroMedia && hasHomepageDesktopHeroMedia
      ? []
      : heroSlides
          .map((slide, index) => ({ slide, index }))
          .filter(({ index }) => index === activeHeroSlideIndex || index === nextHeroSlideIndex);

  useEffect(() => {
    if (heroSlides.length <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // The mobile hero shows a static image: rotating the hidden slideshow
    // re-renders the page every 5s and makes scrolling stutter.
    if (
      hasHomepageHeroMedia &&
      hasHomepageMobileHeroMedia &&
      window.matchMedia('(max-width: 760px)').matches
    ) {
      return;
    }

    const slideTimer = window.setInterval(() => {
      setActiveHeroIndex((index) => (index + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(slideTimer);
  }, [heroSlides.length, hasHomepageHeroMedia, hasHomepageMobileHeroMedia]);

  const storyRoomProduct = allProducts.find((product) => product.slug === 'bookshelf');
  const storyRoomImage =
    storyRoomProduct?.gallery?.[3] ?? storyRoomProduct?.gallery?.[2] ?? storyRoomProduct?.image ?? '';

  return (
    <StorefrontShell products={allProducts}>
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
                <em className="storefront-hero-keyword" key={activeHeroSlide?.id ?? 'refined'}>
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
            {renderedHeroSlides.map(({ slide, index }) => {
              const className = `storefront-hero-art storefront-hero-art-${index + 1}${
                slide.type === 'image' ? ' storefront-hero-image-slide' : ''
              }${index === activeHeroSlideIndex ? ' is-active' : ''}`;

              if (slide.type === 'image') {
                const href = getHomepageImageProductHref(slide.image);
                const imageElement = (
                  <img
                    alt={slide.image.alt || 'Armoze featured artwork'}
                    decoding="async"
                    height={slide.image.height || undefined}
                    loading={!hasHomepageHeroMedia && index === activeHeroSlideIndex ? 'eager' : 'lazy'}
                    src={optimizeSanityImageUrl(slide.image.url, 1600)}
                    width={slide.image.width || undefined}
                  />
                );

                return href ? (
                  <Link
                    aria-label={getHomepageImageLinkLabel(slide.image, 'View featured product')}
                    aria-hidden={index === activeHeroSlideIndex ? undefined : true}
                    className={className}
                    href={href}
                    key={slide.id}
                    tabIndex={index === activeHeroSlideIndex ? undefined : -1}
                  >
                    {imageElement}
                  </Link>
                ) : (
                  <div
                    aria-hidden={index === activeHeroSlideIndex ? undefined : true}
                    className={className}
                    key={slide.id}
                  >
                    {imageElement}
                  </div>
                );
              }

              return (
                <Link
                  className={className}
                  key={slide.id}
                  href={`/products/${slide.product.slug}`}
                  aria-hidden={index === activeHeroSlideIndex ? undefined : true}
                  tabIndex={index === activeHeroSlideIndex ? undefined : -1}
                >
                  <ProductImage
                    product={slide.product}
                    priority={!hasHomepageHeroMedia && index === activeHeroSlideIndex}
                  />
                  <span>{slide.product.title}</span>
                </Link>
              );
            })}
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

          <BestSellersCarousel
            className={bestSellerMobileItems.length ? 'has-mobile-image-overrides' : undefined}
            items={bestSellerGridItems}
          />

          {bestSellerMobileItems.length ? (
            <BestSellersCarousel
              className="best-sellers-mobile-image-carousel"
              items={bestSellerMobileItems}
            />
          ) : null}
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
          <div className="storefront-story-visual">
            {storyRoomImage ? (
              <OptimizedRawImage
                src={storyRoomImage}
                alt="Armoze canvas print hanging above a desk in a focused workspace"
                aspectRatio="1 / 1"
                sizes="(max-width: 900px) 92vw, 560px"
              />
            ) : null}
            <div className="storefront-story-visual-caption" aria-label="Armoze canvas details">
              <span>Made to order</span>
              <span>Ready to hang</span>
            </div>
          </div>
        </section>

        <section className="storefront-social-proof" aria-labelledby="storefront-social-proof-title">
          <div className="storefront-social-proof-heading">
            <p className="eyebrow">Customer feedback</p>
            <h2 id="storefront-social-proof-title">Reviews</h2>
            <p>Feedback shared by customers who purchased through our Etsy shop.</p>
            <span className="storefront-social-proof-source">Source: Armoze Etsy shop</span>
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

          <div className="product-grid new-arrivals-grid">
            {newArrivalGridImages.length
              ? newArrivalGridImages.map((image, index) => (
                <HomeImageCard
                  image={image}
                  key={`${image.url}-${index}`}
                  priority={false}
                />
              ))
              : newArrivalProducts.map((product) => (
                <HomeProductCard
                  key={product.id}
                  product={product}
                  priority={false}
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

        <section className="storefront-bottom-slideshow" aria-label="New arrivals artwork preview">
          <NewArrivalsMobileShowcase items={newArrivalShowcaseItems} />
        </section>
      </main>
    </StorefrontShell>
  );
}
