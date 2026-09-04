'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Star, X } from 'lucide-react';
import type { Collection, Product } from '../../data/products';
import {
  formatPrice,
  getProductsForCollection as getCollectionProducts,
  hasProductSpecificReviewSummary,
} from './product-utils';
import { OptimizedRawImage, ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { getProductTrackingItem, trackStorefrontEvent } from './analytics';
import './collection-navigation.css';

type SortKey =
  | 'featured'
  | 'most-relevant'
  | 'best-selling'
  | 'alphabetical-ascending'
  | 'alphabetical-descending'
  | 'price-ascending'
  | 'price-descending'
  | 'date-ascending'
  | 'date-descending';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'most-relevant', label: 'Most relevant' },
  { key: 'best-selling', label: 'Best selling' },
  { key: 'alphabetical-ascending', label: 'Alphabetically, A–Z' },
  { key: 'alphabetical-descending', label: 'Alphabetically, Z–A' },
  { key: 'price-ascending', label: 'Price, low to high' },
  { key: 'price-descending', label: 'Price, high to low' },
  { key: 'date-ascending', label: 'Date, old to new' },
  { key: 'date-descending', label: 'Date, new to old' },
];

function sortProducts(products: Product[], sortKey: SortKey) {
  const sorted = [...products];

  switch (sortKey) {
    case 'best-selling':
      return sorted.sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
    case 'alphabetical-ascending':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'alphabetical-descending':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'price-ascending':
      return sorted.sort((a, b) => a.priceInCents - b.priceInCents);
    case 'price-descending':
      return sorted.sort((a, b) => b.priceInCents - a.priceInCents);
    case 'date-descending':
      return sorted.reverse();
    default:
      return sorted;
  }
}

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
  collections,
  initialSearchTerm,
  products,
}: {
  allProducts: Product[];
  collection: Collection;
  collections: Collection[];
  initialSearchTerm?: string;
  products: Product[];
}) {
  const searchTerm = initialSearchTerm?.trim() || '';
  const sortPanelRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortKey>(
    collection.slug === 'best-sellers' ? 'best-selling' : 'featured',
  );

  const matchingProducts = useMemo(
    () =>
      searchTerm
        ? allProducts.filter((product) => productMatchesSearch(product, searchTerm))
        : products,
    [allProducts, products, searchTerm],
  );
  const visibleProducts = useMemo(
    () => sortProducts(matchingProducts, selectedSort),
    [matchingProducts, selectedSort],
  );
  const currentSortLabel = sortOptions.find((option) => option.key === selectedSort)?.label || 'Featured';

  useEffect(() => {
    if (!sortOpen) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!sortPanelRef.current?.contains(event.target as Node)) setSortOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSortOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [sortOpen]);

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
        <section className="collection-navigation" aria-label="Collection controls">
          <h1 className="sr-only">
            {searchTerm ? `Search results for “${searchTerm}”` : collection.title}
          </h1>
          <nav className="collection-breadcrumbs" aria-label="Shop collections">
            {collections.map((item, index) => (
              <span className="collection-breadcrumb-item" key={item.slug}>
                {index ? <span className="collection-breadcrumb-separator" aria-hidden="true">/</span> : null}
                <Link
                  aria-current={item.slug === collection.slug ? 'page' : undefined}
                  className={item.slug === collection.slug ? 'active' : ''}
                  href={`/collections/${item.slug}`}
                >
                  {item.navLabel || item.title}
                  <sup>{getCollectionProducts(allProducts, item).length}</sup>
                </Link>
              </span>
            ))}
          </nav>
          <div className="collection-sort" ref={sortPanelRef}>
            <button
              className="collection-sort-trigger"
              type="button"
              aria-expanded={sortOpen}
              aria-haspopup="dialog"
              onClick={() => setSortOpen((open) => !open)}
            >
              <span>{currentSortLabel}</span>
              <ChevronDown aria-hidden="true" size={16} strokeWidth={1.6} />
            </button>
            <div className={`collection-sort-panel${sortOpen ? ' is-open' : ''}`} role="dialog" aria-label="Sort products" inert={!sortOpen}>
              <div className="collection-sort-heading">
                <span>Sort by</span>
                <button type="button" aria-label="Close sorting options" onClick={() => setSortOpen(false)}>
                  <X aria-hidden="true" size={19} strokeWidth={1.7} />
                </button>
              </div>
              <div className="collection-sort-options">
                {sortOptions.map((option) => (
                  <button
                    className={option.key === selectedSort ? 'active' : ''}
                    key={option.key}
                    type="button"
                    aria-pressed={option.key === selectedSort}
                    onClick={() => {
                      setSelectedSort(option.key);
                      setSortOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {option.key === selectedSort ? <i aria-hidden="true" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {searchTerm ? (
            <p className="collection-search-summary">
              {visibleProducts.length
                ? `${visibleProducts.length} matching print${visibleProducts.length === 1 ? '' : 's'}`
                : 'No matching prints'}
              <Link href={`/collections/${collection.slug}`}>Clear search</Link>
            </p>
          ) : null}
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
                ? `Nothing matched “${searchTerm}”.`
                : 'No prints in this collection yet.'}{' '}
              {searchTerm ? (
                <Link href={`/collections/${collection.slug}`}>Browse all prints</Link>
              ) : null}
            </p>
          ) : null}
        </section>
      </main>
    </StorefrontShell>
  );
}
