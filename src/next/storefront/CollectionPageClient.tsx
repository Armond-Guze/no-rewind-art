'use client';

import Link from 'next/link';
import type { Collection, Product } from '../../data/products';
import {
  formatPrice,
} from './product-utils';
import { ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

const collectionNavItems = [
  { slug: 'best-sellers', label: 'Best Sellers' },
  { slug: 'discipline-focus', label: 'Motivational' },
  { slug: 'new-arrivals', label: 'New Arrivals' },
];

export default function CollectionPageClient({
  collection,
  products,
}: {
  collection: Collection;
  collections: Collection[];
  products: Product[];
}) {
  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="collection-page">
        <section className="collection-toolbar" aria-label="Shop category controls">
          <div className="product-count">{products.length} Products</div>
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
          <p>{collection.description}</p>
        </section>

        <section className="listing-grid" aria-label={`${collection.title} products`}>
          {products.map((product, index) => (
            <article className="listing-card" key={product.id}>
              <Link className="listing-card-image" href={`/products/${product.slug}`}>
                <ProductImage product={product} priority={index < 2} />
              </Link>
              <div className="listing-card-copy">
                <h2>
                  <Link href={`/products/${product.slug}`}>{product.title}</Link>
                </h2>
                <div className="listing-card-meta">
                  <p>{formatPrice(product.priceInCents)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </StorefrontShell>
  );
}
