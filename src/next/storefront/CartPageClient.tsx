'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  addStoredCartItem,
  cartUpdatedEvent,
  makeCartLineKey,
  notifyStoredCartUpdated,
  readStoredCart,
  writeStoredCart,
  type StoredCartItem,
} from '../../cart';
import type { FrameOption, Product, SizeOption } from '../../data/products';
import {
  formatPrice,
  getCartProductImage,
  getConfiguredUnitPrice,
  getFrameOption,
  getSizeOption,
  getSizeOptionAspectRatio,
  launchOfferCode,
  launchOfferDiscount,
  sizeOptionMatches,
} from './product-utils';
import { supabaseClient } from '../../lib/supabase';
import { getProductTrackingItem, trackStorefrontEvent } from './analytics';
import { getCheckoutAttribution } from './attribution';
import { GoogleCustomerReviewsOptIn } from './GoogleCustomerReviewsOptIn';
import { ProductImage } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';

type CheckoutState = 'idle' | 'loading' | 'error';

type CartLine = StoredCartItem & {
  product: Product;
  sizeOption: SizeOption;
  frameOption: FrameOption;
};

type PurchaseConversionResponse = {
  conversion?: {
    transaction_id: string;
    currency: string;
    value: number;
    items?: Array<{
      item_id: string;
      item_name: string;
      item_category?: string;
      price: number;
      quantity: number;
      item_variant?: string;
      variant?: string;
    }>;
  } | null;
};

function buildCartLines(cart: StoredCartItem[], products: Product[]) {
  return cart
    .map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product) {
        return null;
      }

      const sizeOption = getSizeOption(product, item.sizeId);
      const frameOption = getFrameOption(product, item.frameId, sizeOption);

      return {
        ...item,
        product,
        sizeOption,
        frameOption,
      };
    })
    .filter((item): item is CartLine => Boolean(item));
}

function getCartSubtotal(cartProducts: CartLine[]) {
  return cartProducts.reduce(
    (total, item) =>
      total + getConfiguredUnitPrice(item.product, item.sizeOption, item.frameOption) * item.quantity,
    0,
  );
}

function hasTrackedPurchase(trackingKey: string) {
  try {
    return (
      window.localStorage.getItem(trackingKey) === '1' ||
      window.sessionStorage.getItem(trackingKey) === '1'
    );
  } catch {
    return false;
  }
}

function markPurchaseTracked(trackingKey: string) {
  try {
    window.localStorage.setItem(trackingKey, '1');
    window.sessionStorage.setItem(trackingKey, '1');
  } catch {
    // Conversion de-duping is best-effort; checkout cleanup should still continue.
  }
}

function getProductByCartItemId(products: Product[], itemId: string | undefined) {
  if (!itemId) {
    return null;
  }

  for (const product of products) {
    if (!product.published) {
      continue;
    }

    const sizeOption = product.sizeOptions.find((option) => {
      const sizeId = itemId.startsWith(`${product.id}-`)
        ? itemId.slice(product.id.length + 1)
        : '';

      return sizeOptionMatches(option, sizeId);
    });

    if (sizeOption) {
      return { product, sizeOption };
    }
  }

  return null;
}

export default function CartPageClient({
  checkoutSessionId,
  checkoutResult,
  merchantItemId,
  products,
  requestedFrameId,
}: {
  checkoutSessionId?: string;
  checkoutResult?: string;
  merchantItemId?: string;
  products: Product[];
  requestedFrameId?: string;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const lastTrackedCartView = useRef('');

  const cartProducts = useMemo(() => buildCartLines(cart, products), [cart, products]);
  const subtotal = useMemo(() => getCartSubtotal(cartProducts), [cartProducts]);
  const itemCount = useMemo(
    () => cartProducts.reduce((count, item) => count + item.quantity, 0),
    [cartProducts],
  );
  const crossSellProducts = useMemo(() => {
    const cartProductIds = new Set(cartProducts.map((line) => line.product.id));

    return products
      .filter((product) => product.published && !cartProductIds.has(product.id))
      .slice(0, 3);
  }, [cartProducts, products]);

  function addCrossSellProduct(product: Product) {
    const sizeOption = getSizeOption(
      product,
      product.defaultSizeId ?? product.sizeOptions[0]?.id ?? '',
    );
    const frameOption = getFrameOption(product, product.frameOptions[0]?.id ?? 'canvas', sizeOption);

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

  useEffect(() => {
    const syncStoredCart = () => {
      setCart(readStoredCart());
      setCartReady(true);
    };

    syncStoredCart();
    window.addEventListener(cartUpdatedEvent, syncStoredCart);
    window.addEventListener('storage', syncStoredCart);

    return () => {
      window.removeEventListener(cartUpdatedEvent, syncStoredCart);
      window.removeEventListener('storage', syncStoredCart);
    };
  }, []);

  useEffect(() => {
    if (!cartReady || !cartProducts.length || checkoutResult === 'success') {
      return;
    }

    const cartViewKey = cartProducts
      .map((item) => `${item.lineKey}:${item.quantity}`)
      .join('|');

    if (cartViewKey === lastTrackedCartView.current) {
      return;
    }

    lastTrackedCartView.current = cartViewKey;
    trackStorefrontEvent('view_cart', {
      currency: 'USD',
      value: subtotal / 100,
      items: cartProducts.map((item) =>
        getProductTrackingItem(item.product, item.sizeOption, item.frameOption, item.quantity),
      ),
    });
  }, [cartProducts, cartReady, checkoutResult, subtotal]);

  useEffect(() => {
    if (!cartReady || !merchantItemId) {
      return;
    }

    const selection = getProductByCartItemId(products, merchantItemId);

    if (!selection) {
      router.replace('/cart');
      return;
    }

    const frameOption = requestedFrameId
      ? getFrameOption(selection.product, requestedFrameId, selection.sizeOption)
      : selection.product.frameOptions[0];
    const lineKey = makeCartLineKey(selection.product.id, selection.sizeOption.id, frameOption.id);
    const currentCart = readStoredCart();
    const nextCart = currentCart.some((item) => item.lineKey === lineKey)
      ? currentCart
      : [
          ...currentCart,
          {
            lineKey,
            productId: selection.product.id,
            sizeId: selection.sizeOption.id,
            frameId: frameOption.id,
            quantity: 1,
          },
        ];

    if (nextCart !== currentCart) {
      writeStoredCart(nextCart);
      notifyStoredCartUpdated(nextCart);
    }

    router.replace('/cart');
  }, [cartReady, merchantItemId, products, requestedFrameId, router]);

  useEffect(() => {
    if (checkoutResult !== 'success' || !cartReady) {
      return;
    }

    const trackingKey = checkoutSessionId
      ? `armoze_purchase_return_tracked_${checkoutSessionId}`
      : 'armoze_purchase_return_tracked';

    if (hasTrackedPurchase(trackingKey)) {
      writeStoredCart([]);
      notifyStoredCartUpdated([]);
      return;
    }

    let cancelled = false;

    async function trackPurchaseReturn() {
      let tracked = false;
      let serverChecked = false;

      if (checkoutSessionId) {
        try {
          const response = await fetch(
            `/api/google-ads/conversion?session_id=${encodeURIComponent(checkoutSessionId)}`,
          );
          serverChecked = response.ok;

          if (response.ok) {
            const data = (await response.json()) as PurchaseConversionResponse;

            if (!cancelled && data.conversion) {
              trackStorefrontEvent('purchase', data.conversion);
              tracked = true;
            }
          }
        } catch (error) {
          console.error(error);
        }
      }

      if (!tracked && !serverChecked && !cancelled) {
        const currentCart = readStoredCart();
        const trackingLines = buildCartLines(currentCart, products);
        const trackingItems = trackingLines.map((item) =>
          getProductTrackingItem(item.product, item.sizeOption, item.frameOption, item.quantity),
        );

        if (trackingLines.length) {
          trackStorefrontEvent('purchase', {
            currency: 'USD',
            value: getCartSubtotal(trackingLines) / 100,
            items: trackingItems,
          });
          tracked = true;
        }
      }

      if (tracked && !cancelled) {
        markPurchaseTracked(trackingKey);
      }

      if (!cancelled) {
        writeStoredCart([]);
        notifyStoredCartUpdated([]);
      }
    }

    void trackPurchaseReturn();

    return () => {
      cancelled = true;
    };
  }, [cartReady, checkoutResult, checkoutSessionId, products]);

  function updateQuantity(lineKey: string, nextQuantity: number) {
    const nextCart = cart
      .map((item) =>
        item.lineKey === lineKey
          ? { ...item, quantity: Math.max(0, Math.min(nextQuantity, 10)) }
          : item,
      )
      .filter((item) => item.quantity > 0);

    writeStoredCart(nextCart);
    notifyStoredCartUpdated(nextCart);
  }

  async function startCheckout() {
    if (!cartProducts.length) {
      return;
    }

    setCheckoutState('loading');
    setCheckoutError('');

    const trackingItems = cartProducts.map((item) =>
      getProductTrackingItem(item.product, item.sizeOption, item.frameOption, item.quantity),
    );

    trackStorefrontEvent('begin_checkout', {
      currency: 'USD',
      value: subtotal / 100,
      coupon: launchOfferCode,
      items: trackingItems,
    });

    try {
      const { data: authData } = supabaseClient
        ? await supabaseClient.auth.getSession()
        : { data: { session: null } };
      const accessToken = authData.session?.access_token;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          attribution: getCheckoutAttribution(),
          items: cartProducts.map((item) => ({
            id: item.productId,
            sizeId: item.sizeOption.id,
            frameId: item.frameOption.id,
            quantity: item.quantity,
          })),
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
      console.error(error);
      setCheckoutError(error instanceof Error ? error.message : 'Checkout request failed');
      setCheckoutState('error');
    }
  }

  return (
    <StorefrontShell products={products}>
      <StorefrontTracker />
      <GoogleCustomerReviewsOptIn checkoutResult={checkoutResult} />
      <main className="standalone-cart-page">
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

        <section id="cart" className="cart-section">
          <div className="cart-copy">
            <p className="eyebrow">Checkout</p>
            <h1>Your Cart</h1>
            <p>
              Review your prints, then continue to secure checkout. Shipping and payment
              details are confirmed before you place the order.
            </p>
            <ul className="cart-page-benefits" aria-label="What to expect from your order">
              <li><Truck aria-hidden="true" size={20} /><span><strong>Free U.S. shipping</strong> on every canvas order</span></li>
              <li><Clock aria-hidden="true" size={20} /><span><strong>Made to order</strong> in 2-3 business days</span></li>
              <li><ShieldCheck aria-hidden="true" size={20} /><span><strong>30-day returns</strong> and damage support</span></li>
            </ul>
            <Link className="cart-continue-link" href="/collections/best-sellers">
              Continue shopping
            </Link>
          </div>

          <aside className="cart-panel" aria-label="Shopping cart">
            {cartReady && cartProducts.length ? (
              <>
                <div className="cart-panel-heading">
                  <h2>Order summary</h2>
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="cart-items">
                  {cartProducts.map(({ lineKey, product, quantity, sizeOption, frameOption }) => (
                    <div className="cart-item" key={lineKey}>
                      <Link
                        className="cart-item-media"
                        href={`/products/${product.slug}`}
                        style={{ aspectRatio: getSizeOptionAspectRatio(sizeOption) }}
                      >
                        <ProductImage
                          product={product}
                          src={getCartProductImage(product)}
                          aspectRatio={getSizeOptionAspectRatio(sizeOption)}
                          className="cart-line-product-image"
                          priority
                          sizes="180px"
                        />
                      </Link>
                      <div className="cart-item-details">
                        <h3>{product.title}</h3>
                        <p>
                          {sizeOption.label} · {frameOption.label} ·{' '}
                          {formatPrice(getConfiguredUnitPrice(product, sizeOption, frameOption))}
                        </p>
                      </div>
                      <div className="cart-item-actions">
                        <strong>
                          {formatPrice(
                            getConfiguredUnitPrice(product, sizeOption, frameOption) * quantity,
                          )}
                        </strong>
                        <div className="quantity-controls">
                          <button
                            type="button"
                            aria-label={`Decrease ${product.title} quantity`}
                            onClick={() => updateQuantity(lineKey, quantity - 1)}
                          >
                            {quantity === 1 ? (
                              <Trash2 aria-hidden="true" size={16} />
                            ) : (
                              <Minus aria-hidden="true" size={16} />
                            )}
                          </button>
                          <span>{quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${product.title} quantity`}
                            onClick={() => updateQuantity(lineKey, quantity + 1)}
                          >
                            <Plus aria-hidden="true" size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  <div>
                    <span>Shipping</span>
                    <strong className="cart-free-shipping">Free</strong>
                  </div>
                  <div className="cart-estimated-total">
                    <span>Estimated total</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  <small>Taxes, when required, are calculated at secure checkout.</small>
                </div>

                <button
                  className="button button-primary checkout-button"
                  type="button"
                  disabled={checkoutState === 'loading'}
                  onClick={startCheckout}
                >
                  <ShoppingBag aria-hidden="true" size={18} />
                  {checkoutState === 'loading' ? 'Opening Checkout' : 'Secure Checkout'}
                </button>

                <ul className="cart-confidence" aria-label="Order benefits">
                  <li><Check aria-hidden="true" size={14} /> Free U.S. shipping</li>
                  <li><Check aria-hidden="true" size={14} /> 30-day returns</li>
                  <li><Check aria-hidden="true" size={14} /> Secure payment</li>
                </ul>

                {checkoutState === 'error' ? (
                  <p className="checkout-error">
                    {checkoutError || 'Checkout could not be started. Please try again.'}
                  </p>
                ) : null}

                <p className="cart-promo-hint">
                  First order? Code <strong>{launchOfferCode}</strong> takes {launchOfferDiscount} off at
                  checkout.
                </p>

                {crossSellProducts.length ? (
                  <div className="cart-cross-sell" aria-label="Add another print">
                    <h2>Add another print</h2>
                    <div className="cart-cross-sell-grid">
                      {crossSellProducts.map((product) => (
                        <div className="cart-cross-sell-card" key={product.id}>
                          <Link
                            className="cart-cross-sell-thumb"
                            href={`/products/${product.slug}`}
                            aria-label={`View ${product.title}`}
                          >
                            <ProductImage product={product} sizes="140px" />
                          </Link>
                          <strong>{product.title}</strong>
                          <span>{formatPrice(product.priceInCents)}</span>
                          <button type="button" onClick={() => addCrossSellProduct(product)}>
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-cart">
                <ShoppingBag aria-hidden="true" size={34} />
                <h3>{cartReady ? 'Your cart is empty' : 'Loading your cart'}</h3>
                <p>
                  {cartReady
                    ? 'Add a print from the first drop to start checkout.'
                    : 'Checking your saved Armoze prints.'}
                </p>
                {cartReady ? (
                  <Link className="button button-secondary" href="/collections/best-sellers">
                    Browse Prints
                  </Link>
                ) : null}
              </div>
            )}
          </aside>
        </section>
      </main>
    </StorefrontShell>
  );
}
