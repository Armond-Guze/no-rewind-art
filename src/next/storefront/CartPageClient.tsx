'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
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
  createCheckoutRequestId,
  formatPrice,
  getConfiguredUnitPrice,
  getFrameOption,
  getSizeOption,
  sizeOptionMatches,
} from './product-utils';
import { supabaseClient } from '../../lib/supabase';
import { getProductTrackingItem, trackStorefrontEvent } from './analytics';
import { getCheckoutAttribution } from './attribution';
import { useCartDiscount } from './useCartDiscount';
import { getCartOrderNote, saveCartOrderNote } from './cart-preferences';
import { GoogleCustomerReviewsOptIn } from './GoogleCustomerReviewsOptIn';
import { ProductThumbnail } from './OptimizedArtwork';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { CheckoutPolicyNotice } from './CheckoutPolicyNotice';
import './cart-page.css';

type CheckoutState = 'idle' | 'loading' | 'error';
type CheckoutVerificationState = 'idle' | 'verifying' | 'verified' | 'error';

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
    tax?: number;
    shipping?: number;
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
  googleCustomerReviewsServerRendered,
  initialMerchantCartItem,
  merchantItemId,
  products,
  requestedFrameId,
}: {
  checkoutSessionId?: string;
  checkoutResult?: string;
  googleCustomerReviewsServerRendered?: boolean;
  initialMerchantCartItem?: StoredCartItem;
  merchantItemId?: string;
  products: Product[];
  requestedFrameId?: string;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<StoredCartItem[]>(() =>
    initialMerchantCartItem ? [initialMerchantCartItem] : [],
  );
  const [cartReady, setCartReady] = useState(Boolean(initialMerchantCartItem));
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutVerificationState, setCheckoutVerificationState] =
    useState<CheckoutVerificationState>(
      checkoutResult === 'success' ? (checkoutSessionId ? 'verifying' : 'error') : 'idle',
    );
  const [checkoutVerificationMessage, setCheckoutVerificationMessage] = useState(
    checkoutResult === 'success' && !checkoutSessionId
      ? 'We could not verify this payment because the checkout reference is missing. Your cart has been kept. Contact support if you were charged.'
      : '',
  );
  const checkoutRequest = useRef<{ id: string; signature: string } | null>(null);
  const hasTrackedCartView = useRef(false);
  const [codeDraft, setCodeDraft] = useState('');

  const cartProducts = useMemo(() => buildCartLines(cart, products), [cart, products]);
  const subtotal = useMemo(() => getCartSubtotal(cartProducts), [cartProducts]);
  const cartSignature = JSON.stringify(cartProducts.map((item) => ({
    id: item.productId, sizeId: item.sizeOption.id, frameId: item.frameOption.id, quantity: item.quantity,
  })));
  const discount = useCartDiscount(cartReady, cartSignature, subtotal);
  const itemCount = useMemo(
    () => cartProducts.reduce((count, item) => count + item.quantity, 0),
    [cartProducts],
  );
  useEffect(() => {
    const syncStoredCart = () => {
      const storedCart = readStoredCart();
      const nextCart =
        initialMerchantCartItem &&
        !storedCart.some((item) => item.lineKey === initialMerchantCartItem.lineKey)
          ? [...storedCart, initialMerchantCartItem]
          : storedCart;

      if (nextCart !== storedCart) {
        writeStoredCart(nextCart);
        notifyStoredCartUpdated(nextCart);
      }

      setCart(nextCart);
      setCartReady(true);
    };

    syncStoredCart();
    window.addEventListener(cartUpdatedEvent, syncStoredCart);
    window.addEventListener('storage', syncStoredCart);

    return () => {
      window.removeEventListener(cartUpdatedEvent, syncStoredCart);
      window.removeEventListener('storage', syncStoredCart);
    };
  }, [initialMerchantCartItem]);

  useEffect(() => {
    if (!cartReady || !cartProducts.length || checkoutResult === 'success') {
      return;
    }

    if (hasTrackedCartView.current) {
      return;
    }

    hasTrackedCartView.current = true;
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

    if (!checkoutSessionId) {
      return;
    }

    const verifiedCheckoutSessionId = checkoutSessionId;
    const trackingKey = `armoze_purchase_return_tracked_${verifiedCheckoutSessionId}`;

    if (hasTrackedPurchase(trackingKey)) {
      writeStoredCart([]);
      notifyStoredCartUpdated([]);
      const verificationTimer = window.setTimeout(() => {
        setCheckoutVerificationState('verified');
      }, 0);

      return () => {
        window.clearTimeout(verificationTimer);
      };
    }

    let cancelled = false;

    async function trackPurchaseReturn() {
      try {
        const response = await fetch(
          `/api/google-ads/conversion?session_id=${encodeURIComponent(verifiedCheckoutSessionId)}`,
        );
        const data = (await response.json().catch(() => ({}))) as PurchaseConversionResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || 'Payment verification failed.');
        }

        if (!data.conversion?.transaction_id) {
          throw new Error('Payment is still processing or could not be verified yet.');
        }

        if (cancelled) {
          return;
        }

        trackStorefrontEvent('purchase', data.conversion);
        markPurchaseTracked(trackingKey);
        writeStoredCart([]);
        saveCartOrderNote('');
        notifyStoredCartUpdated([]);
        setCheckoutVerificationState('verified');
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setCheckoutVerificationState('error');
          setCheckoutVerificationMessage(
            error instanceof Error
              ? `${error.message} Your cart has been kept. Contact support if you were charged.`
              : 'Payment verification failed. Your cart has been kept. Contact support if you were charged.',
          );
        }
      }
    }

    void trackPurchaseReturn();

    return () => {
      cancelled = true;
    };
  }, [cartReady, checkoutResult, checkoutSessionId]);

  function updateQuantity(lineKey: string, nextQuantity: number) {
    const line = cartProducts.find((item) => item.lineKey === lineKey);
    const boundedQuantity = Math.max(0, Math.min(nextQuantity, 10));

    if (line && boundedQuantity !== line.quantity) {
      const quantityDelta = boundedQuantity - line.quantity;
      const changedQuantity = Math.abs(quantityDelta);
      const unitPrice = getConfiguredUnitPrice(line.product, line.sizeOption, line.frameOption);

      trackStorefrontEvent(quantityDelta > 0 ? 'add_to_cart' : 'remove_from_cart', {
        currency: 'USD',
        value: (unitPrice * changedQuantity) / 100,
        items: [
          getProductTrackingItem(
            line.product,
            line.sizeOption,
            line.frameOption,
            changedQuantity,
          ),
        ],
      });
    }

    const nextCart = cart
      .map((item) =>
        item.lineKey === lineKey
          ? { ...item, quantity: boundedQuantity }
          : item,
      )
      .filter((item) => item.quantity > 0);

    writeStoredCart(nextCart);
    notifyStoredCartUpdated(nextCart);
  }

  async function startCheckout() {
    if (!cartProducts.length || discount.loading) {
      return;
    }

    setCheckoutState('loading');
    setCheckoutError('');

    const trackingItems = cartProducts.map((item) =>
      getProductTrackingItem(item.product, item.sizeOption, item.frameOption, item.quantity),
    );
    const checkoutItems = cartProducts.map((item) => ({
      id: item.productId,
      sizeId: item.sizeOption.id,
      frameId: item.frameOption.id,
      quantity: item.quantity,
    }));
    const discountCode = discount.quote?.code || '';
    const orderNote = getCartOrderNote();
    const checkoutSignature = JSON.stringify({ items: checkoutItems, discountCode, orderNote });

    if (!checkoutRequest.current || checkoutRequest.current.signature !== checkoutSignature) {
      checkoutRequest.current = {
        id: createCheckoutRequestId(),
        signature: checkoutSignature,
      };
    }

    trackStorefrontEvent('begin_checkout', {
      currency: 'USD',
      value: subtotal / 100,
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
          checkoutRequestId: checkoutRequest.current.id,
          items: checkoutItems,
          ...(discountCode ? { discountCode } : {}),
          ...(orderNote ? { orderNote } : {}),
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
      {googleCustomerReviewsServerRendered ? null : (
        <GoogleCustomerReviewsOptIn checkoutResult={checkoutResult} />
      )}
      <main className="standalone-cart-page simple-cart-page">
        {checkoutResult === 'success' && checkoutVerificationState === 'verified' ? (
          <div className="checkout-banner success">
            <span>Payment complete. Your order is being prepared.</span>
            <Link href="/account">View order history</Link>
          </div>
        ) : null}

        {checkoutResult === 'success' && checkoutVerificationState === 'verifying' ? (
          <div className="checkout-banner">
            Confirming your payment with Stripe…
          </div>
        ) : null}

        {checkoutResult === 'success' && checkoutVerificationState === 'error' ? (
          <div className="checkout-banner cancelled">
            {checkoutVerificationMessage}
          </div>
        ) : null}

        <section id="cart" className="cart-section">
          <div className="cart-copy">
            <h1>Your bag</h1>
            <p role={checkoutResult === 'cancelled' ? 'status' : undefined}>
              {checkoutResult === 'cancelled'
                ? 'Your items are saved. Continue whenever you are ready.'
                : 'Review your items and continue to checkout.'}
            </p>
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
                      >
                        <ProductThumbnail
                          product={product}
                          sizes="(max-width: 620px) 82px, 112px"
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
                    <strong>{formatPrice(subtotal - (discount.quote?.amount || 0))}</strong>
                  </div>
                  <small>Taxes, when required, are calculated at secure checkout.</small>
                </div>

                <button
                  className="button button-primary checkout-button"
                  type="button"
                  disabled={checkoutState === 'loading' || discount.loading}
                  onClick={startCheckout}
                >
                  <ShoppingBag aria-hidden="true" size={18} />
                  {checkoutState === 'loading' ? 'Opening checkout...' : 'Continue to checkout'}
                </button>

                <CheckoutPolicyNotice />

                {checkoutState === 'error' ? (
                  <p className="checkout-error">
                    {checkoutError || 'Checkout could not be started. Please try again.'}
                  </p>
                ) : null}

                <form className="cart-discount-form" onSubmit={(event) => { event.preventDefault(); discount.apply(codeDraft); }}>
                  <label htmlFor="cart-discount-code">Discount code</label>
                  <input id="cart-discount-code" value={codeDraft} onChange={(event) => setCodeDraft(event.target.value)} autoComplete="off" maxLength={80} required />
                  <button className="button button-secondary" type="submit" disabled={discount.loading}>{discount.loading ? 'Applying…' : 'Apply'}</button>
                  {discount.quote ? <p role="status">{discount.quote.code} applied. You save {formatPrice(discount.quote.amount)}. <button type="button" onClick={() => { discount.remove(); setCodeDraft(''); }}>Remove code</button></p> : null}
                  {discount.error ? <p className="checkout-error" role="alert">{discount.error}</p> : null}
                </form>
              </>
            ) : (
              <div className="empty-cart">
                <ShoppingBag aria-hidden="true" size={34} />
                <h3>{cartReady ? 'Your bag is empty' : 'Loading your cart'}</h3>
                <p>
                  {cartReady
                    ? 'Find a print you love and add it to your bag.'
                    : 'Checking your saved Armoze prints.'}
                </p>
                {cartReady ? (
                  <Link className="button button-secondary" href="/collections/best-sellers">
                    Browse prints
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
