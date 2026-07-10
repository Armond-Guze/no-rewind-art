'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { Collection, Product } from '../../data/products';
import {
  formatPrice,
  getDisplayArtworkShape,
} from './product-utils';
import { OptimizedRawImage, ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

const collectionNavItems = [
  { slug: 'best-sellers', label: 'Best Sellers' },
  { slug: 'discipline-focus', label: 'Motivational' },
  { slug: 'new-arrivals', label: 'New Arrivals' },
];

const shapeFilters = [
  { id: 'all', label: 'All' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'square', label: 'Square' },
] as const;

type ShapeFilter = (typeof shapeFilters)[number]['id'];
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'title';

function getCardBadge(product: Product) {
  if (product.collectionSlugs.includes('best-sellers')) {
    return 'Best Seller';
  }

  if (product.collectionSlugs.includes('new-arrivals')) {
    return 'New';
  }

  return null;
}

function getHoverImage(product: Product) {
  const candidate = product.gallery?.[0];

  if (!candidate || candidate === product.image) {
    return null;
  }

  return candidate;
}

export default function CollectionPageClient({
  allProducts,
  collection,
  products,
}: {
  allProducts: Product[];
  collection: Collection;
  collections: Collection[];
  products: Product[];
}) {
  const [shapeFilter, setShapeFilter] = useState<ShapeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('featured');

  const visibleProducts = useMemo(() => {
    const filtered =
      shapeFilter === 'all'
        ? products
        : products.filter((product) => getDisplayArtworkShape(product) === shapeFilter);
    const sorted = [...filtered];

    if (sortOption === 'price-asc') {
      sorted.sort((a, b) => a.priceInCents - b.priceInCents);
    } else if (sortOption === 'price-desc') {
      sorted.sort((a, b) => b.priceInCents - a.priceInCents);
    } else if (sortOption === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }

    return sorted;
  }, [products, shapeFilter, sortOption]);

  return (
    <StorefrontShell products={allProducts}>
      <StorefrontTracker />
      <main className="collection-page">
        <section className="collection-toolbar" aria-label="Shop category controls">
          <div className="product-count">{visibleProducts.length} Products</div>
          <nav className="collection-tabs" aria-label="Shop categories">
            {collectionNavItems.map((item) => (
              <Link
                className={item.slug === collection.slug ? 'active' : ''}
                key={item.slug}
                href={`/collections/${item.slug}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="collection-heading">
          <p className="eyebrow">Shop Prints</p>
          <h1>{collection.title}</h1>
        </section>

        <section className="collection-filters" aria-label="Filter and sort products">
          <div className="collection-shape-filters" role="group" aria-label="Filter by orientation">
            {shapeFilters.map((filter) => (
              <button
                className={filter.id === shapeFilter ? 'active' : ''}
                key={filter.id}
                type="button"
                onClick={() => setShapeFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="collection-sort">
            <span className="sr-only">Sort products</span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title">A to Z</option>
            </select>
          </label>
        </section>

        <section className="listing-grid" aria-label={`${collection.title} products`}>
          {visibleProducts.map((product, index) => {
            const badge = getCardBadge(product);
            const hoverImage = getHoverImage(product);

            return (
              <article className="listing-card" key={product.id}>
                <Link className="listing-card-image" href={`/products/${product.slug}`}>
                  {badge ? <span className="listing-card-badge">{badge}</span> : null}
                  <ProductImage product={product} priority={index < 2} />
                  {hoverImage ? (
                    <span className="listing-card-hover" aria-hidden="true">
                      <OptimizedRawImage
                        src={hoverImage}
                        alt=""
                        sizes="(max-width: 760px) 92vw, 420px"
                        fill
                      />
                    </span>
                  ) : null}
                </Link>
                <div className="listing-card-copy">
                  <h2>
                    <Link href={`/products/${product.slug}`}>{product.title}</Link>
                  </h2>
                  <div className="listing-card-meta">
                    <p>{formatPrice(product.priceInCents)}</p>
                    {product.rating && product.reviewCount ? (
                      <p className="listing-card-rating">
                        <Star aria-hidden="true" fill="currentColor" size={13} strokeWidth={2.4} />
                        {product.rating.toFixed(1)}
                        <span>({product.reviewCount})</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
          {!visibleProducts.length ? (
            <p className="collection-empty">
              No {shapeFilter} prints in this collection yet.{' '}
              <button type="button" onClick={() => setShapeFilter('all')}>
                Show everything
              </button>
            </p>
          ) : null}
        </section>
      </main>
    </StorefrontShell>
  );
}
