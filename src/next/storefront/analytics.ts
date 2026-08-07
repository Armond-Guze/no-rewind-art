'use client';

import type { Product, FrameOption, SizeOption } from '../../data/products';
import { getPublicEnv } from '../../env';
import { getBaseFrameOption, getConfiguredUnitPrice, getFeaturedSizeOption } from './product-utils';

type EcommercePayload = {
  currency?: string;
  value?: number;
  transaction_id?: string;
  coupon?: string;
  page_location?: string;
  page_path?: string;
  page_title?: string;
  search_term?: string;
  item_list_id?: string;
  item_list_name?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price: number;
    quantity: number;
    item_variant?: string;
    variant?: string;
    index?: number;
  }>;
};

type QueuedMetaPixel = {
  (...args: unknown[]): void;
  queue: unknown[];
  callMethod?: unknown;
  loaded?: boolean;
  version?: string;
};

type QueuedOpenAiPixel = {
  (...args: unknown[]): void;
  q: unknown[][];
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: QueuedMetaPixel;
    _fbq?: QueuedMetaPixel;
    oaiq?: QueuedOpenAiPixel;
  }
}

const gaMeasurementId = getPublicEnv('VITE_GA_MEASUREMENT_ID');
const googleAdsId = getPublicEnv('VITE_GOOGLE_ADS_ID');
const googleAdsPurchaseLabel = getPublicEnv('VITE_GOOGLE_ADS_PURCHASE_LABEL');
const googleAdsPurchaseEventName =
  getPublicEnv('VITE_GOOGLE_ADS_PURCHASE_EVENT_NAME') || 'conversion_event_purchase_1';
const metaPixelId = getPublicEnv('VITE_META_PIXEL_ID');
const openAiAdsPixelId = getPublicEnv('VITE_OPENAI_ADS_PIXEL_ID');
let storefrontTrackingInitialized = false;

function appendScript(src: string, id: string) {
  if (document.getElementById(id)) {
    return;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initStorefrontTracking() {
  if (typeof window === 'undefined') {
    return;
  }

  if (storefrontTrackingInitialized) {
    return;
  }

  storefrontTrackingInitialized = true;
  window.dataLayer ??= [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // Google Tag expects the native arguments object, matching its install snippet.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());
  }

  const primaryGoogleTagId = gaMeasurementId || googleAdsId;

  if (primaryGoogleTagId) {
    appendScript(
      `https://www.googletagmanager.com/gtag/js?id=${primaryGoogleTagId}`,
      'armoze-google-tag',
    );
  }

  if (gaMeasurementId) {
    window.gtag?.('config', gaMeasurementId, { send_page_view: false });
  }

  if (googleAdsId) {
    window.gtag?.('config', googleAdsId, { send_page_view: false });
  }

  if (metaPixelId && !window.fbq) {
    const fbq = ((...args: unknown[]) => {
      fbq.queue.push(args);
    }) as QueuedMetaPixel;
    fbq.queue = [];

    window.fbq = Object.assign(fbq, {
      callMethod: null,
      queue: [],
      loaded: true,
      version: '2.0',
    });
    window._fbq = window.fbq;
    appendScript('https://connect.facebook.net/en_US/fbevents.js', 'armoze-meta-pixel');
    window.fbq('init', metaPixelId);
  }

  if (openAiAdsPixelId && !window.oaiq) {
    const queue: unknown[][] = [];
    const oaiq = function oaiq(...args: unknown[]) {
      queue.push(args);
    } as QueuedOpenAiPixel;
    oaiq.q = queue;

    window.oaiq = oaiq;
    appendScript('https://bzrcdn.openai.com/sdk/oaiq.min.js', 'armoze-openai-ads-pixel');
    window.oaiq('init', { pixelId: openAiAdsPixelId });
  }
}

export function trackStorefrontEvent(eventName: string, payload: EcommercePayload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  initStorefrontTracking();
  window.gtag?.('event', eventName, payload);

  if (eventName === 'purchase' && googleAdsId) {
    const conversionPayload = {
      value: payload.value,
      currency: payload.currency || 'USD',
      ...(payload.transaction_id ? { transaction_id: payload.transaction_id } : {}),
    };

    if (googleAdsPurchaseLabel) {
      window.gtag?.('event', 'conversion', {
        send_to: `${googleAdsId}/${googleAdsPurchaseLabel}`,
        ...conversionPayload,
      });
    } else if (googleAdsPurchaseEventName) {
      window.gtag?.('event', googleAdsPurchaseEventName, conversionPayload);
    }
  }

  if (eventName === 'purchase' && openAiAdsPixelId) {
    const currency = (payload.currency || 'USD').toUpperCase();
    const value = Number(payload.value);
    const amount = Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : undefined;
    const contents = payload.items?.map((item) => {
      const itemPrice = Number(item.price);
      const itemAmount = Number.isFinite(itemPrice)
        ? Math.max(0, Math.round(itemPrice * 100))
        : undefined;

      return {
        id: item.item_id,
        name: item.item_name,
        content_type: 'product',
        quantity: Math.max(1, Math.round(item.quantity || 1)),
        ...(itemAmount !== undefined ? { amount: itemAmount, currency } : {}),
      };
    });

    window.oaiq?.(
      'measure',
      'order_created',
      {
        type: 'contents',
        ...(amount !== undefined ? { amount, currency } : {}),
        ...(contents?.length ? { contents } : {}),
      },
      ...(payload.transaction_id ? [{ event_id: payload.transaction_id }] : []),
    );
  }

  const metaEventByName: Record<string, string> = {
    page_view: 'PageView',
    view_item: 'ViewContent',
    search: 'Search',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    purchase: 'Purchase',
    generate_lead: 'Lead',
  };
  const metaEvent = metaEventByName[eventName];

  if (metaEvent) {
    window.fbq?.('track', metaEvent, {
      currency: payload.currency,
      value: payload.value,
      content_ids: payload.items?.map((item) => item.item_id),
      contents: payload.items?.map((item) => ({
        id: item.item_id,
        quantity: item.quantity || 1,
        item_price: item.price,
      })),
    });
  }
}

export function getProductTrackingItem(
  product: Product,
  sizeOption: SizeOption = getFeaturedSizeOption(product),
  frameOption: FrameOption = getBaseFrameOption(product),
  quantity = 1,
) {
  return {
    item_id: product.id,
    item_name: product.title,
    item_category: product.tone,
    price: getConfiguredUnitPrice(product, sizeOption, frameOption) / 100,
    quantity,
    item_variant: `${sizeOption.label} / ${frameOption.label}`,
  };
}
