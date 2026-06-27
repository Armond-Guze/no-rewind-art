import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { findFrameOption, findProduct, findSizeOption, getFramePriceDelta } from './catalog.js';
import { createNewsletterStore } from './newsletter-store.js';
import { sendNewsletterDiscountEmail, sendOwnerOrderNotification } from './notifications.js';
import { createOrderStore } from './order-store.js';
import { createProductStore } from './product-store.js';

if (process.env.STRIPE_ALLOW_INSECURE_LOCAL_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('Stripe local TLS verification is disabled. Use this only for local test mode.');
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const clientUrl = process.env.CLIENT_URL || 'http://127.0.0.1:3000';
const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX === 'true';
const stripeProductTaxCode = process.env.STRIPE_PRODUCT_TAX_CODE || '';
const adminApiToken = process.env.ADMIN_API_TOKEN;
const googleCustomerReviewsMerchantId = Number(process.env.GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID || 5793512839);
const allowUnsignedWebhooks = process.env.STRIPE_WEBHOOK_ALLOW_UNSIGNED === 'true';
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || '');
const supabasePublicUrl = normalizeSupabaseUrl(
  supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
);
const supabasePublicKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'artwork';
const newsletterDiscountCode = process.env.NEWSLETTER_DISCOUNT_CODE || 'FIRST15';
const newsletterDiscountLabel = process.env.NEWSLETTER_DISCOUNT_LABEL || '15%';

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    })
  : null;

const orderStore = createOrderStore();
const productStore = createProductStore();
const newsletterStore = createNewsletterStore();
const orderStoreReady = orderStore.init();
const productStoreReady = productStore.init();
const newsletterStoreReady = newsletterStore.init();
const artworkDir = path.resolve(process.cwd(), 'public', 'artwork');
let supabaseAuthClient = null;

function normalizeSupabaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '');
}

function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);
}

export function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureReady() {
  await Promise.all([orderStoreReady, productStoreReady, newsletterStoreReady]);
}

async function ensureProductStoreReady() {
  await productStoreReady;
}

function normalizeNewsletterEmail(value) {
  const email = String(value || '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError('Enter a valid email address.');
  }

  return email;
}

function getPaymentIntentId(session) {
  if (!session.payment_intent) {
    return null;
  }

  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent.id;
}

function getSupabaseAuthClient() {
  if (!supabasePublicUrl || !supabasePublicKey) {
    return null;
  }

  supabaseAuthClient ??= createClient(supabasePublicUrl, supabasePublicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAuthClient;
}

async function getCustomerFromAuthorizationHeader(authorizationHeader = '') {
  const token = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    throw httpError('Sign in to view your orders.', 401);
  }

  const authClient = getSupabaseAuthClient();

  if (!authClient) {
    throw httpError('Customer accounts are not configured.', 503);
  }

  const { data, error } = await authClient.auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase();

  if (error || !email) {
    throw httpError('Your session could not be verified. Sign in again.', 401);
  }

  return {
    id: data.user.id,
    email,
  };
}

async function getOptionalCustomerFromAuthorizationHeader(authorizationHeader = '') {
  const token = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : '';

  if (!token || !getSupabaseAuthClient()) {
    return null;
  }

  try {
    return await getCustomerFromAuthorizationHeader(authorizationHeader);
  } catch (error) {
    if (error.status === 401 || error.status === 503) {
      return null;
    }

    throw error;
  }
}

function publicOrderItem(item) {
  return {
    productId: item.productId || '',
    title: item.title || 'Armoze print',
    sizeLabel: item.sizeLabel || '',
    frameLabel: item.frameLabel || '',
    quantity: Number(item.quantity || 1),
    unitAmount: Number(item.unitAmount || 0),
    lineTotal: Number(item.lineTotal || 0),
  };
}

function publicCustomerOrder(order) {
  return {
    id: order.id,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency || 'usd',
    amountSubtotal: Number(order.amountSubtotal || 0),
    amountShipping: Number(order.amountShipping || 0),
    amountTax: Number(order.amountTax || 0),
    amountTotal: Number(order.amountTotal || 0),
    items: Array.isArray(order.items) ? order.items.map(publicOrderItem) : [],
    carrier: order.carrier || '',
    trackingNumber: order.trackingNumber || '',
    trackingUrl: order.trackingUrl || '',
    shippedAt: order.shippedAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function normalizeOptionalText(value, maxLength) {
  const text = String(value || '').trim();

  if (text.length > maxLength) {
    throw httpError(`Keep this field under ${maxLength} characters.`);
  }

  return text;
}

function normalizeOptionalUrl(value) {
  const url = normalizeOptionalText(value, 500);

  if (!url) {
    return '';
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw httpError('Enter a valid tracking URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw httpError('Tracking URL must start with http or https.');
  }

  return parsedUrl.toString();
}

function normalizeStripeSessionId(value) {
  const sessionId = String(value || '').trim();

  if (!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId)) {
    throw httpError('Invalid checkout session.', 400);
  }

  return sessionId;
}

function addBusinessDays(date, businessDays) {
  const nextDate = new Date(date);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const day = nextDate.getUTCDay();

    if (day !== 0 && day !== 6) {
      daysAdded += 1;
    }
  }

  return nextDate;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function normalizeCartItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw httpError('Cart is empty.');
  }

  const catalogProducts = await productStore.listProducts();

  return items.map((item) => {
    const product = findProduct(item.id, catalogProducts);
    const quantity = Number(item.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw httpError('Invalid cart item.');
    }

    const sizeOption = findSizeOption(product, item.sizeId);
    const frameOption = findFrameOption(product, item.frameId, sizeOption);
    const framePriceDelta = getFramePriceDelta(product, sizeOption, frameOption);
    const unitAmount = sizeOption.priceInCents + framePriceDelta;

    return {
      productId: product.id,
      title: product.name,
      description: product.description,
      imagePath: product.imagePath || '',
      sizeId: sizeOption.id,
      sizeLabel: sizeOption.label,
      frameId: frameOption.id,
      frameLabel: frameOption.label,
      framePriceDelta,
      quantity,
      unitAmount,
      lineTotal: unitAmount * quantity,
    };
  });
}

async function scanArtworkAssets(directory = artworkDir, prefix = '/artwork') {
  const entries = await readdir(directory, { withFileTypes: true });
  const assets = [];
  const imageExtensions = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.webp']);

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    const publicPath = `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      assets.push(...(await scanArtworkAssets(entryPath, publicPath)));
      continue;
    }

    if (imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      assets.push(publicPath);
    }
  }

  return assets.sort((a, b) => a.localeCompare(b));
}

function sanitizeUploadName(value) {
  return String(value || 'artwork')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'artwork';
}

function getFileExtension(file) {
  const fromName = path.extname(file.name || '').toLowerCase();

  if (fromName) {
    return fromName;
  }

  if (file.type === 'image/jpeg') {
    return '.jpg';
  }

  if (file.type === 'image/png') {
    return '.png';
  }

  if (file.type === 'image/webp') {
    return '.webp';
  }

  return '';
}

function getCheckoutImageUrls(item) {
  if (!item.imagePath || !clientUrl.startsWith('https://')) {
    return undefined;
  }

  return [new URL(item.imagePath, clientUrl).toString()];
}

function getCheckoutFrameLabel(item) {
  if (item.frameId === 'black-frame') {
    return 'Black framed canvas';
  }

  if (item.frameId === 'white-frame') {
    return 'White framed canvas';
  }

  return 'Canvas';
}

function buildLineItems(cartItems) {
  return cartItems.map((item) => {
    const images = getCheckoutImageUrls(item);
    const frameLabel = getCheckoutFrameLabel(item);

    return {
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: item.unitAmount,
        tax_behavior: 'exclusive',
        product_data: {
          name: item.title,
          description: `Size: ${item.sizeLabel} | ${frameLabel}`,
          ...(stripeProductTaxCode ? { tax_code: stripeProductTaxCode } : {}),
          ...(images ? { images } : {}),
          metadata: {
            productId: item.productId,
            sizeId: item.sizeId,
            sizeLabel: item.sizeLabel,
            frameId: item.frameId,
            frameLabel: item.frameLabel,
            imagePath: item.imagePath,
          },
        },
      },
    };
  });
}

function buildCheckoutDraft(session, cartItems, customer = null) {
  const amountSubtotal = cartItems.reduce((total, item) => total + item.lineTotal, 0);

  return {
    id: session.id,
    stripeSessionId: session.id,
    paymentIntentId: getPaymentIntentId(session),
    checkoutStatus: session.status || 'open',
    paymentStatus: session.payment_status || 'checkout_started',
    fulfillmentStatus: 'new',
    currency: session.currency || 'usd',
    amountSubtotal: session.amount_subtotal ?? amountSubtotal,
    amountShipping: session.total_details?.amount_shipping || 0,
    amountTax: session.total_details?.amount_tax || 0,
    amountTotal: session.amount_total ?? amountSubtotal,
    items: cartItems,
    customerEmail: customer?.email || session.customer_details?.email || session.customer_email || '',
    raw: {
      checkoutSession: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
      },
    },
  };
}

async function getLineItemsFromStripe(sessionId) {
  if (!stripe) {
    return [];
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
    expand: ['data.price.product'],
  });

  return lineItems.data.map((item) => {
    const stripeProduct =
      item.price && typeof item.price.product === 'object' ? item.price.product : null;
    const metadata = stripeProduct?.metadata || {};
    const quantity = Number(item.quantity || 1);
    const lineTotal = Number(item.amount_total || item.amount_subtotal || 0);

    return {
      productId: metadata.productId || stripeProduct?.id || item.id,
      title: stripeProduct?.name || item.description || 'Armoze print',
      description: stripeProduct?.description || '',
      imagePath: metadata.imagePath || '',
      sizeId: metadata.sizeId || '',
      sizeLabel: metadata.sizeLabel || '',
      frameId: metadata.frameId || '',
      frameLabel: metadata.frameLabel || '',
      quantity,
      unitAmount: quantity ? Math.round(lineTotal / quantity) : lineTotal,
      lineTotal,
    };
  });
}

async function completeOrderFromCheckoutSession(session, paymentStatusOverride) {
  await ensureReady();

  const existingOrder = await orderStore.getOrder(session.id);
  const items = existingOrder?.items?.length
    ? existingOrder.items
    : await getLineItemsFromStripe(session.id);
  const paymentStatus = paymentStatusOverride || session.payment_status || 'pending';
  const orderUpdate = {
    id: session.id,
    stripeSessionId: session.id,
    paymentIntentId: getPaymentIntentId(session),
    checkoutStatus: session.status || 'complete',
    paymentStatus,
    fulfillmentStatus: existingOrder?.fulfillmentStatus || 'new',
    customerName: session.customer_details?.name || existingOrder?.customerName || '',
    customerEmail: session.customer_details?.email || session.customer_email || existingOrder?.customerEmail || '',
    currency: session.currency || existingOrder?.currency || 'usd',
    amountSubtotal: session.amount_subtotal ?? existingOrder?.amountSubtotal ?? 0,
    amountShipping: session.total_details?.amount_shipping || existingOrder?.amountShipping || 0,
    amountTax: session.total_details?.amount_tax || existingOrder?.amountTax || 0,
    amountTotal: session.amount_total ?? existingOrder?.amountTotal ?? 0,
    items,
    raw: {
      checkoutSession: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customer: session.customer,
      },
    },
  };

  const { order, wasNewlyPaid } = await orderStore.upsertOrder(orderUpdate);

  if (wasNewlyPaid) {
    await orderStore.createNotification({
      type: 'order_paid',
      orderId: order.id,
      title: 'New paid order',
      body: `${order.customerEmail || 'A customer'} paid ${formatPrice(order.amountTotal, order.currency)}.`,
      channel: 'system',
      status: 'created',
    });

    try {
      const notificationResult = await sendOwnerOrderNotification(order);

      await orderStore.createNotification({
        type: 'owner_email',
        orderId: order.id,
        title: notificationResult.sent ? 'Owner email sent' : 'Owner email skipped',
        body: notificationResult.sent
          ? `Notification email sent for order ${order.id}.`
          : notificationResult.reason,
        channel: 'email',
        status: notificationResult.sent ? 'sent' : notificationResult.skipped ? 'skipped' : 'failed',
        metadata: notificationResult,
      });

      if (notificationResult.sent) {
        await orderStore.markOwnerNotificationSent(order.id);
      }
    } catch (error) {
      console.error(error);
      await orderStore.createNotification({
        type: 'owner_email',
        orderId: order.id,
        title: 'Owner email failed',
        body: error?.message || 'Unable to send owner notification.',
        channel: 'email',
        status: 'failed',
      });
    }
  }

  return order;
}

function getOrderTrackingItems(order) {
  return (Array.isArray(order.items) ? order.items : []).map((item) => {
    const quantity = Number(item.quantity || 1);
    const lineTotal = Number(item.lineTotal || item.unitAmount || 0);
    const unitAmount = Number(item.unitAmount || (quantity ? Math.round(lineTotal / quantity) : lineTotal));
    const variant = [item.sizeLabel, item.frameLabel].filter(Boolean).join(' / ');

    return {
      item_id: item.productId || item.id || 'armoze-print',
      item_name: item.title || 'Armoze print',
      item_category: 'Canvas print',
      price: unitAmount / 100,
      quantity,
      item_variant: variant,
    };
  });
}

export async function getGoogleAdsConversion(sessionId) {
  await ensureReady();

  if (!stripe) {
    throw httpError('Stripe is not configured.', 500);
  }

  const normalizedSessionId = normalizeStripeSessionId(sessionId);
  const session = await stripe.checkout.sessions.retrieve(normalizedSessionId);

  if (session.payment_status !== 'paid') {
    return { conversion: null };
  }

  const order = await completeOrderFromCheckoutSession(session, 'paid');
  const amountTotal = Number(order.amountTotal ?? session.amount_total ?? 0);
  const currency = String(order.currency || session.currency || 'usd').toUpperCase();

  return {
    conversion: {
      transaction_id: order.id || session.id,
      currency,
      value: amountTotal / 100,
      items: getOrderTrackingItems(order),
    },
  };
}

export async function getHealth() {
  await ensureReady();

  return {
    ok: true,
    stripeConfigured: Boolean(stripe),
    stripeWebhookConfigured: Boolean(stripeWebhookSecret),
    stripeAutomaticTaxEnabled: automaticTaxEnabled,
    stripeProductTaxCodeConfigured: Boolean(stripeProductTaxCode),
    storage: orderStore.type,
    catalogStorage: productStore.type,
    newsletterStorage: newsletterStore.type,
    notificationsConfigured: Boolean(process.env.RESEND_API_KEY && process.env.ORDER_NOTIFICATION_EMAIL),
    adminConfigured: Boolean(adminApiToken),
  };
}

export async function listPublicCatalog() {
  await ensureProductStoreReady();

  return productStore.listCatalog();
}

export async function createCheckoutSession(body, authorizationHeader = '') {
  await ensureReady();

  if (!stripe) {
    throw httpError('Stripe is not configured. Set STRIPE_SECRET_KEY in .env.', 500);
  }

  const cartItems = await normalizeCartItems(body?.items);
  const customer = await getOptionalCustomerFromAuthorizationHeader(authorizationHeader);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: buildLineItems(cartItems),
    payment_method_types: ['card', 'amazon_pay', 'klarna', 'cashapp'],
    ...(customer?.email ? { customer_email: customer.email } : {}),
    billing_address_collection: 'auto',
    shipping_address_collection: {
      allowed_countries: ['US'],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: 0,
            currency: 'usd',
          },
          display_name: 'Free standard shipping',
          delivery_estimate: {
            minimum: {
              unit: 'business_day',
              value: 2,
            },
            maximum: {
              unit: 'business_day',
              value: 5,
            },
          },
        },
      },
    ],
    allow_promotion_codes: true,
    automatic_tax: {
      enabled: automaticTaxEnabled,
    },
    success_url: `${clientUrl}/cart?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/cart?checkout=cancelled#cart`,
    metadata: {
      brand: 'Armoze',
      orderSource: 'next-storefront',
    },
  });

  await orderStore.upsertOrder(buildCheckoutDraft(session, cartItems, customer));

  return { url: session.url };
}

export async function getGoogleCustomerReviewOptIn(sessionId) {
  await ensureReady();

  if (!stripe) {
    throw httpError('Stripe is not configured.', 500);
  }

  if (!googleCustomerReviewsMerchantId) {
    return { optIn: null };
  }

  const normalizedSessionId = normalizeStripeSessionId(sessionId);
  const session = await stripe.checkout.sessions.retrieve(normalizedSessionId);

  if (session.payment_status !== 'paid') {
    return { optIn: null };
  }

  const order = await completeOrderFromCheckoutSession(session, 'paid');
  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    order.customerEmail ||
    '';
  const deliveryCountry =
    session.shipping_details?.address?.country ||
    session.customer_details?.address?.country ||
    'US';

  if (!customerEmail || !deliveryCountry) {
    return { optIn: null };
  }

  const orderDate = session.created
    ? new Date(session.created * 1000)
    : new Date(order.createdAt || Date.now());

  return {
    optIn: {
      merchantId: googleCustomerReviewsMerchantId,
      orderId: order.id || session.id,
      email: customerEmail,
      deliveryCountry,
      estimatedDeliveryDate: formatDateOnly(addBusinessDays(orderDate, 8)),
    },
  };
}

export async function subscribeToNewsletter(body) {
  await ensureReady();

  const subscriber = await newsletterStore.subscribe({
    email: normalizeNewsletterEmail(body?.email),
    source: body?.source || 'footer',
  });
  let discountEmail = {
    sent: false,
    skipped: true,
    reason: 'Discount email was not requested.',
  };

  if (body?.sendDiscountEmail !== false) {
    discountEmail = await sendNewsletterDiscountEmail({
      email: subscriber.email,
      discountCode: newsletterDiscountCode,
      discountLabel: newsletterDiscountLabel,
    });
  }

  return {
    ok: true,
    discount: {
      code: newsletterDiscountCode,
      label: newsletterDiscountLabel,
    },
    email: discountEmail,
    subscriber: {
      email: subscriber.email,
      status: subscriber.status,
    },
  };
}

export async function listCustomerOrders(authorizationHeader) {
  await ensureReady();

  const customer = await getCustomerFromAuthorizationHeader(authorizationHeader);
  const result = await orderStore.listCustomerOrdersByEmail(customer.email, { limit: 25 });

  return {
    customer: {
      email: customer.email,
    },
    orders: result.orders.map(publicCustomerOrder),
  };
}

export async function processStripeWebhook(rawBody, stripeSignature) {
  await ensureReady();

  if (!stripe) {
    throw httpError('Stripe is not configured.', 500);
  }

  let event;

  if (stripeWebhookSecret) {
    event = stripe.webhooks.constructEvent(rawBody, stripeSignature, stripeWebhookSecret);
  } else if (allowUnsignedWebhooks) {
    event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody);
  } else {
    throw httpError('Stripe webhook signing is not configured. Set STRIPE_WEBHOOK_SECRET.', 500);
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    await completeOrderFromCheckoutSession(event.data.object, 'paid');
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    await completeOrderFromCheckoutSession(event.data.object, 'failed');
  }

  if (event.type === 'checkout.session.expired') {
    await completeOrderFromCheckoutSession(event.data.object, 'expired');
  }

  return { received: true };
}

export function assertAdmin(authorizationHeader = '') {
  if (!adminApiToken) {
    throw httpError('Admin dashboard is not configured. Set ADMIN_API_TOKEN in .env.', 503);
  }

  const token = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : '';

  if (token !== adminApiToken) {
    throw httpError('Invalid admin token.', 401);
  }
}

export async function listAdminOrders({ limit = 50 } = {}) {
  await ensureReady();

  const safeLimit = Math.min(Math.max(Number(limit || 50), 1), 100);
  const result = await orderStore.listOrders({ limit: safeLimit });
  const notifications = await orderStore.listNotifications({ limit: 12 });

  return {
    ...result,
    notifications,
  };
}

export async function listAdminProducts() {
  await ensureReady();

  return productStore.listCatalog({ includeUnpublished: true });
}

export async function updateAdminProduct(productId, productUpdate) {
  await ensureReady();

  const product = await productStore.updateProduct(productId, productUpdate || {});

  if (!product) {
    throw httpError('Product not found.', 404);
  }

  return { product };
}

export async function listAdminAssets() {
  const assets = await scanArtworkAssets();

  return { assets };
}

export async function uploadAdminAsset(formData) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw httpError('Image upload needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.', 501);
  }

  const file = formData.get('file');
  const productSlug = sanitizeUploadName(formData.get('productSlug'));

  if (!file || typeof file.arrayBuffer !== 'function') {
    throw httpError('Upload a valid image file.');
  }

  if (!String(file.type || '').startsWith('image/')) {
    throw httpError('Only image uploads are supported.');
  }

  const extension = getFileExtension(file);
  const storagePath = `products/${productSlug}/${Date.now()}-${sanitizeUploadName(file.name)}${extension}`;
  const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${supabaseStorageBucket}/${storagePath}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!uploadResponse.ok) {
    const message = await uploadResponse.text().catch(() => '');
    throw httpError(message || 'Image upload failed.', uploadResponse.status);
  }

  return {
    asset: `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${supabaseStorageBucket}/${storagePath}`,
  };
}

export async function updateAdminOrder(orderId, body = {}) {
  await ensureReady();

  const allowedStatuses = new Set(['new', 'printing', 'shipped', 'delivered', 'cancelled']);
  const updateBody = body && typeof body === 'object' ? body : {};
  const update = {};

  if (Object.hasOwn(updateBody, 'fulfillmentStatus')) {
    if (!allowedStatuses.has(updateBody.fulfillmentStatus)) {
      throw httpError('Invalid fulfillment status.');
    }

    update.fulfillmentStatus = updateBody.fulfillmentStatus;
  }

  if (Object.hasOwn(updateBody, 'carrier')) {
    update.carrier = normalizeOptionalText(updateBody.carrier, 80);
  }

  if (Object.hasOwn(updateBody, 'trackingNumber')) {
    update.trackingNumber = normalizeOptionalText(updateBody.trackingNumber, 120);
  }

  if (Object.hasOwn(updateBody, 'trackingUrl')) {
    update.trackingUrl = normalizeOptionalUrl(updateBody.trackingUrl);
  }

  if (!Object.keys(update).length) {
    throw httpError('Order update is empty.');
  }

  const order =
    typeof orderStore.updateFulfillment === 'function'
      ? await orderStore.updateFulfillment(orderId, update)
      : await orderStore.updateFulfillmentStatus(orderId, update.fulfillmentStatus);

  if (!order) {
    throw httpError('Order not found.', 404);
  }

  return { order };
}
