export const openAiAdsSdkUrl = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
export const openAiAdsScriptId = 'armoze-openai-ads-pixel';

export type OpenAiAdsQueue = {
  (...args: unknown[]): void;
  q: Array<ArrayLike<unknown>>;
};

export type OpenAiAdsStorefrontPayload = {
  currency?: string;
  value?: number;
  transaction_id?: string;
  page_path?: string;
  page_title?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>;
};

type OpenAiAdsContent = {
  id?: string;
  name?: string;
  content_type?: string;
  quantity?: number;
  amount?: number;
  currency?: string;
};

type OpenAiAdsEventData =
  | {
      type: 'contents';
      amount?: number;
      currency?: string;
      contents?: OpenAiAdsContent[];
    }
  | {
      type: 'customer_action';
    };

export type OpenAiAdsMeasureCall = [
  command: 'measure',
  eventName:
    | 'page_viewed'
    | 'contents_viewed'
    | 'items_added'
    | 'checkout_started'
    | 'order_created'
    | 'lead_created',
  eventData: OpenAiAdsEventData,
  options?: {
    event_id: string;
  },
];

type OpenAiAdsWindow = Window & {
  oaiq?: OpenAiAdsQueue;
};

const openAiEventByStorefrontEvent = {
  page_view: 'page_viewed',
  view_item: 'contents_viewed',
  view_item_list: 'contents_viewed',
  add_to_cart: 'items_added',
  begin_checkout: 'checkout_started',
  purchase: 'order_created',
  generate_lead: 'lead_created',
} as const;

function toMinorUnits(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? Math.max(0, Math.round(numericValue * 100))
    : undefined;
}

function getCurrency(value: unknown) {
  const currency = String(value || 'USD').trim().toUpperCase();

  return currency || 'USD';
}

function getPagePath(value: unknown) {
  const rawPath = String(value || '').trim();

  if (!rawPath) {
    return '/';
  }

  try {
    return new URL(rawPath, 'https://armoze.invalid').pathname || '/';
  } catch {
    return rawPath.split(/[?#]/, 1)[0] || '/';
  }
}

function getContents(payload: OpenAiAdsStorefrontPayload, currency: string) {
  return payload.items?.map((item) => {
    const amount = toMinorUnits(item.price);
    const numericQuantity = Number(item.quantity);
    const quantity = Number.isFinite(numericQuantity)
      ? Math.max(1, Math.round(numericQuantity))
      : 1;

    return {
      id: item.item_id,
      name: item.item_name,
      content_type: 'product',
      quantity,
      ...(amount !== undefined ? { amount, currency } : {}),
    };
  });
}

export function buildOpenAiAdsMeasureCall(
  storefrontEventName: string,
  payload: OpenAiAdsStorefrontPayload = {},
): OpenAiAdsMeasureCall | null {
  const eventName =
    openAiEventByStorefrontEvent[
      storefrontEventName as keyof typeof openAiEventByStorefrontEvent
    ];

  if (!eventName) {
    return null;
  }

  if (eventName === 'lead_created') {
    return ['measure', eventName, { type: 'customer_action' }];
  }

  if (eventName === 'page_viewed') {
    const pagePath = getPagePath(payload.page_path);

    return [
      'measure',
      eventName,
      {
        type: 'contents',
        contents: [
          {
            id: pagePath,
            name: String(payload.page_title || pagePath),
            content_type: 'page',
          },
        ],
      },
    ];
  }

  const currency = getCurrency(payload.currency);
  const amount = toMinorUnits(payload.value);
  const contents = getContents(payload, currency);
  const eventData: OpenAiAdsEventData = {
    type: 'contents',
    ...(amount !== undefined ? { amount, currency } : {}),
    ...(contents?.length ? { contents } : {}),
  };

  if (eventName === 'order_created' && payload.transaction_id) {
    return ['measure', eventName, eventData, { event_id: payload.transaction_id }];
  }

  return ['measure', eventName, eventData];
}

export function ensureOpenAiAdsPixel(
  pixelId: string,
  targetWindow: OpenAiAdsWindow = window,
  targetDocument: Document = document,
) {
  if (!pixelId || targetWindow.oaiq) {
    return false;
  }

  const queuedCalls: Array<ArrayLike<unknown>> = [];
  const oaiq = ((...args: unknown[]) => {
    queuedCalls.push(args);
  }) as OpenAiAdsQueue;
  oaiq.q = queuedCalls;
  targetWindow.oaiq = oaiq;

  if (!targetDocument.getElementById(openAiAdsScriptId)) {
    const script = targetDocument.createElement('script');
    script.id = openAiAdsScriptId;
    script.async = true;
    script.src = openAiAdsSdkUrl;
    targetDocument.head.appendChild(script);
  }

  targetWindow.oaiq('init', { pixelId });
  return true;
}
