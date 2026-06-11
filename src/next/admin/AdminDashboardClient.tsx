'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Bell,
  Box,
  DollarSign,
  Inbox,
  LogOut,
  Mail,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  getProductAspectRatio,
  normalizeCatalogData,
  type CatalogData,
  type FrameOption,
  type Product,
  type SizeOption,
} from '../../data/products';
import { formatPrice } from '../storefront/product-utils';

type AdminOrderItem = {
  productId: string;
  title: string;
  imagePath?: string;
  sizeId?: string;
  sizeLabel?: string;
  frameId?: string;
  frameLabel?: string;
  quantity: number;
  unitAmount: number;
  lineTotal: number;
};

type AdminOrder = {
  id: string;
  stripeSessionId: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  amountTotal: number;
  items: AdminOrderItem[];
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  shippedAt?: string | null;
  ownerNotificationSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminSummary = {
  orderCount: number;
  paidOrderCount: number;
  newOrderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
};

type AdminNotification = {
  id: string;
  type: string;
  orderId: string | null;
  title: string;
  body: string;
  channel: string;
  status: string;
  createdAt: string;
};

type AdminDashboardResponse = {
  orders: AdminOrder[];
  summary: AdminSummary;
  notifications: AdminNotification[];
};

type AdminOrderUpdatePayload = {
  fulfillmentStatus?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

type AdminProductDraft = Product & {
  galleryText: string;
  detailsText: string;
  collectionSlugsText: string;
};

const emptyAdminSummary: AdminSummary = {
  orderCount: 0,
  paidOrderCount: 0,
  newOrderCount: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
};

const fulfillmentStatusOptions = [
  { value: 'new', label: 'New' },
  { value: 'printing', label: 'Printing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

async function fetchAdminDashboard(adminToken: string) {
  const response = await fetch('/api/admin/orders', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Dashboard could not be loaded.');
  }

  return (await response.json()) as AdminDashboardResponse;
}


async function fetchAdminProducts(adminToken: string) {
  const response = await fetch('/api/admin/products', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Products could not be loaded.');
  }

  return normalizeCatalogData((await response.json()) as CatalogData).products;
}

async function fetchAdminAssets(adminToken: string) {
  const response = await fetch('/api/admin/assets', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Assets could not be loaded.');
  }

  return ((await response.json()) as { assets: string[] }).assets;
}

async function updateAdminProduct(adminToken: string, productId: string, product: Product) {
  const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Product could not be saved.');
  }

  return ((await response.json()) as { product: Product }).product;
}

function splitEditableLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function productToDraft(product: Product): AdminProductDraft {
  return {
    ...product,
    aspectRatio: getProductAspectRatio(product),
    galleryText: (product.gallery || []).join('\n'),
    detailsText: product.details.join('\n'),
    collectionSlugsText: product.collectionSlugs.join('\n'),
  };
}

function draftToProduct(draft: AdminProductDraft): Product {
  const { galleryText, detailsText, collectionSlugsText, ...product } = draft;

  return {
    ...product,
    gallery: splitEditableLines(galleryText),
    details: splitEditableLines(detailsText),
    collectionSlugs: splitEditableLines(collectionSlugsText),
  };
}

function parseDollarsToCents(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.round(number * 100));
}

function centsToDollars(value: number | undefined) {
  return ((value || 0) / 100).toFixed(2);
}

function centsListToDollars(value: number[] | undefined) {
  return (value || []).map((amount) => String((amount || 0) / 100)).join(', ');
}

function dollarsListToCents(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseDollarsToCents);
}

async function updateAdminOrder(
  adminToken: string,
  orderId: string,
  update: AdminOrderUpdatePayload,
) {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Order could not be updated.');
  }

  return (await response.json()) as { order: AdminOrder };
}

let orderAudioContext: AudioContext | null = null;

function getOrderAudioContext() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('This browser cannot play notification sounds.');
  }

  orderAudioContext ??= new AudioContextClass();

  return orderAudioContext;
}

async function playOrderDing() {
  const context = getOrderAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  const startAt = context.currentTime + 0.02;
  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0.0001, startAt);
  masterGain.gain.exponentialRampToValueAtTime(0.28, startAt + 0.03);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.9);
  masterGain.connect(context.destination);

  [
    { frequency: 880, offset: 0, duration: 0.22 },
    { frequency: 1174.66, offset: 0.16, duration: 0.32 },
  ].forEach((tone) => {
    const oscillator = context.createOscillator();
    const toneGain = context.createGain();
    const toneStart = startAt + tone.offset;
    const toneEnd = toneStart + tone.duration;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
    toneGain.gain.setValueAtTime(0.0001, toneStart);
    toneGain.gain.exponentialRampToValueAtTime(0.9, toneStart + 0.025);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
    oscillator.connect(toneGain);
    toneGain.connect(masterGain);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.03);
  });

  window.setTimeout(() => {
    masterGain.disconnect();
  }, 1200);
}

export default function AdminDashboardClient() {
  const [tokenInput, setTokenInput] = useState('');
  const [adminToken, setAdminToken] = useState(() =>
    typeof window === 'undefined' ? '' : window.sessionStorage.getItem('armoze_admin_token') || '',
  );
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(false);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [assetPaths, setAssetPaths] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productDraft, setProductDraft] = useState<AdminProductDraft | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productNotice, setProductNotice] = useState('');
  const knownNotificationIds = useRef<Set<string>>(new Set());

  const commitDashboardData = useCallback(
    (data: AdminDashboardResponse, options: { allowSound?: boolean } = {}) => {
      const newOrderAlerts = data.notifications.filter(
        (notification) =>
          notification.type === 'order_paid' && !knownNotificationIds.current.has(notification.id),
      );

      data.notifications.forEach((notification) => {
        knownNotificationIds.current.add(notification.id);
      });
      setDashboard(data);

      if (options.allowSound && notificationSoundEnabled && newOrderAlerts.length) {
        void playOrderDing().catch((soundError) => {
          setError(soundError instanceof Error ? soundError.message : 'Notification sound could not play.');
          setNotificationSoundEnabled(false);
        });
      }
    },
    [notificationSoundEnabled],
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (!adminToken) {
      return;
    }

    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [data, productData, assets] = await Promise.all([
          fetchAdminDashboard(adminToken),
          fetchAdminProducts(adminToken),
          fetchAdminAssets(adminToken),
        ]);

        if (active) {
          commitDashboardData(data, { allowSound: false });
          setAdminProducts(productData);
          setAssetPaths(assets);
          setSelectedProductId((currentSelectedProductId) => {
            const nextProductId = currentSelectedProductId || productData[0]?.id || '';
            const nextProduct = productData.find((product) => product.id === nextProductId) || productData[0];

            if (nextProduct) {
              setProductDraft(productToDraft(nextProduct));
            }

            return nextProduct?.id || '';
          });
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Dashboard could not be loaded.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [adminToken, commitDashboardData]);

  useEffect(() => {
    if (!adminToken) {
      return;
    }

    let active = true;
    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const data = await fetchAdminDashboard(adminToken);

          if (active) {
            commitDashboardData(data, { allowSound: true });
          }
        } catch {
          // Keep background polling quiet; manual refresh reports errors.
        }
      })();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [adminToken, commitDashboardData]);

  async function refreshDashboard() {
    if (!adminToken) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      commitDashboardData(await fetchAdminDashboard(adminToken), { allowSound: true });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Dashboard could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenInput.trim();

    if (!nextToken) {
      return;
    }

    window.sessionStorage.setItem('armoze_admin_token', nextToken);
    setAdminToken(nextToken);
    setTokenInput('');
    window.scrollTo({ top: 0 });
  }

  async function handleNotificationSoundToggle() {
    if (notificationSoundEnabled) {
      setNotificationSoundEnabled(false);
      return;
    }

    setError('');

    try {
      await playOrderDing();
      setNotificationSoundEnabled(true);
    } catch (soundError) {
      setError(soundError instanceof Error ? soundError.message : 'Notification sound could not play.');
      setNotificationSoundEnabled(false);
    }
  }

  function handleLogout() {
    window.sessionStorage.removeItem('armoze_admin_token');
    setAdminToken('');
    setDashboard(null);
    setError('');
    setNotificationSoundEnabled(false);
    knownNotificationIds.current.clear();
  }

  function replaceDashboardOrder(order: AdminOrder) {
    setDashboard((currentDashboard) => {
      if (!currentDashboard) {
        return currentDashboard;
      }

      return {
        ...currentDashboard,
        orders: currentDashboard.orders.map((candidate) =>
          candidate.id === order.id ? order : candidate,
        ),
      };
    });
  }

  async function handleFulfillmentChange(orderId: string, fulfillmentStatus: string) {
    if (!adminToken) {
      return;
    }

    setUpdatingOrderId(orderId);
    setError('');

    try {
      const { order } = await updateAdminOrder(adminToken, orderId, { fulfillmentStatus });

      replaceDashboardOrder(order);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Order status could not be updated.');
    } finally {
      setUpdatingOrderId('');
    }
  }

  async function handleTrackingSubmit(order: AdminOrder, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adminToken) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setUpdatingOrderId(order.id);
    setError('');

    try {
      const { order: updatedOrder } = await updateAdminOrder(adminToken, order.id, {
        carrier: String(formData.get('carrier') || ''),
        trackingNumber: String(formData.get('trackingNumber') || ''),
        trackingUrl: String(formData.get('trackingUrl') || ''),
      });

      replaceDashboardOrder(updatedOrder);
    } catch (trackingError) {
      setError(trackingError instanceof Error ? trackingError.message : 'Tracking details could not be saved.');
    } finally {
      setUpdatingOrderId('');
    }
  }

  function selectProductForEditing(productId: string) {
    const product = adminProducts.find((candidate) => candidate.id === productId);

    if (!product) {
      return;
    }

    setSelectedProductId(product.id);
    setProductDraft(productToDraft(product));
    setProductNotice('');
  }

  function updateProductDraftField<Key extends keyof AdminProductDraft>(
    field: Key,
    value: AdminProductDraft[Key],
  ) {
    setProductDraft((currentDraft) => (currentDraft ? { ...currentDraft, [field]: value } : currentDraft));
  }

  function updateDraftSizeOption(index: number, update: Partial<SizeOption>) {
    setProductDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        sizeOptions: currentDraft.sizeOptions.map((option, optionIndex) =>
          optionIndex === index ? { ...option, ...update } : option,
        ),
      };
    });
  }

  function addDraftSizeOption() {
    setProductDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        sizeOptions: [
          ...currentDraft.sizeOptions,
          {
            id: 'new-size',
            label: 'New Size',
            priceInCents: 0,
          },
        ],
      };
    });
  }

  function removeDraftSizeOption(index: number) {
    setProductDraft((currentDraft) => {
      if (!currentDraft || currentDraft.sizeOptions.length <= 1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        sizeOptions: currentDraft.sizeOptions.filter((_, optionIndex) => optionIndex !== index),
      };
    });
  }

  function updateDraftFrameOption(index: number, update: Partial<FrameOption>) {
    setProductDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        frameOptions: currentDraft.frameOptions.map((option, optionIndex) =>
          optionIndex === index ? { ...option, ...update } : option,
        ),
      };
    });
  }

  function addDraftFrameOption() {
    setProductDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        frameOptions: [
          ...currentDraft.frameOptions,
          {
            id: 'new-frame',
            label: 'New Frame',
            priceDeltaInCents: 0,
            priceDeltaBySizeIndexInCents: [],
          },
        ],
      };
    });
  }

  function removeDraftFrameOption(index: number) {
    setProductDraft((currentDraft) => {
      if (!currentDraft || currentDraft.frameOptions.length <= 1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        frameOptions: currentDraft.frameOptions.filter((_, optionIndex) => optionIndex !== index),
      };
    });
  }

  async function saveProductDraft() {
    if (!adminToken || !productDraft) {
      return;
    }

    setSavingProduct(true);
    setError('');
    setProductNotice('');

    try {
      const savedProduct = await updateAdminProduct(adminToken, productDraft.id, draftToProduct(productDraft));
      const nextProducts = adminProducts.map((product) =>
        product.id === savedProduct.id ? savedProduct : product,
      );

      setAdminProducts(nextProducts);
      setProductDraft(productToDraft(savedProduct));
      setProductNotice('Product saved. Storefront and checkout are using the updated data.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Product could not be saved.');
    } finally {
      setSavingProduct(false);
    }
  }

  const summary = dashboard?.summary ?? emptyAdminSummary;
  const orders = dashboard?.orders ?? [];
  const notifications = dashboard?.notifications ?? [];

  if (!adminToken) {
    return (
      <main className="admin-page admin-login-page">
        <section className="admin-login-panel">
          <p className="eyebrow">Armoze Admin</p>
          <h1>Store dashboard</h1>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-token">Admin token</label>
            <input
              id="admin-token"
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              autoComplete="current-password"
            />
            <button className="button button-primary" type="submit">
              Open Dashboard
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Armoze Admin</p>
          <h1>Orders and alerts</h1>
          <p>Track paid orders, fulfillment status, and owner notifications from one place.</p>
        </div>
        <div className="admin-actions">
          <button
            className={`button button-secondary sound-toggle ${
              notificationSoundEnabled ? 'enabled' : ''
            }`}
            type="button"
            onClick={handleNotificationSoundToggle}
          >
            {notificationSoundEnabled ? (
              <Volume2 aria-hidden="true" size={17} />
            ) : (
              <VolumeX aria-hidden="true" size={17} />
            )}
            {notificationSoundEnabled ? 'Ding On' : 'Enable Ding'}
          </button>
          <button className="button button-secondary" type="button" onClick={refreshDashboard}>
            <RefreshCw aria-hidden="true" size={17} />
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <button className="button button-secondary" type="button" onClick={handleLogout}>
            <LogOut aria-hidden="true" size={17} />
            Log Out
          </button>
        </div>
      </section>

      {error ? <div className="admin-alert">{error}</div> : null}

      <section className="admin-stat-grid" aria-label="Store summary">
        <div className="admin-stat">
          <DollarSign aria-hidden="true" size={24} />
          <span>Total Revenue</span>
          <strong>{formatPrice(summary.totalRevenue)}</strong>
        </div>
        <div className="admin-stat">
          <ShoppingBag aria-hidden="true" size={24} />
          <span>Paid Orders</span>
          <strong>{summary.paidOrderCount}</strong>
        </div>
        <div className="admin-stat">
          <Inbox aria-hidden="true" size={24} />
          <span>New Orders</span>
          <strong>{summary.newOrderCount}</strong>
        </div>
        <div className="admin-stat">
          <PackageCheck aria-hidden="true" size={24} />
          <span>Average Order</span>
          <strong>{formatPrice(summary.averageOrderValue)}</strong>
        </div>
      </section>

      <section className="admin-product-editor" aria-label="Product editor">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>Product editor</h2>
          </div>
          <span>{adminProducts.length} products</span>
        </div>

        <datalist id="admin-asset-paths">
          {assetPaths.map((assetPath) => (
            <option key={assetPath} value={assetPath} />
          ))}
        </datalist>

        <div className="admin-product-workbench">
          <aside className="admin-product-list" aria-label="Products">
            {adminProducts.map((product) => (
              <button
                className={product.id === selectedProductId ? 'active' : ''}
                key={product.id}
                type="button"
                onClick={() => selectProductForEditing(product.id)}
              >
                <span>{product.title}</span>
                <small>{product.published ? 'Published' : 'Hidden'}</small>
              </button>
            ))}
          </aside>

          {productDraft ? (
            <div className="admin-product-form">
              <div className="admin-product-form-topline">
                <div>
                  <h3>{productDraft.title}</h3>
                  <p>{productDraft.id}</p>
                </div>
                <label className="publish-toggle">
                  <input
                    type="checkbox"
                    checked={productDraft.published}
                    onChange={(event) => updateProductDraftField('published', event.target.checked)}
                  />
                  Published
                </label>
              </div>

              <div className="admin-form-grid">
                <label>
                  Product title
                  <input
                    value={productDraft.title}
                    onChange={(event) => updateProductDraftField('title', event.target.value)}
                  />
                </label>
                <label>
                  Slug
                  <input
                    value={productDraft.slug}
                    onChange={(event) => updateProductDraftField('slug', event.target.value)}
                  />
                </label>
                <label>
                  SEO title
                  <input
                    value={productDraft.seoTitle || ''}
                    onChange={(event) => updateProductDraftField('seoTitle', event.target.value)}
                  />
                </label>
                <label>
                  Main image path
                  <input
                    list="admin-asset-paths"
                    value={productDraft.image || ''}
                    onChange={(event) => updateProductDraftField('image', event.target.value)}
                  />
                </label>
              </div>

              <label className="admin-field">
                Short description
                <textarea
                  rows={2}
                  value={productDraft.description}
                  onChange={(event) => updateProductDraftField('description', event.target.value)}
                />
              </label>

              <label className="admin-field">
                SEO description
                <textarea
                  rows={2}
                  value={productDraft.seoDescription || ''}
                  onChange={(event) => updateProductDraftField('seoDescription', event.target.value)}
                />
              </label>

              <label className="admin-field">
                Long product description
                <textarea
                  rows={4}
                  value={productDraft.longDescription}
                  onChange={(event) => updateProductDraftField('longDescription', event.target.value)}
                />
              </label>

              <label className="admin-field">
                Exact image alt text
                <textarea
                  rows={2}
                  value={productDraft.imageAlt}
                  onChange={(event) => updateProductDraftField('imageAlt', event.target.value)}
                />
              </label>

              <div className="admin-form-grid">
                <label>
                  Artwork shape
                  <select
                    value={productDraft.artworkShape}
                    onChange={(event) =>
                      updateProductDraftField('artworkShape', event.target.value as Product['artworkShape'])
                    }
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                    <option value="square">Square</option>
                  </select>
                </label>
                <label>
                  Canvas aspect ratio
                  <select
                    value={productDraft.aspectRatio || getProductAspectRatio(productDraft)}
                    onChange={(event) => updateProductDraftField('aspectRatio', event.target.value)}
                  >
                    <option value="1 / 1">1 / 1 Square</option>
                    <option value="2 / 1">2 / 1 Panoramic</option>
                    <option value="3 / 2">3 / 2 Landscape</option>
                    <option value="4 / 3">4 / 3 Landscape</option>
                    <option value="3 / 4">3 / 4 Portrait</option>
                    <option value="4 / 5">4 / 5 Portrait</option>
                    <option value="2 / 3">2 / 3 Portrait</option>
                  </select>
                </label>
                <label>
                  Tone
                  <select
                    value={productDraft.tone}
                    onChange={(event) => updateProductDraftField('tone', event.target.value as Product['tone'])}
                  >
                    <option value="cassette">Cassette</option>
                    <option value="focus">Focus</option>
                    <option value="space">Space</option>
                    <option value="money">Money</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </label>
                <label>
                  Default size id
                  <input
                    value={productDraft.defaultSizeId || ''}
                    onChange={(event) => updateProductDraftField('defaultSizeId', event.target.value)}
                  />
                </label>
                <label>
                  Product type label
                  <input
                    value={productDraft.size}
                    onChange={(event) => updateProductDraftField('size', event.target.value)}
                  />
                </label>
              </div>

              <div className="admin-editor-columns">
                <label className="admin-field">
                  Gallery image paths
                  <textarea
                    rows={5}
                    value={productDraft.galleryText}
                    onChange={(event) => updateProductDraftField('galleryText', event.target.value)}
                  />
                </label>
                <label className="admin-field">
                  Product details
                  <textarea
                    rows={5}
                    value={productDraft.detailsText}
                    onChange={(event) => updateProductDraftField('detailsText', event.target.value)}
                  />
                </label>
                <label className="admin-field">
                  Collection slugs
                  <textarea
                    rows={5}
                    value={productDraft.collectionSlugsText}
                    onChange={(event) => updateProductDraftField('collectionSlugsText', event.target.value)}
                  />
                </label>
              </div>

              <div className="admin-nested-editor">
                <div className="admin-nested-heading">
                  <h3>Sizes and prices</h3>
                  <button type="button" onClick={addDraftSizeOption}>
                    <Plus aria-hidden="true" size={15} />
                    Add size
                  </button>
                </div>
                {productDraft.sizeOptions.map((option, index) => (
                  <div className="admin-size-row" key={`${option.id}-${index}`}>
                    <input
                      aria-label="Size id"
                      value={option.id}
                      onChange={(event) => updateDraftSizeOption(index, { id: event.target.value })}
                    />
                    <input
                      aria-label="Size label"
                      value={option.label}
                      onChange={(event) => updateDraftSizeOption(index, { label: event.target.value })}
                    />
                    <input
                      aria-label="Size price dollars"
                      type="number"
                      min="0"
                      step="0.01"
                      value={centsToDollars(option.priceInCents)}
                      onChange={(event) =>
                        updateDraftSizeOption(index, { priceInCents: parseDollarsToCents(event.target.value) })
                      }
                    />
                    <input
                      aria-label="Size badge"
                      value={option.badge || ''}
                      onChange={(event) => updateDraftSizeOption(index, { badge: event.target.value || undefined })}
                    />
                    <button type="button" aria-label="Remove size" onClick={() => removeDraftSizeOption(index)}>
                      <Trash2 aria-hidden="true" size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="admin-nested-editor">
                <div className="admin-nested-heading">
                  <h3>Frames and add-on prices</h3>
                  <button type="button" onClick={addDraftFrameOption}>
                    <Plus aria-hidden="true" size={15} />
                    Add frame
                  </button>
                </div>
                {productDraft.frameOptions.map((option, index) => (
                  <div className="admin-frame-row" key={`${option.id}-${index}`}>
                    <input
                      aria-label="Frame id"
                      value={option.id}
                      onChange={(event) => updateDraftFrameOption(index, { id: event.target.value })}
                    />
                    <input
                      aria-label="Frame label"
                      value={option.label}
                      onChange={(event) => updateDraftFrameOption(index, { label: event.target.value })}
                    />
                    <input
                      aria-label="Frame base price dollars"
                      type="number"
                      min="0"
                      step="0.01"
                      value={centsToDollars(option.priceDeltaInCents)}
                      onChange={(event) =>
                        updateDraftFrameOption(index, {
                          priceDeltaInCents: parseDollarsToCents(event.target.value),
                        })
                      }
                    />
                    <input
                      aria-label="Frame tier prices dollars"
                      value={centsListToDollars(option.priceDeltaBySizeIndexInCents)}
                      onChange={(event) =>
                        updateDraftFrameOption(index, {
                          priceDeltaBySizeIndexInCents: dollarsListToCents(event.target.value),
                        })
                      }
                    />
                    <button type="button" aria-label="Remove frame" onClick={() => removeDraftFrameOption(index)}>
                      <Trash2 aria-hidden="true" size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="admin-product-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => selectProductForEditing(selectedProductId)}
                >
                  Reset
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={savingProduct}
                  onClick={() => {
                    void saveProductDraft();
                  }}
                >
                  {savingProduct ? 'Saving' : 'Save Product'}
                </button>
              </div>

              {productNotice ? <p className="admin-product-notice">{productNotice}</p> : null}
            </div>
          ) : (
            <div className="admin-empty compact">
              <Box aria-hidden="true" size={30} />
              <h3>No product selected</h3>
              <p>Choose a product to edit catalog, pricing, and SEO fields.</p>
            </div>
          )}
        </div>
      </section>

      <section className="admin-layout">
        <div className="admin-orders">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">Fulfillment</p>
              <h2>Orders</h2>
            </div>
            <span>{orders.length} shown</span>
          </div>

          {orders.length ? (
            <div className="admin-order-list">
              {orders.map((order) => (
                <article className="admin-order" key={order.id}>
                  <div className="admin-order-topline">
                    <div>
                      <h3>{order.customerName || order.customerEmail || 'Customer'}</h3>
                      <p>{order.customerEmail || 'No email captured'}</p>
                    </div>
                    <div className="admin-order-money">
                      <strong>{formatPrice(order.amountTotal, order.currency)}</strong>
                      <span>{formatDateTime(order.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="admin-order-meta">
                    <span className={`status-pill ${order.paymentStatus}`}>
                      {order.paymentStatus}
                    </span>
                    <span>{order.id}</span>
                    <span>
                      {order.ownerNotificationSentAt ? (
                        <>
                          <Mail aria-hidden="true" size={14} />
                          Alert sent
                        </>
                      ) : (
                        <>
                          <Bell aria-hidden="true" size={14} />
                          Alert pending
                        </>
                      )}
                    </span>
                  </div>

                  <div className="admin-order-items">
                    {order.items.map((item) => (
                      <div
                        className="admin-order-item"
                        key={`${order.id}-${item.productId}-${item.sizeId}-${item.frameId || 'frame'}`}
                      >
                        {item.imagePath ? <img src={item.imagePath} alt="" aria-hidden="true" /> : <span />}
                        <div>
                          <strong>{item.title}</strong>
                          <small>
                            {item.quantity} x {item.sizeLabel || 'Canvas'} ·{' '}
                            {item.frameLabel || 'Canvas'} ·{' '}
                            {formatPrice(item.unitAmount, order.currency)}
                          </small>
                        </div>
                        <b>{formatPrice(item.lineTotal, order.currency)}</b>
                      </div>
                    ))}
                  </div>

                  <label className="admin-status-select">
                    <span>Fulfillment</span>
                    <select
                      value={order.fulfillmentStatus}
                      disabled={updatingOrderId === order.id}
                      onChange={(event) => {
                        void handleFulfillmentChange(order.id, event.target.value);
                      }}
                    >
                      {fulfillmentStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <form
                    className="admin-tracking-form"
                    key={`${order.id}-${order.updatedAt}-${order.trackingNumber}-${order.trackingUrl}`}
                    onSubmit={(event) => {
                      void handleTrackingSubmit(order, event);
                    }}
                  >
                    <label>
                      <span>Carrier</span>
                      <input
                        name="carrier"
                        defaultValue={order.carrier}
                        disabled={updatingOrderId === order.id}
                        placeholder="USPS, UPS, FedEx"
                      />
                    </label>
                    <label>
                      <span>Tracking #</span>
                      <input
                        name="trackingNumber"
                        defaultValue={order.trackingNumber}
                        disabled={updatingOrderId === order.id}
                        placeholder="Tracking number"
                      />
                    </label>
                    <label className="admin-tracking-url">
                      <span>Tracking URL</span>
                      <input
                        name="trackingUrl"
                        type="url"
                        defaultValue={order.trackingUrl}
                        disabled={updatingOrderId === order.id}
                        placeholder="https://..."
                      />
                    </label>
                    <button
                      className="button button-secondary"
                      type="submit"
                      disabled={updatingOrderId === order.id}
                    >
                      {updatingOrderId === order.id ? 'Saving' : 'Save Tracking'}
                    </button>
                  </form>

                  {order.trackingNumber || order.trackingUrl || order.shippedAt ? (
                    <div className="admin-tracking-summary">
                      <span>{order.carrier || 'Carrier pending'}</span>
                      {order.trackingNumber ? <strong>{order.trackingNumber}</strong> : null}
                      {order.trackingUrl ? (
                        <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                          Open tracking
                        </a>
                      ) : null}
                      {order.shippedAt ? <small>Shipped {formatDateTime(order.shippedAt)}</small> : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <ShoppingBag aria-hidden="true" size={34} />
              <h3>No orders yet</h3>
              <p>Paid Stripe orders will appear here after the webhook receives them.</p>
            </div>
          )}
        </div>

        <aside className="admin-notifications">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">Signals</p>
              <h2>Notifications</h2>
            </div>
          </div>

          {notifications.length ? (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article className="notification-row" key={notification.id}>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                  </div>
                  <span>
                    {notification.channel} · {notification.status}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty compact">
              <Bell aria-hidden="true" size={30} />
              <h3>No alerts yet</h3>
              <p>Order and email events will collect here.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
