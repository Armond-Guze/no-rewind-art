'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import {
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
  getConfiguredUnitPrice,
  getFrameOption,
  getSizeOption,
  launchOfferCode,
  sizeOptionMatches,
} from './product-utils';
import { supabaseClient } from '../../lib/supabase';
import { getProductTrackingItem, trackStorefrontEvent } from './analytics';
import { GoogleCustomerReviewsOptIn } from './GoogleCustomerReviewsOptIn';
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

  const cartProducts = useMemo(() => buildCartLines(cart, products), [cart, products]);
  const subtotal = useMemo(() => getCartSubtotal(cartProducts), [cartProducts]);

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
    <StorefrontShell>
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
              Choose your prints here, then complete payment securely through Stripe
              Checkout. Shipping, tax, and payment details are handled at checkout.
            </p>
          </div>

          <aside className="cart-panel" aria-label="Shopping cart">
            {cartReady && cartProducts.length ? (
              <>
                <div className="cart-items">
                  {cartProducts.map(({ lineKey, product, quantity, sizeOption, frameOption }) => (
                    <div className="cart-item" key={lineKey}>
                      <div>
                        <h3>{product.title}</h3>
                        <p>
                          {sizeOption.label} · {frameOption.label} ·{' '}
                          {formatPrice(getConfiguredUnitPrice(product, sizeOption, frameOption))}
                        </p>
                      </div>
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
                  ))}
                </div>

                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
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

                {checkoutState === 'error' ? (
                  <p className="checkout-error">
                    {checkoutError || 'Checkout could not be started. Check your Stripe settings and try again.'}
                  </p>
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
