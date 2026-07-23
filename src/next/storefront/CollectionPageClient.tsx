'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { Collection, Product } from '../../data/products';
import {
  formatPrice,
  getDisplayArtworkShape,
  hasProductSpecificReviewSummary,
} from './product-utils';
import { OptimizedRawImage, ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { getProductTrackingItem, trackStorefrontEvent } from './analytics';

const collectionNavItems = [
  { slug: 'best-sellers', label: 'Best Sellers' },
  { slug: 'music', label: 'Music' },
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

function getCardBadge(product: Product, collectionSlug: string, index: number) {
  if (collectionSlug === 'best-sellers' && index < 4) {
    return 'Best Seller';
  }

  if (product.collectionSlugs.includes('new-arrivals')) {
    return 'New';
  }

  return null;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function productMatchesSearch(product: Product, searchTerm: string) {
  const tokens = normalizeSearchValue(searchTerm).split(/\s+/).filter(Boolean);
  const searchableText = normalizeSearchValue([
    product.title,
    product.description,
    product.longDescription,
    product.label,
    product.tone,
    ...product.collectionSlugs,
    ...product.details,
  ].join(' '));

  return tokens.every((token) => searchableText.includes(token));
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
  initialSearchTerm,
  products,
}: {
  allProducts: Product[];
  collection: Collection;
  collections: Collection[];
  initialSearchTerm?: string;
  products: Product[];
}) {
  const [shapeFilter, setShapeFilter] = useState<ShapeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('featured');
  const searchTerm = initialSearchTerm?.trim() || '';

  const visibleProducts = useMemo(() => {
    const searchResults = searchTerm
      ? allProducts.filter((product) => productMatchesSearch(product, searchTerm))
      : products;
    const filtered =
      shapeFilter === 'all'
        ? searchResults
        : searchResults.filter((product) => getDisplayArtworkShape(product) === shapeFilter);
    const sorted = [...filtered];

    if (sortOption === 'price-asc') {
      sorted.sort((a, b) => a.priceInCents - b.priceInCents);
    } else if (sortOption === 'price-desc') {
      sorted.sort((a, b) => b.priceInCents - a.priceInCents);
    } else if (sortOption === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }

    return sorted;
  }, [allProducts, products, searchTerm, shapeFilter, sortOption]);

  useEffect(() => {
    if (searchTerm) {
      trackStorefrontEvent('search', { search_term: searchTerm });
    }
  }, [searchTerm]);

  useEffect(() => {
    trackStorefrontEvent('view_item_list', {
      item_list_id: searchTerm ? 'search-results' : collection.slug,
      item_list_name: searchTerm ? `Search: ${searchTerm}` : collection.title,
      items: visibleProducts.slice(0, 50).map((product, index) => ({
        ...getProductTrackingItem(product),
        index,
      })),
    });
  }, [collection.slug, collection.title, searchTerm, visibleProducts]);

  function trackProductSelection(product: Product, index: number) {
    trackStorefrontEvent('select_item', {
      item_list_id: searchTerm ? 'search-results' : collection.slug,
      item_list_name: searchTerm ? `Search: ${searchTerm}` : collection.title,
      items: [{ ...getProductTrackingItem(product), index }],
    });
  }

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
          <h1>{searchTerm ? `Search results for “${searchTerm}”` : collection.title}</h1>
          {searchTerm ? (
            <p className="collection-search-summary">
              {visibleProducts.length
                ? `${visibleProducts.length} matching print${visibleProducts.length === 1 ? '' : 's'}`
                : 'No matching prints'}
              <Link href={`/collections/${collection.slug}`}>Clear search</Link>
            </p>
          ) : (
            <>
              <p>{collection.description}</p>
              {collection.slug === 'music' ? (
                <div className="collection-feature-list" aria-label="Music collection features">
                  <span>Retro cassette originals</span>
                  <span>Made for studios and music rooms</span>
                  <span>Ready to hang</span>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="collection-filters" aria-label="Filter and sort products">
          <div className="collection-shape-filters" role="group" aria-label="Filter by orientation">
            {shapeFilters.map((filter) => (
              <button
                className={filter.id === shapeFilter ? 'active' : ''}
                key={filter.id}
                type="button"
                onClick={() => setShapeFilter(filter.id)}
                aria-pressed={filter.id === shapeFilter}
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
            const badge = getCardBadge(
              product,
              searchTerm ? 'search-results' : collection.slug,
              index,
            );
            const hoverImage = getHoverImage(product);

            return (
              <article className="listing-card" key={product.id}>
                <Link
                  className="listing-card-image"
                  href={`/products/${product.slug}`}
                  onClick={() => trackProductSelection(product, index)}
                >
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
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={() => trackProductSelection(product, index)}
                    >
                      {product.title}
                    </Link>
                  </h2>
                  <div className="listing-card-meta">
                    <p>{formatPrice(product.priceInCents)}</p>
                    {hasProductSpecificReviewSummary(product) ? (
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
              {searchTerm
                ? `Nothing matched “${searchTerm}”${shapeFilter === 'all' ? '.' : ` in ${shapeFilter} prints.`}`
                : `No ${shapeFilter} prints in this collection yet.`}{' '}
              {shapeFilter !== 'all' ? (
                <button type="button" onClick={() => setShapeFilter('all')}>
                  Show every orientation
                </button>
              ) : searchTerm ? (
                <Link href={`/collections/${collection.slug}`}>Browse all prints</Link>
              ) : null}
            </p>
          ) : null}
        </section>
      </main>
    </StorefrontShell>
  );
}
