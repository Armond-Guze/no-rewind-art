'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Box, Inbox, LogOut, PackageCheck, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../../lib/supabase';
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

function getSupportHref(orderId: string) {
  const subject = encodeURIComponent(`Armoze order ${shortOrderId(orderId)}`);
  return `mailto:${supportEmail}?subject=${subject}`;
}

function hasTracking(order: CustomerOrder) {
  return Boolean(order.carrier || order.trackingNumber || order.trackingUrl || order.shippedAt);
}

export default function AccountPageClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  async function loadOrders(activeSession = session) {
    if (!activeSession?.access_token) {
      setOrders([]);
      return;
    }

    setOrdersLoading(true);
    setOrdersError('');

    try {
      const response = await fetch('/api/account/orders', {
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
      });
      const data = (await response.json().catch(() => null)) as
        | { orders?: CustomerOrder[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || 'Order history could not be loaded.');
      }

      setOrders(data?.orders || []);
    } catch (orderError) {
      setOrdersError(orderError instanceof Error ? orderError.message : 'Order history could not be loaded.');
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    if (!supabaseClient) {
      queueMicrotask(() => {
        setConfigured(false);
        setLoading(false);
      });
      return;
    }

    let active = true;

    void supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setConfigured(true);
          setSession(data.session);
        }
      })
      .catch(() => {
        if (active) {
          setConfigured(true);
          setSession(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      queueMicrotask(() => {
        setOrders([]);
        setOrdersError('');
        setOrdersLoading(false);
      });
      return;
    }

    let active = true;

    queueMicrotask(() => {
      if (active) {
        setOrdersLoading(true);
        setOrdersError('');
      }
    });

    void fetch('/api/account/orders', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | { orders?: CustomerOrder[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error || 'Order history could not be loaded.');
        }

        if (active) {
          setOrders(data?.orders || []);
        }
      })
      .catch((orderError) => {
        if (active) {
          setOrdersError(orderError instanceof Error ? orderError.message : 'Order history could not be loaded.');
        }
      })
      .finally(() => {
        if (active) {
          setOrdersLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  async function signOut() {
    if (!supabaseClient) {
      return;
    }

    setError('');

    const { error: signOutError } = await supabaseClient.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    setOrders([]);
    setOrdersError('');
  }

  return (
    <StorefrontShell>
      <StorefrontTracker />
      <main className="account-page">
        <section className="account-hero">
          <p className="eyebrow">Customer account</p>
          <h1>Your account</h1>
          <p>Manage your Armoze sign-in, saved session, and support details.</p>
        </section>

        <section className="account-shell">
          <div className="account-benefits" aria-label="Account benefits">
            <article>
              <Inbox aria-hidden="true" size={24} />
              <h2>Order updates</h2>
              <p>Use the same email at checkout and sign-in so support can find your order history faster.</p>
            </article>
            <article>
              <Box aria-hidden="true" size={24} />
              <h2>Made to order</h2>
              <p>Production takes about 5–8 business days before shipment. Carrier transit begins afterward, and delivery dates are estimates, not guarantees.</p>
            </article>
            <article>
              <Truck aria-hidden="true" size={24} />
              <h2>Support ready</h2>
              <p>Use the same checkout email here so order help stays connected to your account.</p>
            </article>
          </div>

          <aside className="account-panel" aria-label="Account status">
            {loading ? (
              <div className="account-state">
                <ShieldCheck aria-hidden="true" size={32} />
                <h2>Checking session</h2>
                <p>Looking for an active Armoze account session in this browser.</p>
              </div>
            ) : !configured ? (
              <div className="account-state">
                <ShieldCheck aria-hidden="true" size={32} />
                <h2>Accounts are almost ready</h2>
                <p>Supabase public auth settings still need to be configured before customer accounts can open.</p>
                <Link className="button button-secondary" href="/collections/best-sellers">
                  Browse Prints
                </Link>
              </div>
            ) : session?.user ? (
              <>
                <div className="account-state signed-in-account account-summary-card">
                  <BadgeCheck aria-hidden="true" size={32} />
                  <h2>Signed in</h2>
                  <p>{session.user.email}</p>
                  <div className="account-actions">
                    <button className="button button-primary" type="button" onClick={() => void loadOrders()}>
                      <RefreshCw aria-hidden="true" size={17} />
                      Refresh Orders
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => void signOut()}>
                      <LogOut aria-hidden="true" size={17} />
                      Sign Out
                    </button>
                  </div>
                  {error ? <p className="account-error">{error}</p> : null}
                </div>

                <section className="account-orders" aria-label="Order history">
                  <div className="account-section-heading">
                    <PackageCheck aria-hidden="true" size={22} />
                    <div>
                      <h2>Order history</h2>
                      <p>Paid Armoze orders connected to this email.</p>
                    </div>
                  </div>

                  {ordersLoading ? <p className="account-muted">Loading your recent orders...</p> : null}
                  {ordersError ? <p className="account-error">{ordersError}</p> : null}

                  {!ordersLoading && !ordersError && orders.length === 0 ? (
                    <div className="account-empty-orders">
                      <Inbox aria-hidden="true" size={26} />
                      <h3>No paid orders yet</h3>
                      <p>Orders appear here after checkout is completed with this email address.</p>
                      <Link className="button button-secondary" href="/collections/best-sellers">
                        Browse Prints
                      </Link>
                    </div>
                  ) : null}

                  {orders.length ? (
                    <div className="account-order-list">
                      {orders.map((order) => (
                        <article className="account-order-card" key={order.id}>
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
                          ) : null}

                          <ul className="account-order-items">
                            {order.items.map((item, index) => (
                              <li key={`${order.id}-${item.productId}-${index}`}>
                                <span>
                                  {item.quantity} x {item.title}
                                </span>
                                <small>
                                  {[item.sizeLabel, item.frameLabel].filter(Boolean).join(' / ')}
                                </small>
                              </li>
                            ))}
                          </ul>

                          <div className="account-order-footer">
                            <span>Production takes about 5–8 business days before shipment. Transit begins afterward; delivery dates are not guaranteed.</span>
                            <a href={getSupportHref(order.id)}>Get help</a>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              </>
            ) : (
              <div className="account-state">
                <ShieldCheck aria-hidden="true" size={32} />
                <h2>Sign in to continue</h2>
                <p>Open your Armoze account to keep your email and support flow connected.</p>
                <Link className="button button-primary" href="/sign-in">
                  Sign In
                </Link>
              </div>
            )}
          </aside>
        </section>
      </main>
    </StorefrontShell>
  );
}
