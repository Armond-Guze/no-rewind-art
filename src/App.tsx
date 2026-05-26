import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Box,
  CircleUserRound,
  DollarSign,
  Filter,
  Grid2X2,
  Inbox,
  LogOut,
  Mail,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  getCollectionBySlugFromCatalog,
  getProductByGoogleItemIdFromCatalog,
  getProductBySlugFromCatalog,
  getProductsForCollectionFromCatalog,
  initialCatalog,
  normalizeCatalogData,
  type CatalogData,
  type FrameOption,
  type NormalizedCatalog,
  type Product,
  type SizeOption,
} from './data/products';
import { isSupabaseAuthConfigured, supabaseClient } from './lib/supabase';
import { AuthShell } from './components/auth/AuthShell';
import { CustomAuthFlow } from './components/auth/CustomAuthFlow';

type CartItem = {
  lineKey: string;
  productId: string;
  sizeId: string;
  frameId: string;
  quantity: number;
};

type CartLine = CartItem & {
  product: Product;
  sizeOption: SizeOption;
  frameOption: FrameOption;
};

type AddToCart = (productId: string, sizeId?: string, frameId?: string) => void;
type StartBuyNow = (productId: string, sizeId?: string, frameId?: string) => Promise<void>;

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

type AdminProductDraft = Product & {
  galleryText: string;
  detailsText: string;
  collectionSlugsText: string;
};

const CatalogContext = createContext<NormalizedCatalog>(initialCatalog);

function useCatalog() {
  return useContext(CatalogContext);
}

type CustomerAuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  lastAuthEvent: AuthChangeEvent | null;
  signOut: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue>({
  configured: false,
  loading: false,
  session: null,
  user: null,
  lastAuthEvent: null,
  signOut: async () => {},
});

function useCustomerAuth() {
  return useContext(CustomerAuthContext);
}

function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [lastAuthEvent, setLastAuthEvent] = useState<AuthChangeEvent | null>(null);
  const [loading, setLoading] = useState(isSupabaseAuthConfigured);

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    let active = true;

    void supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session);
        }
      })
      .catch(() => {
        if (active) {
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
    } = supabaseClient.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      setLastAuthEvent(event);
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseClient) {
      return;
    }

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      configured: isSupabaseAuthConfigured,
      loading,
      session,
      user: session?.user ?? null,
      lastAuthEvent,
      signOut,
    }),
    [lastAuthEvent, loading, session, signOut],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

const missingImages = new Set<string>();

const formatPrice = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);

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

const siteUrl = 'https://armoze.com';
const supportEmail = 'hello@armoze.com';
const supportMailto = `mailto:${supportEmail}`;

type PolicyPageKey = 'shipping' | 'returns' | 'privacy' | 'terms';

type PolicyPageContent = {
  title: string;
  description: string;
  updated: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
};

const policyPages: Record<PolicyPageKey, PolicyPageContent> = {
  shipping: {
    title: 'Shipping Policy',
    description:
      'Learn how Armoze ships made-to-order canvas prints, including processing times, delivery estimates, tracking, and address changes.',
    updated: 'May 2026',
    sections: [
      {
        title: 'Made-to-order processing',
        body: [
          'Armoze prints are made to order. Production usually begins shortly after checkout is completed and payment is confirmed.',
          'Most orders are prepared for shipment within 2 to 5 business days. During busy periods or supplier delays, production may take longer.',
        ],
      },
      {
        title: 'Shipping estimates',
        body: [
          'Standard shipping is currently offered for U.S. orders through Stripe Checkout. Estimated delivery is typically 5 to 10 business days after production is complete.',
          'Delivery dates are estimates, not guarantees. Carrier delays, weather, holidays, incorrect addresses, or production issues may affect timing.',
        ],
      },
      {
        title: 'Tracking and address changes',
        body: [
          'When tracking is available, it will be sent to the email address used at checkout.',
          `If you entered the wrong shipping address, contact ${supportEmail} as soon as possible. Address changes cannot be guaranteed after an order enters production or ships.`,
        ],
      },
      {
        title: 'Lost or delayed packages',
        body: [
          'If tracking shows a package was delivered but you cannot locate it, check nearby delivery areas and contact the carrier first.',
          `If the issue continues, email ${supportEmail} with your order details so the order can be reviewed.`,
        ],
      },
    ],
  },
  returns: {
    title: 'Returns & Refunds',
    description:
      'Review the Armoze returns and refunds policy for made-to-order canvas prints, damaged orders, cancellations, and replacement requests.',
    updated: 'May 2026',
    sections: [
      {
        title: 'Made-to-order items',
        body: [
          'Armoze prints are produced after an order is placed. Because each item is made to order, returns for buyer’s remorse, size changes, or preference changes are not guaranteed once production begins.',
          'If you need to change or cancel an order, contact us quickly. Cancellation requests are easiest to handle within 24 hours of purchase and before production starts.',
        ],
      },
      {
        title: 'Damaged, defective, or wrong items',
        body: [
          `If your item arrives damaged, defective, or different from what you ordered, email ${supportEmail} within 7 days of delivery.`,
          'Include your order number, photos of the product, photos of the packaging, and a short description of the issue. After review, Armoze may provide a replacement, refund, or other resolution.',
        ],
      },
      {
        title: 'Refund timing',
        body: [
          'Approved refunds are sent back to the original payment method used at checkout.',
          'After a refund is issued, your bank or card provider may take additional time to post the funds to your account.',
        ],
      },
      {
        title: 'Returned packages',
        body: [
          'If an order is returned because of an incorrect address, failed delivery, or refusal of delivery, additional shipping or replacement costs may apply.',
          'Armoze reviews returned-package situations individually based on the order status and carrier information.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description:
      'Learn what information Armoze collects, how order and payment data is handled, and how service providers like Stripe support checkout.',
    updated: 'May 2026',
    sections: [
      {
        title: 'Information we collect',
        body: [
          'When you place an order, Armoze may receive information such as your name, email address, shipping address, order details, and payment confirmation status.',
          'Payment card details are processed by Stripe. Armoze does not store full card numbers on this website.',
        ],
      },
      {
        title: 'How we use information',
        body: [
          'Order information is used to process payments, prepare and ship products, provide customer support, prevent fraud, maintain the website, and meet business or legal requirements.',
          'If email notifications are enabled, order information may be used to send customer or owner order updates.',
        ],
      },
      {
        title: 'Service providers',
        body: [
          'Armoze uses service providers to operate the store, including hosting, database, payment, shipping, and email tools.',
          'Stripe processes payments and may collect information according to its own privacy policy. You can review Stripe’s privacy policy at stripe.com/privacy.',
        ],
      },
      {
        title: 'Cookies and local storage',
        body: [
          'The site may use browser storage for basic storefront features such as cart behavior and session state.',
          'If analytics, advertising, or additional tracking tools are added later, this policy should be updated to describe those tools.',
        ],
      },
      {
        title: 'Contact and updates',
        body: [
          `For privacy questions, email ${supportEmail}.`,
          'This policy may be updated as the store changes, especially if new analytics, email, advertising, or fulfillment tools are added.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description:
      'Read the Armoze terms covering storefront use, orders, payments, product presentation, intellectual property, and checkout.',
    updated: 'May 2026',
    sections: [
      {
        title: 'About Armoze',
        body: [
          'Armoze is an online storefront for motivational canvas prints and wall art. Armoze is operated by Guze LLC.',
          'By using this website or placing an order, you agree to these terms and the policies linked on this site.',
        ],
      },
      {
        title: 'Products and presentation',
        body: [
          'Product images, room mockups, frame previews, and colors are shown for presentation. Actual print colors, scale, texture, and framing may vary based on screen settings, production materials, and selected size.',
          'Prices, sizes, availability, and product details may change without notice before an order is placed.',
        ],
      },
      {
        title: 'Orders and payments',
        body: [
          'Checkout is processed through Stripe. Orders are not accepted until payment is completed and confirmed.',
          'Armoze may cancel or refund orders when necessary, including suspected fraud, incorrect pricing, unavailable products, or fulfillment issues.',
        ],
      },
      {
        title: 'Intellectual property',
        body: [
          'Artwork, branding, product copy, images, and site content belong to Armoze or its respective owners.',
          'You may not copy, reproduce, resell, or use Armoze artwork or content for commercial purposes without written permission.',
        ],
      },
      {
        title: 'Limitation of liability',
        body: [
          'The website is provided as available. Armoze is not responsible for delays, interruptions, carrier issues, payment provider outages, or indirect losses beyond the amount paid for the affected order.',
          `For order questions or support, contact ${supportEmail}.`,
        ],
      },
    ],
  },
};

function absoluteUrl(path: string) {
  if (path.startsWith('http')) {
    return path;
  }

  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  element.href = href;
}

function usePageSeo({
  title,
  description,
  canonicalPath,
  image,
  robots = 'index,follow',
  structuredData,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  robots?: string;
  structuredData?: Record<string, unknown>;
}) {
  useEffect(() => {
    const fullTitle = title === 'Armoze' ? 'Armoze' : `${title} | Armoze`;
    const canonicalUrl = absoluteUrl(canonicalPath);

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: structuredData ? 'product' : 'website',
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    });

    if (image) {
      upsertMeta('meta[property="og:image"]', {
        property: 'og:image',
        content: absoluteUrl(image),
      });
      upsertMeta('meta[name="twitter:image"]', {
        name: 'twitter:image',
        content: absoluteUrl(image),
      });
    }

    upsertCanonical(canonicalUrl);

    const existingStructuredData = document.head.querySelector('#armoze-page-structured-data');

    if (existingStructuredData) {
      existingStructuredData.remove();
    }

    if (structuredData) {
      const script = document.createElement('script');
      script.id = 'armoze-page-structured-data';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [canonicalPath, description, image, robots, structuredData, title]);
}

function getDefaultProductOffer(product: Product) {
  const option = getFeaturedSizeOption(product);

  return {
    '@type': 'Offer',
    url: absoluteUrl(`/products/${product.slug}`),
    priceCurrency: 'USD',
    price: (option.priceInCents / 100).toFixed(2),
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  };
}

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

async function fetchPublicCatalog() {
  const response = await fetch('/api/products');

  if (!response.ok) {
    throw new Error('Catalog could not be loaded.');
  }

  return normalizeCatalogData((await response.json()) as CatalogData);
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
    galleryText: (product.gallery || []).join('\n'),
    detailsText: product.details.join('\n'),
    collectionSlugsText: product.collectionSlugs.join('\n'),
  };
}

function draftToProduct(draft: AdminProductDraft): Product {
  return {
    ...draft,
    gallery: splitEditableLines(draft.galleryText),
    details: splitEditableLines(draft.detailsText),
    collectionSlugs: splitEditableLines(draft.collectionSlugsText),
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

async function updateAdminOrderStatus(
  adminToken: string,
  orderId: string,
  fulfillmentStatus: string,
) {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fulfillmentStatus }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Order status could not be updated.');
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

function makeCartLineKey(productId: string, sizeId: string, frameId: string) {
  return `${productId}::${sizeId}::${frameId}`;
}

function getBaseSizeOption(product: Product) {
  return product.sizeOptions[0];
}

function getFeaturedSizeOption(product: Product) {
  return (
    product.sizeOptions.find((option) => option.id === product.defaultSizeId) ??
    product.sizeOptions[0]
  );
}

function getSizeOption(product: Product, sizeId: string) {
  return product.sizeOptions.find((option) => option.id === sizeId) ?? getBaseSizeOption(product);
}

function getBaseFrameOption(product: Product) {
  return product.frameOptions[0];
}

function getFrameOption(product: Product, frameId: string) {
  return product.frameOptions.find((option) => option.id === frameId) ?? getBaseFrameOption(product);
}

function getFramePriceDelta(product: Product, sizeOption: SizeOption, frameOption: FrameOption) {
  if (frameOption.priceDeltaBySizeIndexInCents?.length) {
    const sizeIndex = Math.max(
      0,
      product.sizeOptions.findIndex((option) => option.id === sizeOption.id),
    );
    const fallbackIndex = frameOption.priceDeltaBySizeIndexInCents.length - 1;

    return (
      frameOption.priceDeltaBySizeIndexInCents[sizeIndex] ??
      frameOption.priceDeltaBySizeIndexInCents[fallbackIndex] ??
      frameOption.priceDeltaInCents ??
      0
    );
  }

  return frameOption.priceDeltaInCents ?? 0;
}

function getConfiguredUnitPrice(product: Product, sizeOption: SizeOption, frameOption: FrameOption) {
  return sizeOption.priceInCents + getFramePriceDelta(product, sizeOption, frameOption);
}

function formatFramePriceDelta(product: Product, sizeOption: SizeOption, frameOption: FrameOption) {
  const framePriceDelta = getFramePriceDelta(product, sizeOption, frameOption);

  if (!framePriceDelta) {
    return '';
  }

  return `+${formatPrice(framePriceDelta)}`;
}

function ProductVisual({ product }: { product: Product }) {
  return (
    <div className={`product-art ${product.tone}-art shape-${product.artworkShape}`}>
      {product.image ? <img src={product.image} alt={product.imageAlt} /> : <span>{product.label}</span>}
    </div>
  );
}

function ProductImage({ product }: { product: Product }) {
  if (product.image) {
    return <ArtworkMockup product={product} src={product.image} alt={product.imageAlt} />;
  }

  return <ProductVisual product={product} />;
}

function ArtworkMockup({
  product,
  src,
  alt,
  className,
}: {
  product: Product;
  src?: string;
  alt: string;
  className?: string;
}) {
  const classNames = ['artwork-mockup', `shape-${product.artworkShape}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <div className="artwork-mockup-print">
        {src ? (
          <GalleryImage className="artwork-mockup-image" src={src} alt={alt} />
        ) : (
          <ProductVisual product={product} />
        )}
      </div>
    </div>
  );
}

function GalleryImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hidden, setHidden] = useState(missingImages.has(src));

  if (hidden) {
    return null;
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => {
        missingImages.add(src);
        setHidden(true);
      }}
    />
  );
}

function getProductGallery(product: Product) {
  return [product.image, ...(product.gallery ?? [])].filter(
    (image, index, gallery): image is string => Boolean(image) && gallery.indexOf(image) === index,
  );
}

function isProductMockupImage(product: Product, image: string | undefined) {
  if (!image) {
    return false;
  }

  return (
    image === product.image ||
    /\/0[12]-(main|side)\.(png|jpe?g|webp|avif)$/i.test(image)
  );
}

function isSideMockupImage(image: string | undefined) {
  return /\/02-side\.(png|jpe?g|webp|avif)$/i.test(image ?? '');
}

function getFramePreviewVariant(option: FrameOption) {
  const value = `${option.id} ${option.label}`.toLowerCase();

  if (value.includes('black')) {
    return 'black';
  }

  if (value.includes('white')) {
    return 'white';
  }

  return 'canvas';
}

function FrameOptionPreview({ option }: { option: FrameOption }) {
  return (
    <span
      className={`frame-option-preview ${getFramePreviewVariant(option)}`}
      aria-hidden="true"
    >
      <span className="frame-preview-corner">
        <span className="frame-preview-artwork" />
      </span>
    </span>
  );
}

function SiteHeader({ cartCount }: { cartCount: number }) {
  const { user, loading } = useCustomerAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountLabel = user ? 'View account' : 'Sign in or create account';
  const closeMenu = () => setMenuOpen(false);
  const isHome = location.pathname === '/';

  return (
    <header className={`site-header${isHome ? ' home-header' : ''}`}>
      <Link className="brand" to="/" aria-label="Armoze home">
        <img className="brand-mark" src="/armoze-logo.png" alt="" aria-hidden="true" />
        <span>Armoze</span>
      </Link>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
      </button>
      <nav
        className={`nav-links${menuOpen ? ' open' : ''}`}
        id="primary-navigation"
        aria-label="Primary navigation"
      >
        <Link to="/collections/best-sellers" onClick={closeMenu}>Best Sellers</Link>
        <Link to="/collections/money-ambition" onClick={closeMenu}>Money</Link>
        <Link to="/collections/discipline-focus" onClick={closeMenu}>Focus</Link>
        <Link to="/collections/new-arrivals" onClick={closeMenu}>New Arrivals</Link>
        <Link to="/#support" onClick={closeMenu}>Support</Link>
        <Link to="/cart" onClick={closeMenu}>Cart ({cartCount})</Link>
        <Link
          className={`account-nav-link${user ? ' signed-in' : ''}`}
          to="/sign-in"
          aria-label={accountLabel}
          title={accountLabel}
          onClick={closeMenu}
        >
          <CircleUserRound aria-hidden="true" size={22} />
          <span className="sr-only">{loading ? 'Checking account' : accountLabel}</span>
        </Link>
      </nav>
    </header>
  );
}

function SiteFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('New drops, restocks, and studio updates. No spam.');

  async function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterStatus('loading');
    setNewsletterMessage('Adding you to the Armoze list...');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Newsletter signup failed.');
      }

      setNewsletterStatus('success');
      setNewsletterMessage('You are on the list. First looks will land in your inbox.');
      setNewsletterEmail('');
    } catch (error) {
      setNewsletterStatus('error');
      setNewsletterMessage(error instanceof Error ? error.message : 'Newsletter signup failed.');
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link className="footer-logo" to="/" aria-label="Armoze home">
          <img className="brand-mark" src="/armoze-logo.png" alt="" aria-hidden="true" />
          <span>Armoze</span>
        </Link>
        <p>Motivational canvas prints for ambitious spaces.</p>
      </div>

      <nav className="footer-links" aria-label="Footer navigation">
        <Link to="/collections/best-sellers">Best Sellers</Link>
        <Link to="/collections/money-ambition">Money</Link>
        <Link to="/collections/discipline-focus">Focus</Link>
        <Link to="/collections/new-arrivals">New Arrivals</Link>
        <Link to="/#support">Support</Link>
        <Link to="/shipping">Shipping</Link>
        <Link to="/returns">Returns</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>

      <section className="footer-support" aria-label="Customer support">
        <div>
          <span>Need help?</span>
          <p>Email order questions, damage photos, sizing help, or address changes to:</p>
        </div>
        <a href={supportMailto}>{supportEmail}</a>
      </section>

      <section className="footer-newsletter" aria-label="Newsletter signup">
        <div>
          <span>Newsletter</span>
          <h2>Get the next drop first.</h2>
          <p>Join the Armoze list for new artwork releases, restocks, and shop updates.</p>
        </div>
        <form onSubmit={handleNewsletterSubmit}>
          <label className="sr-only" htmlFor="newsletter-email">
            Email address
          </label>
          <div className="newsletter-form-row">
            <input
              id="newsletter-email"
              type="email"
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
            />
            <button type="submit" disabled={newsletterStatus === 'loading'}>
              {newsletterStatus === 'loading' ? 'Joining' : 'Sign Up'}
            </button>
          </div>
          <p className={`newsletter-message ${newsletterStatus}`}>{newsletterMessage}</p>
        </form>
      </section>

      <div className="footer-bottom">
        <span>2026 Armoze</span>
        <span>Made to order</span>
        <span>Secure checkout</span>
      </div>
    </footer>
  );
}

function HomePage({
  addToCart,
}: {
  addToCart: AddToCart;
}) {
  const catalog = useCatalog();
  const checkoutResult = new URLSearchParams(window.location.search).get('checkout');
  const featuredProducts = useMemo(
    () => getProductsForCollectionFromCatalog(catalog, 'best-sellers').slice(0, 6),
    [catalog],
  );
  const heroProduct = featuredProducts[0] ?? catalog.products.find((product) => product.published);
  const homeStructuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${siteUrl}/#organization`,
          name: 'Armoze',
          url: siteUrl,
          logo: absoluteUrl('/armoze-logo.png'),
        },
        {
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          name: 'Armoze',
          url: siteUrl,
          publisher: {
            '@id': `${siteUrl}/#organization`,
          },
        },
        {
          '@type': 'ItemList',
          name: 'Armoze best selling motivational canvas prints',
          itemListElement: featuredProducts.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: product.title,
            url: absoluteUrl(`/products/${product.slug}`),
          })),
        },
      ],
    }),
    [featuredProducts],
  );

  usePageSeo({
    title: 'Motivational Canvas Prints',
    description:
      'Shop Armoze motivational canvas prints for offices, bedrooms, studios, dorms, and creative workspaces. Choose canvas, black frame, or white frame.',
    canonicalPath: '/',
    image: heroProduct?.image || '/armoze-logo.png',
    structuredData: homeStructuredData,
  });

  return (
    <main id="top" className="home-page">
      {checkoutResult === 'success' ? (
        <div className="checkout-banner success">Payment complete. Your order is being prepared.</div>
      ) : null}

      {checkoutResult === 'cancelled' ? (
        <div className="checkout-banner cancelled">
          Checkout was cancelled. Your cart is still here when you are ready.
        </div>
      ) : null}

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Armoze Originals</p>
          <h1 id="hero-title">Motivational Canvas Prints</h1>
          <p>
            Bold wall art for workspaces, bedrooms, studios, and creative corners.
            Pick a print, choose the size, and checkout securely.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/collections/best-sellers">
              Shop Best Sellers
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </div>

        <div className="hero-showcase" aria-label="Featured Armoze artwork">
          {heroProduct ? (
            <Link className="hero-featured-product" to={`/products/${heroProduct.slug}`}>
              <ProductImage product={heroProduct} />
              <div className="hero-featured-meta">
                <span>Featured canvas</span>
                <strong>{heroProduct.title}</strong>
                <small>From {formatPrice(heroProduct.priceInCents)}</small>
              </div>
            </Link>
          ) : null}

        </div>
      </section>

      <section id="shop" className="section shop-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Best sellers</p>
            <h2>Start here.</h2>
          </div>
          <Link className="section-link" to="/collections/best-sellers">
            View Collection
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>

        <div className="product-grid">
          {featuredProducts.map((product) => (
            <article className="product" key={product.id}>
              <Link className="product-image-link" to={`/products/${product.slug}`}>
                <ProductImage product={product} />
              </Link>
              <div className="product-copy">
                <div className="product-title-row">
                  <div>
                    <h3>
                      <Link to={`/products/${product.slug}`}>{product.title}</Link>
                    </h3>
                    <span>{product.size}</span>
                  </div>
                  <strong>{formatPrice(product.priceInCents)}</strong>
                </div>
                <p>{product.description}</p>
                <div className="product-actions">
                  <Link className="text-action" to={`/products/${product.slug}`}>
                    View Details
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                  <button className="text-action" type="button" onClick={() => addToCart(product.id)}>
                    Add to Cart
                    <Plus aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="support" className="section support-faq-section" aria-labelledby="support-title">
        <div className="support-card">
          <p className="eyebrow">Support</p>
          <h2 id="support-title">Questions before or after checkout?</h2>
          <p>
            For order help, sizing questions, address changes, or damage replacement requests,
            email the Armoze support inbox.
          </p>
          <a className="button button-primary" href={supportMailto}>
            <Mail aria-hidden="true" size={18} />
            {supportEmail}
          </a>
        </div>

        <div className="faq-list" aria-label="Frequently asked questions">
          <p className="eyebrow">FAQ</p>
          <details open>
            <summary>How long does production take?</summary>
            <p>
              Armoze prints are made to order. Production usually takes 2 to 5 business days
              after checkout is completed.
            </p>
          </details>
          <details>
            <summary>How long does shipping take?</summary>
            <p>
              Standard U.S. shipping is typically 5 to 10 business days after production is
              complete. Tracking is sent when it is available.
            </p>
          </details>
          <details>
            <summary>What if my canvas arrives damaged?</summary>
            <p>
              Email {supportEmail} within 7 days of delivery with your order number, photos of
              the canvas, and photos of the packaging so the issue can be reviewed.
            </p>
          </details>
          <details>
            <summary>What is the difference between canvas and framed options?</summary>
            <p>
              Canvas is a ready-to-hang stretched print. Black frame and white frame options add
              a clean framed edge around the artwork for a more finished wall look.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}

function CartSection({
  cartProducts,
  subtotal,
  updateQuantity,
  startCheckout,
  checkoutState,
  checkoutError,
}: {
  cartProducts: CartLine[];
  subtotal: number;
  updateQuantity: (lineKey: string, nextQuantity: number) => void;
  startCheckout: () => void;
  checkoutState: 'idle' | 'loading' | 'error';
  checkoutError: string;
}) {
  return (
    <section id="cart" className="cart-section">
      <div className="cart-copy">
        <p className="eyebrow">Checkout</p>
        <h2>Your Cart</h2>
        <p>
          Choose your prints here, then complete payment securely through Stripe
          Checkout. Shipping, tax, and payment details are handled at checkout.
        </p>
      </div>

      <aside className="cart-panel" aria-label="Shopping cart">
        {cartProducts.length ? (
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
            <h3>Your cart is empty</h3>
            <p>Add a print from the first drop to start checkout.</p>
            <Link className="button button-secondary" to="/collections/best-sellers">
              Browse Prints
            </Link>
          </div>
        )}
      </aside>
    </section>
  );
}

function CartPage({
  cartProducts,
  subtotal,
  updateQuantity,
  startCheckout,
  checkoutState,
  checkoutError,
}: {
  cartProducts: CartLine[];
  subtotal: number;
  updateQuantity: (lineKey: string, nextQuantity: number) => void;
  startCheckout: () => void;
  checkoutState: 'idle' | 'loading' | 'error';
  checkoutError: string;
}) {
  return (
    <main className="standalone-cart-page">
      <CartSection
        cartProducts={cartProducts}
        subtotal={subtotal}
        updateQuantity={updateQuantity}
        startCheckout={startCheckout}
        checkoutState={checkoutState}
        checkoutError={checkoutError}
      />
    </main>
  );
}

function PolicyPage({ pageKey }: { pageKey: PolicyPageKey }) {
  const page = policyPages[pageKey];

  usePageSeo({
    title: page.title,
    description: page.description,
    canonicalPath: `/${pageKey}`,
    image: '/armoze-logo.png',
  });

  return (
    <main className="policy-page">
      <section className="policy-hero">
        <p className="eyebrow">Store policy</p>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
        <span>Last updated: {page.updated}</span>
      </section>

      <section className="policy-content" aria-label={page.title}>
        {page.sections.map((section) => (
          <article className="policy-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}

function SignInPage() {
  usePageSeo({
    title: 'Log In',
    description: 'Log in or sign up for your Armoze customer account.',
    canonicalPath: '/sign-in',
    image: '/armoze-logo.png',
    robots: 'noindex,nofollow',
  });

  return (
    <AuthShell>
      <CustomAuthFlow />
    </AuthShell>
  );
}

function CollectionPage({ addToCart }: { addToCart: AddToCart }) {
  const { slug } = useParams();
  const catalog = useCatalog();
  const collection = getCollectionBySlugFromCatalog(catalog, slug);
  const collectionProducts = getProductsForCollectionFromCatalog(catalog, slug);
  usePageSeo({
    title: collection ? `${collection.title} Canvas Prints` : 'Collection Not Found',
    description: collection?.description || 'Shop motivational canvas prints from Armoze.',
    canonicalPath: collection ? `/collections/${collection.slug}` : '/collections/best-sellers',
    image: collectionProducts[0]?.image || '/armoze-logo.png',
  });

  if (!collection) {
    return (
      <main className="product-not-found">
        <p className="eyebrow">Collection missing</p>
        <h1>Category not found.</h1>
        <Link className="button button-primary" to="/collections/best-sellers">
          View Best Sellers
        </Link>
      </main>
    );
  }

  return (
    <main className="collection-page">
      <section className="collection-toolbar" aria-label="Shop category controls">
        <div className="product-count">{collectionProducts.length} Products</div>
        <nav className="collection-tabs" aria-label="Shop categories">
          {catalog.collections.map((item) => (
            <Link
              className={item.slug === collection.slug ? 'active' : ''}
              key={item.slug}
              to={`/collections/${item.slug}`}
            >
              {item.navLabel}
            </Link>
          ))}
        </nav>
        <div className="view-controls" aria-label="View controls">
          <Grid2X2 aria-hidden="true" size={18} />
          <span />
          <Filter aria-hidden="true" size={16} />
          <button type="button">Filter & Sort</button>
        </div>
      </section>

      <section className="collection-heading">
        <p className="eyebrow">Shop Prints</p>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </section>

      <section className="listing-grid" aria-label={`${collection.title} products`}>
        {collectionProducts.map((product) => (
          <article className="listing-card" key={product.id}>
            <Link className="listing-card-image" to={`/products/${product.slug}`}>
              <ProductImage product={product} />
            </Link>
            <div className="listing-card-copy">
              <div>
                <h2>
                  <Link to={`/products/${product.slug}`}>{product.title}</Link>
                </h2>
                <p>From {formatPrice(product.priceInCents)}</p>
              </div>
              <button
                className="quick-add"
                type="button"
                onClick={() => addToCart(product.id)}
                aria-label={`Add ${product.title} to cart`}
              >
                <Plus aria-hidden="true" size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function ProductPage({
  addToCart,
  startBuyNow,
  checkoutState,
  checkoutError,
}: {
  addToCart: AddToCart;
  startBuyNow: StartBuyNow;
  checkoutState: 'idle' | 'loading' | 'error';
  checkoutError: string;
}) {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const catalog = useCatalog();
  const product = getProductBySlugFromCatalog(catalog, slug);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const requestedSizeId = searchParams.get('size');
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const productStructuredData = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        image: product.image ? [absoluteUrl(product.image)] : undefined,
        description: product.seoDescription || product.longDescription,
        brand: {
          '@type': 'Brand',
          name: 'Armoze',
        },
        sku: product.id,
        offers: getDefaultProductOffer(product),
      }
    : undefined;

  usePageSeo({
    title: product ? product.seoTitle || `${product.title} Canvas Print` : 'Product Not Found',
    description: product?.seoDescription || product?.description || 'Shop motivational canvas prints from Armoze.',
    canonicalPath: product ? `/products/${product.slug}` : '/',
    image: product?.image || '/armoze-logo.png',
    structuredData: productStructuredData,
  });

  useEffect(() => {
    if (product && slug && slug !== product.slug) {
      navigate(`/products/${product.slug}${location.search}`, { replace: true });
    }
  }, [location.search, navigate, product, slug]);

  if (!product) {
    return (
      <main className="product-not-found">
        <p className="eyebrow">Product missing</p>
        <h1>Print not found.</h1>
        <Link className="button button-primary" to="/#shop">
          Back to Shop
        </Link>
      </main>
    );
  }

  const gallery = getProductGallery(product);
  const selectedGalleryImage = gallery[selectedImage];
  const isMockupGalleryImage = isProductMockupImage(product, selectedGalleryImage);
  const isSideGalleryImage = isSideMockupImage(selectedGalleryImage);
  const isFrontMockupGalleryImage = isMockupGalleryImage && !isSideGalleryImage;
  const defaultSizeOption = getFeaturedSizeOption(product);
  const requestedSizeOption = product.sizeOptions.find((option) => option.id === requestedSizeId);
  const selectedOption =
    product.sizeOptions.find((option) => option.id === selectedSizeId) ??
    requestedSizeOption ??
    defaultSizeOption;
  const selectedSize = product.sizeOptions.findIndex((option) => option.id === selectedOption.id);
  const selectedFrameOption = product.frameOptions[selectedFrame] ?? getBaseFrameOption(product);
  const selectedFrameName = selectedFrameOption.label;
  const selectedUnitPrice = getConfiguredUnitPrice(product, selectedOption, selectedFrameOption);
  const shouldShowFramePreview = selectedImage === 0;
  const relatedProducts = catalog.products
    .filter((candidate) => candidate.id !== product.id && candidate.published)
    .map((candidate) => {
      const sharedCollections = candidate.collectionSlugs.filter((slug) =>
        product.collectionSlugs.includes(slug),
      ).length;
      const toneMatch = candidate.tone === product.tone ? 1 : 0;

      return {
        product: candidate,
        score: sharedCollections * 2 + toneMatch,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title))
    .slice(0, 4)
    .map((item) => item.product);
  const frameClass =
    !shouldShowFramePreview
      ? 'frame-none'
      : selectedFrameName === 'Black Frame'
      ? 'frame-black'
      : selectedFrameName === 'White Frame'
        ? 'frame-white'
        : 'frame-none';
  return (
    <main className="product-page">
      <div className="product-page-header">
        <Link className="back-link" to="/#shop">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to Shop
        </Link>
      </div>

      <section className="listing-layout">
        <div className="listing-gallery">
          <div className="gallery-rail" aria-label="Product images">
            {(gallery.length ? gallery : ['placeholder']).map((image, index) => (
              <button
                className={index === selectedImage ? 'active' : ''}
                key={`${product.id}-${index}`}
                type="button"
                onClick={() => setSelectedImage(index)}
                aria-label={`View ${product.title} image ${index + 1}`}
              >
                {image === 'placeholder' ? (
                  <ProductVisual product={product} />
                ) : (
                  <GalleryImage src={image} alt="" />
                )}
              </button>
            ))}
          </div>

          <div
            className={`main-product-image ${selectedGalleryImage ? 'gallery-product-image' : ''} ${
              isMockupGalleryImage ? 'mockup-product-image' : ''
            }`}
          >
            <div
              className={`detail-artwork-shell ${frameClass} shape-${product.artworkShape} ${
                isMockupGalleryImage ? 'mockup-product-shell' : ''
              } ${isFrontMockupGalleryImage ? 'front-product-shell' : ''} ${
                isSideGalleryImage ? 'side-product-shell' : ''
              }`}
            >
              <div className="detail-artwork-surface">
                {selectedGalleryImage ? (
                  <GalleryImage
                    className="detail-artwork-image"
                    src={selectedGalleryImage}
                    alt={product.imageAlt}
                  />
                ) : (
                  <ProductVisual product={product} />
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="listing-panel">
          <div className="rating-row">
            <span>{product.rating.toFixed(2)}</span>
            <span className="stars" aria-label={`${product.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star aria-hidden="true" fill="currentColor" key={index} size={14} />
              ))}
            </span>
            <small>{product.reviewCount.toLocaleString()} reviews</small>
          </div>

          <p className="listing-kicker">Armoze Original</p>
          <h1>{product.title}</h1>
          <p className="listing-price">{formatPrice(selectedUnitPrice)}</p>
          <p className="listing-description">{product.longDescription}</p>

          <div className="option-group">
            <div className="option-label">
              <span>Framing Options:</span>
              <strong>{selectedFrameName}</strong>
            </div>
            <div className="frame-options">
              {product.frameOptions.map((option, index) => (
                <button
                  className={index === selectedFrame ? 'selected' : ''}
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedFrame(index);
                    setSelectedImage(0);
                  }}
                  aria-label={`Select ${option.label}`}
                >
                  <FrameOptionPreview option={option} />
                  <span className="sr-only">{option.label}</span>
                  {formatFramePriceDelta(product, selectedOption, option) ? (
                    <small>{formatFramePriceDelta(product, selectedOption, option)}</small>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <div className="option-label">
              <span>Size:</span>
              <strong>{selectedOption.label}</strong>
            </div>
            <div className="size-options">
              {product.sizeOptions.map((option, index) => (
                <button
                  className={index === selectedSize ? 'selected' : ''}
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedSizeId(option.id)}
                >
                  {option.badge ? <span>{option.badge}</span> : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="installment-note">
            Pay in 4 interest-free installments with Stripe-compatible payment methods at checkout.
          </div>

          <button
            className="button button-primary listing-cart-button"
            type="button"
            onClick={() => {
              addToCart(product.id, selectedOption.id, selectedFrameOption.id);
              navigate('/cart');
            }}
          >
            Add to Cart
          </button>

          <button
            className="button button-secondary listing-cart-button"
            type="button"
            disabled={checkoutState === 'loading'}
            onClick={() => void startBuyNow(product.id, selectedOption.id, selectedFrameOption.id)}
          >
            {checkoutState === 'loading' ? 'Opening Checkout' : 'Buy Now'}
          </button>

          {checkoutState === 'error' ? (
            <p className="checkout-error">
              {checkoutError || 'Checkout could not be started. Please try again.'}
            </p>
          ) : null}

          <div className="trust-grid">
            <div>
              <Box aria-hidden="true" size={24} />
              <span>Free Shipping</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" size={24} />
              <span>Secure Checkout</span>
            </div>
            <div>
              <BadgeCheck aria-hidden="true" size={24} />
              <span>Made To Order</span>
            </div>
          </div>

          <div className="product-details-drawer">
            <button
              type="button"
              aria-expanded={detailsOpen}
              aria-controls={`${product.id}-details`}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              <span>Product Details</span>
              <span aria-hidden="true">{detailsOpen ? '−' : '+'}</span>
            </button>
            {detailsOpen ? (
              <div className="product-details-content" id={`${product.id}-details`}>
                <h2>{product.title}</h2>
                <p>{product.title} - Armoze canvas art</p>

                <h3>Canvas Details</h3>
                <ul>
                  <li>Fully assembled</li>
                  <li>Ready to hang</li>
                  <li>Made to order</li>
                  <li>Premium canvas materials</li>
                  <li>Secure packaging to protect corners and surface quality</li>
                  <li>Processing time: 3-5 business days</li>
                  <li>Shipping time in the US: 5-10 business days</li>
                </ul>

                <h3>Artwork Notes</h3>
                <ul>
                  {product.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      {relatedProducts.length ? (
        <section className="related-products-section" aria-labelledby="related-products-title">
          <div className="product-section-heading">
            <p className="eyebrow">More to consider</p>
            <h2 id="related-products-title">Canvases in the same lane.</h2>
          </div>
          <div className="related-products-grid">
            {relatedProducts.map((relatedProduct) => (
              <Link
                className="related-product"
                key={relatedProduct.id}
                to={`/products/${relatedProduct.slug}`}
              >
                <ProductImage product={relatedProduct} />
                <span>{relatedProduct.title}</span>
                <strong>{formatPrice(relatedProduct.priceInCents)}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="product-proof-section" aria-labelledby="product-proof-title">
        <div className="product-section-heading">
          <p className="eyebrow">What arrives</p>
          <h2 id="product-proof-title">Built to feel finished before it hits the wall.</h2>
        </div>

        <div className="product-proof-grid">
          <article>
            <img
              src="/product-support/canvas-unboxing-back.png"
              alt="Back of a stretched canvas print being unboxed from protective packaging"
            />
            <div>
              <h3>Protected from box to wall</h3>
              <p>
                Each canvas is packed to protect the surface, corners, and back side while it
                moves through shipping.
              </p>
            </div>
          </article>

          <article>
            <img
              src="/product-support/canvas-quality-closeup.png"
              alt="Close-up of canvas print texture and wrapped canvas edge"
            />
            <div>
              <h3>Texture you can actually see</h3>
              <p>
                A close-up look at the woven canvas surface, wrapped edge, and sturdy print
                construction.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function GoogleCheckoutRedirect() {
  const { itemId } = useParams();
  const catalog = useCatalog();
  const match = getProductByGoogleItemIdFromCatalog(catalog, itemId);

  if (!match) {
    return <Navigate to="/#shop" replace />;
  }

  return (
    <Navigate
      to={`/products/${match.product.slug}?size=${encodeURIComponent(match.sizeOption.id)}`}
      replace
    />
  );
}

function AdminDashboard({ onCatalogUpdated }: { onCatalogUpdated: (catalog: NormalizedCatalog) => void }) {
  usePageSeo({
    title: 'Admin Dashboard',
    description: 'Private Armoze order dashboard.',
    canonicalPath: '/admin',
    robots: 'noindex,nofollow',
  });

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

  async function handleFulfillmentChange(orderId: string, fulfillmentStatus: string) {
    if (!adminToken) {
      return;
    }

    setUpdatingOrderId(orderId);
    setError('');

    try {
      const { order } = await updateAdminOrderStatus(adminToken, orderId, fulfillmentStatus);

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
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Order status could not be updated.');
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
      onCatalogUpdated(await fetchPublicCatalog());
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

function App() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogState, setCatalogState] = useState<NormalizedCatalog>(initialCatalog);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const isAuthRoute = ['/sign-in', '/sign-up', '/account'].includes(location.pathname);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const nextCatalog = await fetchPublicCatalog();

        if (active) {
          setCatalogState(nextCatalog);
        }
      } catch {
        // The bundled catalog keeps the storefront usable if the API is temporarily unavailable.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const merchantItemId = searchParams.get('item');

    if (!merchantItemId) {
      return;
    }

    const selection = getProductByGoogleItemIdFromCatalog(catalogState, merchantItemId);

    if (!selection) {
      return;
    }

    const frameOption = getBaseFrameOption(selection.product);
    const lineKey = makeCartLineKey(selection.product.id, selection.sizeOption.id, frameOption.id);

    queueMicrotask(() => {
      setCart((currentCart) => {
        if (currentCart.some((item) => item.lineKey === lineKey)) {
          return currentCart;
        }

        return [
          ...currentCart,
          {
            lineKey,
            productId: selection.product.id,
            sizeId: selection.sizeOption.id,
            frameId: frameOption.id,
            quantity: 1,
          },
        ];
      });

      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);
          nextParams.delete('item');
          return nextParams;
        },
        { replace: true },
      );
    });
  }, [catalogState, searchParams, setSearchParams]);

  const cartProducts = useMemo(
    () =>
      cart
        .map((item) => {
          const product = catalogState.products.find((candidate) => candidate.id === item.productId);
          if (!product) {
            return null;
          }

          const sizeOption = getSizeOption(product, item.sizeId);
          const frameOption = getFrameOption(product, item.frameId);
          return { ...item, product, sizeOption, frameOption };
        })
        .filter((item): item is CartLine => Boolean(item)),
    [cart, catalogState.products],
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartProducts.reduce(
    (total, item) =>
      total + getConfiguredUnitPrice(item.product, item.sizeOption, item.frameOption) * item.quantity,
    0,
  );

  function addToCart(productId: string, sizeId?: string, frameId?: string) {
    const product = catalogState.products.find((candidate) => candidate.id === productId);

    if (!product) {
      return;
    }

    const sizeOption = sizeId ? getSizeOption(product, sizeId) : getBaseSizeOption(product);
    const frameOption = frameId ? getFrameOption(product, frameId) : getBaseFrameOption(product);
    const lineKey = makeCartLineKey(productId, sizeOption.id, frameOption.id);

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.lineKey === lineKey);

      if (!existing) {
        return [
          ...currentCart,
          {
            lineKey,
            productId,
            sizeId: sizeOption.id,
            frameId: frameOption.id,
            quantity: 1,
          },
        ];
      }

      return currentCart.map((item) =>
        item.lineKey === lineKey
          ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
          : item,
      );
    });
  }

  function updateQuantity(lineKey: string, nextQuantity: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.lineKey === lineKey
            ? { ...item, quantity: Math.max(0, Math.min(nextQuantity, 10)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function startCheckoutWithItems(items: CartItem[]) {
    if (!items.length) {
      return;
    }

    setCheckoutState('loading');
    setCheckoutError('');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.productId,
            sizeId: item.sizeId,
            frameId: item.frameId,
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

  async function startCheckout() {
    await startCheckoutWithItems(cart);
  }

  async function startBuyNow(productId: string, sizeId?: string, frameId?: string) {
    const product = catalogState.products.find((candidate) => candidate.id === productId);

    if (!product) {
      return;
    }

    const sizeOption = sizeId ? getSizeOption(product, sizeId) : getBaseSizeOption(product);
    const frameOption = frameId ? getFrameOption(product, frameId) : getBaseFrameOption(product);

    await startCheckoutWithItems([
      {
        lineKey: makeCartLineKey(product.id, sizeOption.id, frameOption.id),
        productId: product.id,
        sizeId: sizeOption.id,
        frameId: frameOption.id,
        quantity: 1,
      },
    ]);
  }

  return (
    <CatalogContext.Provider value={catalogState}>
      <CustomerAuthProvider>
        {isAuthRoute ? null : <SiteHeader cartCount={cartCount} />}
        <Routes>
          <Route
            path="/"
            element={<HomePage addToCart={addToCart} />}
          />
          <Route
            path="/collections/:slug"
            element={<CollectionPage addToCart={addToCart} />}
          />
          <Route
            path="/cart"
            element={
              <CartPage
                cartProducts={cartProducts}
                subtotal={subtotal}
                updateQuantity={updateQuantity}
                startCheckout={startCheckout}
                checkoutState={checkoutState}
                checkoutError={checkoutError}
              />
            }
          />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<Navigate to="/sign-in" replace />} />
          <Route path="/account" element={<Navigate to="/sign-in" replace />} />
          <Route path="/shipping" element={<PolicyPage pageKey="shipping" />} />
          <Route path="/returns" element={<PolicyPage pageKey="returns" />} />
          <Route path="/privacy" element={<PolicyPage pageKey="privacy" />} />
          <Route path="/terms" element={<PolicyPage pageKey="terms" />} />
          <Route path="/google-checkout/:itemId" element={<GoogleCheckoutRedirect />} />
          <Route
            path="/products/:slug"
            element={
              <ProductPage
                addToCart={addToCart}
                startBuyNow={startBuyNow}
                checkoutState={checkoutState}
                checkoutError={checkoutError}
              />
            }
          />
          <Route path="/admin" element={<AdminDashboard onCatalogUpdated={setCatalogState} />} />
        </Routes>
        {isAuthRoute ? null : <SiteFooter />}
      </CustomerAuthProvider>
    </CatalogContext.Provider>
  );
}

export default App;
