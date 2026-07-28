'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import {
  Activity,
  Bell,
  Box,
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Inbox,
  LogOut,
  Mail,
  Megaphone,
  MousePointerClick,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Users,
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

type AdminAttributionTouch = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingPage?: string;
  capturedAt?: string;
  gclid?: string;
  fbclid?: string;
};

type AdminOrderAttribution = {
  firstTouch?: AdminAttributionTouch;
  lastTouch?: AdminAttributionTouch;
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
  raw?: {
    attribution?: AdminOrderAttribution;
  };
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

type AdminNewsletterResponse = {
  subscribers: {
    total: number;
    active: number;
    recent: Array<{
      email: string;
      source: string;
      status: string;
      updatedAt: string;
    }>;
  };
  marketing: {
    configured: boolean;
    resendConfigured: boolean;
    segmentConfigured: boolean;
    from: string;
    replyTo: string;
    error?: string;
  };
  broadcasts: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
    scheduledAt?: string | null;
    sentAt?: string | null;
  }>;
};

type NewsletterDraft = {
  subject: string;
  previewText: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
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

type AdminView = 'orders' | 'catalog' | 'newsletter' | 'activity';
type AdminOrderFilter = 'action' | 'all' | 'unpaid' | 'complete';

const adminSessionEvent = 'armoze-admin-session';

const emptyAdminSummary: AdminSummary = {
  orderCount: 0,
  paidOrderCount: 0,
  newOrderCount: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
};
const emptyAdminOrders: AdminOrder[] = [];

const fulfillmentStatusOptions = [
  { value: 'new', label: 'New' },
  { value: 'printing', label: 'Printing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const initialNewsletterDraft: NewsletterDraft = {
  subject: 'A fresh Armoze drop for your walls',
  previewText: 'New work from the Armoze studio is ready to explore.',
  headline: 'The next piece your room was waiting for.',
  body:
    'A new set of statement canvases just landed at Armoze.\n\nBuilt for focus, ambition, and the spaces where your next chapter takes shape.',
  ctaLabel: 'Explore the new drop',
  ctaUrl: 'https://armoze.com',
  imageUrl: '',
};

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

function shortenIdentifier(value: string) {
  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-7)}`;
}

function shortenNotificationIdentifiers(value: string) {
  return value.replace(/\b(?:cs|pi|ch|ord|notif)_[A-Za-z0-9_]{24,}\b/g, shortenIdentifier);
}

function titleCaseAttributionValue(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAttributionSource(touch: AdminAttributionTouch | undefined) {
  if (!touch?.source) {
    return 'Not captured';
  }

  if (touch.source === 'direct') {
    return 'Direct visit';
  }

  const source = titleCaseAttributionValue(touch.source.replace(/^www\./, ''));
  const medium = touch.medium && touch.medium !== 'none'
    ? titleCaseAttributionValue(touch.medium)
    : '';

  return medium ? `${source} · ${medium}` : source;
}

function formatReferrer(value: string | undefined) {
  if (!value) {
    return '';
  }

  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

function getFulfillmentLabel(value: string) {
  return fulfillmentStatusOptions.find((option) => option.value === value)?.label || value;
}

function subscribeToAdminSession(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(adminSessionEvent, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(adminSessionEvent, onStoreChange);
  };
}

function getAdminSessionToken() {
  return window.sessionStorage.getItem('armoze_admin_token') || '';
}

function getServerAdminSessionToken() {
  return '';
}

function subscribeToHydration() {
  return () => {};
}

function getClientHydrationStatus() {
  return true;
}

function getServerHydrationStatus() {
  return false;
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

async function fetchAdminNewsletter(adminToken: string) {
  const response = await fetch('/api/admin/newsletter', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Newsletter data could not be loaded.');
  }

  return (await response.json()) as AdminNewsletterResponse;
}

async function runAdminNewsletterAction(
  adminToken: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch('/api/admin/newsletter', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Newsletter action could not be completed.');
  }

  return (await response.json()) as Record<string, unknown>;
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
  const adminToken = useSyncExternalStore(
    subscribeToAdminSession,
    getAdminSessionToken,
    getServerAdminSessionToken,
  );
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationStatus,
    getServerHydrationStatus,
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
  const [newsletter, setNewsletter] = useState<AdminNewsletterResponse | null>(null);
  const [newsletterDraft, setNewsletterDraft] = useState<NewsletterDraft>(initialNewsletterDraft);
  const [newsletterBusy, setNewsletterBusy] = useState<'draft' | 'sync' | ''>('');
  const [newsletterNotice, setNewsletterNotice] = useState('');
  const [activeView, setActiveView] = useState<AdminView>('orders');
  const [orderFilter, setOrderFilter] = useState<AdminOrderFilter>('action');
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
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
      setLastUpdatedAt(new Date().toISOString());

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
        const [data, productData, assets, newsletterData] = await Promise.all([
          fetchAdminDashboard(adminToken),
          fetchAdminProducts(adminToken),
          fetchAdminAssets(adminToken),
          fetchAdminNewsletter(adminToken),
        ]);

        if (active) {
          commitDashboardData(data, { allowSound: false });
          setAdminProducts(productData);
          setAssetPaths(assets);
          setNewsletter(newsletterData);
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
      const [dashboardData, newsletterData] = await Promise.all([
        fetchAdminDashboard(adminToken),
        fetchAdminNewsletter(adminToken),
      ]);
      commitDashboardData(dashboardData, { allowSound: true });
      setNewsletter(newsletterData);
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
    window.dispatchEvent(new Event(adminSessionEvent));
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
    window.dispatchEvent(new Event(adminSessionEvent));
    setDashboard(null);
    setError('');
    setNotificationSoundEnabled(false);
    knownNotificationIds.current.clear();
  }

  async function copyOrderIdentifier(order: AdminOrder) {
    const identifier = order.stripeSessionId || order.id;

    setError('');

    try {
      await navigator.clipboard.writeText(identifier);
      setCopiedOrderId(order.id);
      window.setTimeout(() => {
        setCopiedOrderId((currentOrderId) => (currentOrderId === order.id ? '' : currentOrderId));
      }, 1800);
    } catch {
      setError('Order ID could not be copied.');
    }
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

  function updateNewsletterDraftField<Field extends keyof NewsletterDraft>(
    field: Field,
    value: NewsletterDraft[Field],
  ) {
    setNewsletterDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  async function handleCreateNewsletterDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adminToken) {
      return;
    }

    setNewsletterBusy('draft');
    setNewsletterNotice('');
    setError('');

    try {
      await runAdminNewsletterAction(adminToken, {
        action: 'create-draft',
        ...newsletterDraft,
      });
      setNewsletter(await fetchAdminNewsletter(adminToken));
      setNewsletterNotice('Draft created in Resend. Review it, send yourself a test, then schedule or send it from Resend.');
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : 'Newsletter draft could not be created.');
    } finally {
      setNewsletterBusy('');
    }
  }

  async function handleSyncNewsletterSubscribers() {
    if (!adminToken) {
      return;
    }

    setNewsletterBusy('sync');
    setNewsletterNotice('');
    setError('');

    try {
      const result = await runAdminNewsletterAction(adminToken, { action: 'sync' });
      setNewsletter(await fetchAdminNewsletter(adminToken));
      setNewsletterNotice(
        `${Number(result.synced || 0)} of ${Number(result.total || 0)} active subscribers synced to Resend.`,
      );
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Subscribers could not be synced.');
    } finally {
      setNewsletterBusy('');
    }
  }

  const summary = dashboard?.summary ?? emptyAdminSummary;
  const orders = dashboard?.orders ?? emptyAdminOrders;
  const notifications = dashboard?.notifications ?? [];
  const actionableOrderCount = orders.filter(
    (order) =>
      order.paymentStatus === 'paid' &&
      order.fulfillmentStatus !== 'delivered' &&
      order.fulfillmentStatus !== 'cancelled',
  ).length;
  const unpaidOrderCount = orders.filter((order) => order.paymentStatus !== 'paid').length;
  const completedOrderCount = orders.filter(
    (order) =>
      order.paymentStatus === 'paid' &&
      (order.fulfillmentStatus === 'delivered' || order.fulfillmentStatus === 'cancelled'),
  ).length;
  const publishedProductCount = adminProducts.filter((product) => product.published).length;
  const filteredOrders = useMemo(() => {
    const normalizedSearch = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        orderFilter === 'all' ||
        (orderFilter === 'action' &&
          order.paymentStatus === 'paid' &&
          order.fulfillmentStatus !== 'delivered' &&
          order.fulfillmentStatus !== 'cancelled') ||
        (orderFilter === 'unpaid' && order.paymentStatus !== 'paid') ||
        (orderFilter === 'complete' &&
          order.paymentStatus === 'paid' &&
          (order.fulfillmentStatus === 'delivered' || order.fulfillmentStatus === 'cancelled'));

      if (!matchesFilter || !normalizedSearch) {
        return matchesFilter;
      }

      return [
        order.id,
        order.stripeSessionId,
        order.customerName,
        order.customerEmail,
        order.trackingNumber,
        order.carrier,
        order.raw?.attribution?.firstTouch?.source,
        order.raw?.attribution?.firstTouch?.campaign,
        order.raw?.attribution?.lastTouch?.source,
        order.raw?.attribution?.lastTouch?.campaign,
        ...order.items.map((item) => item.title),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [orderFilter, orderSearch, orders]);
  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return adminProducts;
    }

    return adminProducts.filter((product) =>
      [product.title, product.slug, product.id].join(' ').toLowerCase().includes(normalizedSearch),
    );
  }, [adminProducts, productSearch]);
  const selectedProduct = adminProducts.find((product) => product.id === selectedProductId);
  const productHasChanges = Boolean(
    productDraft &&
      selectedProduct &&
      JSON.stringify(draftToProduct(productDraft)) !== JSON.stringify(selectedProduct),
  );

  if (!hasHydrated) {
    return (
      <main className="admin-page admin-login-page">
        <section className="admin-login-panel admin-session-loading" aria-label="Loading admin session">
          <RefreshCw className="is-spinning" aria-hidden="true" size={22} />
          <span>Loading admin</span>
        </section>
      </main>
    );
  }

  if (!adminToken) {
    return (
      <main className="admin-page admin-login-page">
        <section className="admin-login-panel">
          <div className="admin-login-mark" aria-hidden="true">
            <ShieldCheck size={24} />
          </div>
          <p className="eyebrow">Private workspace</p>
          <h1>Armoze Admin</h1>
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
      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-brand-lockup">
            <span className="admin-brand-mark" aria-hidden="true">
              <Store size={20} />
            </span>
            <div>
              <p>Armoze Admin</p>
              <h1>Store operations</h1>
            </div>
          </div>

          <div className="admin-header-meta">
            <span className="admin-sync-status">
              <i aria-hidden="true" />
              {lastUpdatedAt ? `Updated ${formatDateTime(lastUpdatedAt)}` : 'Connecting'}
            </span>
            <div className="admin-actions">
              <button
                className={`admin-icon-button sound-toggle ${notificationSoundEnabled ? 'enabled' : ''}`}
                type="button"
                onClick={handleNotificationSoundToggle}
                aria-label={notificationSoundEnabled ? 'Disable new order sound' : 'Enable new order sound'}
                title={notificationSoundEnabled ? 'Disable new order sound' : 'Enable new order sound'}
              >
                {notificationSoundEnabled ? (
                  <Volume2 aria-hidden="true" size={18} />
                ) : (
                  <VolumeX aria-hidden="true" size={18} />
                )}
              </button>
              <button
                className="admin-icon-button"
                type="button"
                onClick={refreshDashboard}
                aria-label="Refresh dashboard"
                title="Refresh dashboard"
                disabled={loading}
              >
                <RefreshCw aria-hidden="true" className={loading ? 'is-spinning' : ''} size={18} />
              </button>
              <button
                className="admin-icon-button"
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
        </header>

        {error ? <div className="admin-alert" role="alert">{error}</div> : null}

        <section className="admin-stat-grid" aria-label="Store summary">
          <div className="admin-stat">
            <span className="admin-stat-icon"><DollarSign aria-hidden="true" size={18} /></span>
            <div><span>Total revenue</span><strong>{formatPrice(summary.totalRevenue)}</strong></div>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-icon"><ShoppingBag aria-hidden="true" size={18} /></span>
            <div><span>Paid orders</span><strong>{summary.paidOrderCount}</strong></div>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-icon"><Inbox aria-hidden="true" size={18} /></span>
            <div><span>New to fulfill</span><strong>{summary.newOrderCount}</strong></div>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-icon"><PackageCheck aria-hidden="true" size={18} /></span>
            <div><span>Average order</span><strong>{formatPrice(summary.averageOrderValue)}</strong></div>
          </div>
        </section>

        <nav className="admin-tabs" aria-label="Admin views" role="tablist">
          <button
            className={activeView === 'orders' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'orders'}
            aria-controls="admin-orders-view"
            onClick={() => setActiveView('orders')}
          >
            <ShoppingBag aria-hidden="true" size={17} />
            Orders
            <span>{actionableOrderCount}</span>
          </button>
          <button
            className={activeView === 'catalog' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'catalog'}
            aria-controls="admin-catalog-view"
            onClick={() => setActiveView('catalog')}
          >
            <Box aria-hidden="true" size={17} />
            Catalog
            <span>{adminProducts.length}</span>
          </button>
          <button
            className={activeView === 'newsletter' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'newsletter'}
            aria-controls="admin-newsletter-view"
            onClick={() => setActiveView('newsletter')}
          >
            <Megaphone aria-hidden="true" size={17} />
            Newsletter
            <span>{newsletter?.subscribers.active || 0}</span>
          </button>
          <button
            className={activeView === 'activity' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'activity'}
            aria-controls="admin-activity-view"
            onClick={() => setActiveView('activity')}
          >
            <Activity aria-hidden="true" size={17} />
            Activity
            <span>{notifications.length}</span>
          </button>
        </nav>

      {activeView === 'catalog' ? (
      <section
        className="admin-product-editor admin-view-panel"
        id="admin-catalog-view"
        role="tabpanel"
        aria-label="Product editor"
      >
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>Products</h2>
          </div>
          <span>{publishedProductCount} published · {adminProducts.length} total</span>
        </div>

        <datalist id="admin-asset-paths">
          {assetPaths.map((assetPath) => (
            <option key={assetPath} value={assetPath} />
          ))}
        </datalist>

        <div className="admin-product-workbench">
          <aside className="admin-product-sidebar" aria-label="Products">
            <label className="admin-search-field admin-product-search">
              <Search aria-hidden="true" size={17} />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
              />
            </label>
            <div className="admin-product-list">
              {filteredProducts.map((product) => (
                <button
                  className={product.id === selectedProductId ? 'active' : ''}
                  key={product.id}
                  type="button"
                  onClick={() => selectProductForEditing(product.id)}
                >
                  {product.image ? <img src={product.image} alt="" aria-hidden="true" /> : <Box aria-hidden="true" size={18} />}
                  <span>
                    <b>{product.title}</b>
                    <small>{product.published ? 'Published' : 'Hidden'}</small>
                  </span>
                </button>
              ))}
              {!filteredProducts.length ? (
                <p className="admin-product-list-empty">No matching products.</p>
              ) : null}
            </div>
          </aside>

          {productDraft ? (
            <div className="admin-product-form">
              <div className="admin-product-form-topline">
                <div>
                  <h3>{productDraft.title}</h3>
                  <p>{productDraft.id}{productHasChanges ? ' · Unsaved changes' : ''}</p>
                </div>
                <div className="admin-product-top-actions">
                  <a
                    className="admin-icon-button"
                    href={`/products/${productDraft.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open product page"
                    title="Open product page"
                  >
                    <ExternalLink aria-hidden="true" size={17} />
                  </a>
                  <label className="publish-toggle">
                    <input
                      type="checkbox"
                      checked={productDraft.published}
                      onChange={(event) => updateProductDraftField('published', event.target.checked)}
                    />
                    Published
                  </label>
                </div>
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
                  disabled={!productHasChanges || savingProduct}
                  onClick={() => selectProductForEditing(selectedProductId)}
                >
                  <RefreshCw aria-hidden="true" size={16} />
                  Reset
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={savingProduct || !productHasChanges}
                  onClick={() => {
                    void saveProductDraft();
                  }}
                >
                  <Check aria-hidden="true" size={16} />
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
      ) : null}

      {activeView === 'newsletter' ? (
        <section
          className="admin-newsletter admin-view-panel"
          id="admin-newsletter-view"
          role="tabpanel"
          aria-label="Newsletter"
        >
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">Bring people back</p>
              <h2>Newsletter</h2>
            </div>
            <span>{newsletter?.subscribers.active || 0} active subscribers</span>
          </div>

          {!newsletter?.marketing.configured ? (
            <div className="admin-newsletter-setup" role="status">
              <Megaphone aria-hidden="true" size={22} />
              <div>
                <strong>Connect your Resend subscriber segment</strong>
                <p>
                  Add <code>RESEND_SEGMENT_ID</code> in Vercel. New signups will then sync automatically,
                  and this screen can create reviewable newsletter drafts.
                </p>
              </div>
              <a className="button button-secondary" href="https://resend.com/segments" target="_blank" rel="noreferrer">
                Open Resend
                <ExternalLink aria-hidden="true" size={14} />
              </a>
            </div>
          ) : null}

          {newsletter?.marketing.error ? (
            <div className="admin-newsletter-warning">{newsletter.marketing.error}</div>
          ) : null}

          <div className="admin-newsletter-layout">
            <form className="admin-newsletter-composer" onSubmit={handleCreateNewsletterDraft}>
              <div className="admin-newsletter-card-heading">
                <div>
                  <span>Campaign draft</span>
                  <h3>Write the next Armoze send</h3>
                </div>
                <Megaphone aria-hidden="true" size={21} />
              </div>

              <label>
                Subject line
                <input
                  required
                  maxLength={150}
                  value={newsletterDraft.subject}
                  onChange={(event) => updateNewsletterDraftField('subject', event.target.value)}
                />
              </label>
              <label>
                Inbox preview text
                <input
                  required
                  maxLength={200}
                  value={newsletterDraft.previewText}
                  onChange={(event) => updateNewsletterDraftField('previewText', event.target.value)}
                />
              </label>
              <label>
                Main headline
                <input
                  required
                  maxLength={160}
                  value={newsletterDraft.headline}
                  onChange={(event) => updateNewsletterDraftField('headline', event.target.value)}
                />
              </label>
              <label>
                Message
                <textarea
                  required
                  rows={7}
                  maxLength={4000}
                  value={newsletterDraft.body}
                  onChange={(event) => updateNewsletterDraftField('body', event.target.value)}
                />
              </label>
              <div className="admin-newsletter-fields">
                <label>
                  Button label
                  <input
                    required
                    maxLength={60}
                    value={newsletterDraft.ctaLabel}
                    onChange={(event) => updateNewsletterDraftField('ctaLabel', event.target.value)}
                  />
                </label>
                <label>
                  Button link
                  <input
                    required
                    type="url"
                    value={newsletterDraft.ctaUrl}
                    onChange={(event) => updateNewsletterDraftField('ctaUrl', event.target.value)}
                  />
                </label>
              </div>
              <label>
                Hero image link <span>Optional — use a full image URL</span>
                <input
                  type="url"
                  placeholder="https://armoze.com/artwork/..."
                  value={newsletterDraft.imageUrl}
                  onChange={(event) => updateNewsletterDraftField('imageUrl', event.target.value)}
                />
              </label>

              <div className="admin-newsletter-actions">
                <p>
                  This creates a draft only. Review it and send yourself a test in Resend before it goes to subscribers.
                </p>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={!newsletter?.marketing.configured || Boolean(newsletterBusy)}
                >
                  <Megaphone aria-hidden="true" size={15} />
                  {newsletterBusy === 'draft' ? 'Creating draft' : 'Create Resend draft'}
                </button>
              </div>

              {newsletterNotice ? <p className="admin-product-notice">{newsletterNotice}</p> : null}
            </form>

            <aside className="admin-newsletter-sidebar">
              <section>
                <div className="admin-newsletter-card-heading">
                  <div>
                    <span>Audience</span>
                    <h3>{newsletter?.subscribers.active || 0} ready to reach</h3>
                  </div>
                  <Users aria-hidden="true" size={21} />
                </div>
                <dl className="admin-newsletter-stats">
                  <div><dt>Active</dt><dd>{newsletter?.subscribers.active || 0}</dd></div>
                  <div><dt>All signups</dt><dd>{newsletter?.subscribers.total || 0}</dd></div>
                </dl>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={!newsletter?.marketing.configured || Boolean(newsletterBusy)}
                  onClick={() => {
                    void handleSyncNewsletterSubscribers();
                  }}
                >
                  <RefreshCw
                    aria-hidden="true"
                    className={newsletterBusy === 'sync' ? 'is-spinning' : ''}
                    size={15}
                  />
                  {newsletterBusy === 'sync' ? 'Syncing' : 'Sync subscribers'}
                </button>
              </section>

              <section>
                <div className="admin-newsletter-card-heading">
                  <div>
                    <span>Recent</span>
                    <h3>Resend campaigns</h3>
                  </div>
                  <Mail aria-hidden="true" size={21} />
                </div>
                {newsletter?.broadcasts.length ? (
                  <div className="admin-broadcast-list">
                    {newsletter.broadcasts.map((broadcast) => (
                      <div key={broadcast.id}>
                        <strong>{broadcast.name}</strong>
                        <span>{broadcast.status} · {formatDateTime(broadcast.sentAt || broadcast.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-newsletter-empty">Your first campaign draft will appear here.</p>
                )}
                <a className="admin-newsletter-link" href="https://resend.com/broadcasts" target="_blank" rel="noreferrer">
                  Review drafts in Resend
                  <ExternalLink aria-hidden="true" size={13} />
                </a>
              </section>
            </aside>
          </div>
        </section>
      ) : null}

      {activeView === 'orders' ? (
      <section
        className="admin-orders admin-view-panel"
        id="admin-orders-view"
        role="tabpanel"
        aria-label="Orders"
      >
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Fulfillment</p>
            <h2>Orders</h2>
          </div>
          <span>{filteredOrders.length} of {orders.length}</span>
        </div>

        <div className="admin-toolbar">
          <label className="admin-search-field">
            <Search aria-hidden="true" size={17} />
            <input
              type="search"
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Search customer, order, or product"
              aria-label="Search orders"
            />
          </label>
          <div className="admin-filter-group" role="group" aria-label="Filter orders">
            {([
              ['action', 'Needs action', actionableOrderCount],
              ['all', 'All', orders.length],
              ['unpaid', 'Unpaid', unpaidOrderCount],
              ['complete', 'Closed', completedOrderCount],
            ] as const).map(([value, label, count]) => (
              <button
                className={orderFilter === value ? 'active' : ''}
                key={value}
                type="button"
                onClick={() => setOrderFilter(value)}
                aria-pressed={orderFilter === value}
              >
                {label}<span>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {loading && !dashboard ? (
          <div className="admin-empty">
            <RefreshCw className="is-spinning" aria-hidden="true" size={28} />
            <h3>Loading orders</h3>
          </div>
        ) : filteredOrders.length ? (
          <div className="admin-order-list">
            {filteredOrders.map((order) => {
              const isPaid = order.paymentStatus === 'paid';
              const hasTracking = Boolean(order.trackingNumber || order.trackingUrl);
              const orderIdentifier = order.stripeSessionId || order.id;
              const attribution = order.raw?.attribution;
              const lastTouch = attribution?.lastTouch || attribution?.firstTouch;
              const firstTouch = attribution?.firstTouch;

              return (
                <article className="admin-order" key={order.id}>
                  <div className="admin-order-topline">
                    <div className="admin-order-customer">
                      <h3>{order.customerName || order.customerEmail || (isPaid ? 'Customer' : 'Checkout visitor')}</h3>
                      {order.customerEmail ? (
                        <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
                      ) : (
                        <p>No email captured</p>
                      )}
                    </div>
                    <div className="admin-order-money">
                      <strong>{formatPrice(order.amountTotal, order.currency)}</strong>
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="admin-order-meta">
                    <span className={`status-pill ${order.paymentStatus}`}>{order.paymentStatus}</span>
                    <span className={`fulfillment-pill ${order.fulfillmentStatus}`}>
                      {getFulfillmentLabel(order.fulfillmentStatus)}
                    </span>
                    <span className="admin-order-id">
                      <code>{shortenIdentifier(orderIdentifier)}</code>
                      <button
                        type="button"
                        onClick={() => { void copyOrderIdentifier(order); }}
                        aria-label="Copy order ID"
                        title="Copy order ID"
                      >
                        {copiedOrderId === order.id ? (
                          <Check aria-hidden="true" size={14} />
                        ) : (
                          <Copy aria-hidden="true" size={14} />
                        )}
                      </button>
                    </span>
                    {isPaid ? (
                      <span>
                        {order.ownerNotificationSentAt ? (
                          <><Mail aria-hidden="true" size={14} /> Alert sent</>
                        ) : (
                          <><Bell aria-hidden="true" size={14} /> Alert pending</>
                        )}
                      </span>
                    ) : null}
                  </div>

                  <div className={`admin-order-attribution${lastTouch ? '' : ' is-empty'}`}>
                    <MousePointerClick aria-hidden="true" size={17} />
                    <div className="admin-order-attribution-source">
                      <span>How they found you</span>
                      <strong>{formatAttributionSource(lastTouch)}</strong>
                    </div>
                    {lastTouch ? (
                      <dl>
                        {lastTouch.campaign ? (
                          <div><dt>Campaign</dt><dd>{lastTouch.campaign}</dd></div>
                        ) : null}
                        {lastTouch.referrer ? (
                          <div><dt>Referrer</dt><dd>{formatReferrer(lastTouch.referrer)}</dd></div>
                        ) : null}
                        {lastTouch.landingPage ? (
                          <div><dt>Landing page</dt><dd>{lastTouch.landingPage}</dd></div>
                        ) : null}
                        {firstTouch?.source && firstTouch.source !== lastTouch.source ? (
                          <div><dt>First touch</dt><dd>{formatAttributionSource(firstTouch)}</dd></div>
                        ) : null}
                      </dl>
                    ) : (
                      <small>Available for orders started after this tracking update.</small>
                    )}
                  </div>

                  {order.items.length ? (
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
                              {item.quantity} x {item.sizeLabel || 'Canvas'} · {item.frameLabel || 'Canvas'} ·{' '}
                              {formatPrice(item.unitAmount, order.currency)}
                            </small>
                          </div>
                          <b>{formatPrice(item.lineTotal, order.currency)}</b>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {isPaid ? (
                    <div className="admin-order-workflow">
                      <label className="admin-status-select">
                        <span>Fulfillment status</span>
                        <select
                          value={order.fulfillmentStatus}
                          disabled={updatingOrderId === order.id}
                          onChange={(event) => {
                            void handleFulfillmentChange(order.id, event.target.value);
                          }}
                        >
                          {fulfillmentStatusOptions.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                              disabled={option.value === 'shipped' && !hasTracking && order.fulfillmentStatus !== 'shipped'}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {!hasTracking && order.fulfillmentStatus !== 'shipped' ? (
                          <small>Save tracking before marking shipped.</small>
                        ) : null}
                      </label>

                      <details
                        className="admin-shipping-panel"
                        key={`${order.id}-${order.updatedAt}-${order.trackingNumber}-${order.trackingUrl}`}
                      >
                        <summary>
                          <span><Truck aria-hidden="true" size={17} /> Shipping & tracking</span>
                          <small>{hasTracking ? order.carrier || 'Tracking saved' : 'Not added'}</small>
                        </summary>
                        <form
                          className="admin-tracking-form"
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
                            {updatingOrderId === order.id ? 'Saving' : 'Save tracking'}
                          </button>
                        </form>
                        {hasTracking || order.shippedAt ? (
                          <div className="admin-tracking-summary">
                            {order.trackingNumber ? <strong>{order.trackingNumber}</strong> : null}
                            {order.trackingUrl ? (
                              <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                                Open tracking <ExternalLink aria-hidden="true" size={13} />
                              </a>
                            ) : null}
                            {order.shippedAt ? <small>Shipped {formatDateTime(order.shippedAt)}</small> : null}
                          </div>
                        ) : null}
                      </details>
                    </div>
                  ) : (
                    <div className="admin-payment-hold">
                      <Bell aria-hidden="true" size={17} />
                      <div><strong>Payment not complete</strong><small>Fulfillment controls are locked.</small></div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty">
            <ShoppingBag aria-hidden="true" size={30} />
            <h3>{orders.length ? 'No matching orders' : 'No orders yet'}</h3>
            <p>{orders.length ? 'Try another search or order filter.' : 'Paid Stripe orders will appear here.'}</p>
          </div>
        )}
      </section>
      ) : null}

      {activeView === 'activity' ? (
        <section
          className="admin-activity admin-view-panel"
          id="admin-activity-view"
          role="tabpanel"
          aria-label="Activity"
        >
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">History</p>
              <h2>Activity</h2>
            </div>
            <span>{notifications.length} recent events</span>
          </div>

          {notifications.length ? (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article className="notification-row" key={notification.id}>
                  <span className="notification-icon" aria-hidden="true">
                    {notification.channel === 'email' ? <Mail size={17} /> : <Bell size={17} />}
                  </span>
                  <div className="notification-copy">
                    <strong>{notification.title}</strong>
                    <p>{shortenNotificationIdentifiers(notification.body)}</p>
                  </div>
                  <div className="notification-meta">
                    <span>{notification.channel} · {notification.status}</span>
                    <time dateTime={notification.createdAt}>{formatDateTime(notification.createdAt)}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty compact">
              <Bell aria-hidden="true" size={28} />
              <h3>No activity yet</h3>
              <p>Order and email events will appear here.</p>
            </div>
          )}
        </section>
      ) : null}
      </div>
    </main>
  );
}
