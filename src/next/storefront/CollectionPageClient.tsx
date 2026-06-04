'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { addStoredCartItem } from '../../cart';
import type { Collection, Product } from '../../data/products';
import {
  formatPrice,
  getBaseFrameOption,
  getBaseSizeOption,
  getConfiguredUnitPrice,
} from './product-utils';
import { getProductTrackingItem, trackStorefrontEvent } from './analytics';
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
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  function quickAdd(product: Product) {
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
    setAddedProductId(product.id);
    window.setTimeout(() => setAddedProductId((current) => (current === product.id ? null : current)), 1600);
  }

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
                <div>
                  <h2>
                    <Link href={`/products/${product.slug}`}>{product.title}</Link>
                  </h2>
                  <p>From {formatPrice(product.priceInCents)}</p>
                </div>
                <button
                  className="quick-add"
                  type="button"
                  onClick={() => quickAdd(product)}
                  aria-label={`Add ${product.title} to cart`}
                  title={addedProductId === product.id ? 'Added' : `Add ${product.title} to cart`}
                >
                  <Plus aria-hidden="true" size={16} />
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </StorefrontShell>
  );
}
