'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { Inbox, PackageSearch, Truck } from 'lucide-react';
import { StorefrontShell, StorefrontTracker } from './StorefrontChrome';
import { formatPrice, supportEmail } from './product-utils';

type CustomerOrderItem = {
  productId: string;
  title: string;
  sizeLabel: string;
  frameLabel: string;
  quantity: number;
  unitAmount: number;
  lineTotal: number;
};

type CustomerOrder = {
  id: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  amountSubtotal: number;
  amountShipping: number;
  amountTax: number;
  amountTotal: number;
  items: CustomerOrderItem[];
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  shippedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function shortOrderId(orderId: string) {
  return orderId.replace(/^cs_(test|live)_/i, '').slice(0, 10).toUpperCase();
}

function getFulfillmentLabel(status: string) {
  const labels: Record<string, string> = {
    new: 'Order received',
    printing: 'In production',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return labels[status] || 'Order received';
}

function hasTracking(order: CustomerOrder) {
  return Boolean(order.carrier || order.trackingNumber || order.trackingUrl || order.shippedAt);
}

function getDiscountAmount(order: CustomerOrder) {
  return Math.max(
    0,
    order.amountSubtotal + order.amountShipping + order.amountTax - order.amountTotal,
  );
}

export default function OrderStatusPageClient() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('order') || '';

    if (prefill) {
      queueMicrotask(() => {
        setReference(prefill);
      });
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const response = await fetch('/api/order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: reference.trim(),
          email: email.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { order?: CustomerOrder; error?: string }
        | null;

      if (!response.ok || !data?.order) {
        throw new Error(data?.error || 'Order lookup failed. Try again in a moment.');
      }

      setOrder(data.order);
    } catch (lookupError) {
      setError(
        lookupError instanceof Error ? lookupError.message : 'Order lookup failed. Try again in a moment.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="account-page">
        <section className="account-hero">
          <p className="eyebrow">Order status</p>
          <h1>Track your order</h1>
          <p>
            Enter the order reference from your confirmation email and the email address you used at
            checkout. No account needed.
          </p>
        </section>

        <section className="account-shell">
          <aside className="account-panel" aria-label="Order lookup">
            <div className="account-state">
              <PackageSearch aria-hidden="true" size={32} />
              <h2>Find your order</h2>
              <form className="account-form order-status-form" onSubmit={(event) => { void handleSubmit(event); }}>
                <label>
                  <span>Order reference</span>
                  <input
                    autoComplete="off"
                    disabled={loading}
                    name="order"
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="From your confirmation email"
                    required
                    value={reference}
                  />
                </label>
                <label>
                  <span>Email used at checkout</span>
                  <input
                    autoComplete="email"
                    disabled={loading}
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </label>
                <button className="button button-primary" disabled={loading} type="submit">
                  {loading ? 'Looking up' : 'Check order status'}
                </button>
              </form>
              {error ? <p className="account-error">{error}</p> : null}
            </div>

            {order ? (
              <div className="account-order-list">
                <article className="account-order-card order-receipt" aria-label="Order receipt">
                  <div className="order-receipt-heading">
                    <div>
                      <span>Order receipt</span>
                      <strong>ARMOZE LLC</strong>
                      <small>Armoze is operated by ARMOZE LLC.</small>
                    </div>
                    <button className="order-receipt-print" type="button" onClick={() => window.print()}>
                      Print receipt
                    </button>
                  </div>
                  <div className="account-order-topline">
                    <div>
                      <span>Order {shortOrderId(order.id)}</span>
                      <strong>{formatPrice(order.amountTotal, order.currency)}</strong>
                    </div>
                    <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time>
                  </div>

                  <div className={`account-order-status status-${order.fulfillmentStatus}`}>
                    {getFulfillmentLabel(order.fulfillmentStatus)}
                  </div>

                  {hasTracking(order) ? (
                    <div className="account-order-tracking">
                      <Truck aria-hidden="true" size={18} />
                      <div>
                        <span>{order.carrier || 'Tracking'}</span>
                        {order.trackingNumber ? <strong>{order.trackingNumber}</strong> : null}
                        {order.shippedAt ? <small>Shipped {formatOrderDate(order.shippedAt)}</small> : null}
                      </div>
                      {order.trackingUrl ? (
                        <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                          Track package
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div className="account-order-tracking">
                      <Inbox aria-hidden="true" size={18} />
                      <div>
                        <span>Not shipped yet</span>
                        <small>Tracking appears here as soon as your order ships.</small>
                      </div>
                    </div>
                  )}

                  <ul className="account-order-items">
                    {order.items.map((item, index) => (
                      <li key={`${order.id}-${item.productId}-${index}`}>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{[item.sizeLabel, item.frameLabel].filter(Boolean).join(' / ')}</small>
                          <small>{item.quantity} x {formatPrice(item.unitAmount, order.currency)}</small>
                        </span>
                        <strong>{formatPrice(item.lineTotal, order.currency)}</strong>
                      </li>
                    ))}
                  </ul>

                  <dl className="order-receipt-totals">
                    <div><dt>Subtotal</dt><dd>{formatPrice(order.amountSubtotal, order.currency)}</dd></div>
                    {getDiscountAmount(order) > 0 ? (
                      <div><dt>Discounts</dt><dd>-{formatPrice(getDiscountAmount(order), order.currency)}</dd></div>
                    ) : null}
                    <div><dt>Shipping</dt><dd>{order.amountShipping > 0 ? formatPrice(order.amountShipping, order.currency) : 'Free'}</dd></div>
                    <div><dt>Tax</dt><dd>{formatPrice(order.amountTax, order.currency)}</dd></div>
                    <div className="order-receipt-total"><dt>Total ({order.currency.toUpperCase()})</dt><dd>{formatPrice(order.amountTotal, order.currency)}</dd></div>
                  </dl>

                  <div className="account-order-footer">
                    <span>Tracking and the latest delivery information appear above when available.</span>
                    <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Armoze order ${shortOrderId(order.id)}`)}`}>
                      Get help
                    </a>
                  </div>
                  <nav className="order-receipt-policies" aria-label="Policies for this order">
                    <Link href="/shipping">Shipping</Link>
                    <Link href="/returns">Returns</Link>
                    <Link href="/terms">Terms</Link>
                    <Link href="/privacy">Privacy</Link>
                  </nav>
                </article>
              </div>
            ) : null}

            <p className="account-muted">
              Have an account? <Link href="/account">See your full order history</Link>. Can&apos;t find
              your order reference? <Link href="/support">Contact support</Link>.
            </p>
          </aside>
        </section>
      </main>
    </StorefrontShell>
  );
}
