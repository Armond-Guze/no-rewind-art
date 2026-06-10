import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import Stripe from 'stripe';
import { findFrameOption, findProduct, findSizeOption, getFramePriceDelta } from './catalog.js';
import { createNewsletterStore } from './newsletter-store.js';
import { sendOwnerOrderNotification } from './notifications.js';
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
const adminApiToken = process.env.ADMIN_API_TOKEN;
const allowUnsignedWebhooks = process.env.STRIPE_WEBHOOK_ALLOW_UNSIGNED === 'true';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'artwork';

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

function buildLineItems(cartItems) {
  return cartItems.map((item) => {
    const images = getCheckoutImageUrls(item);

    return {
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: item.unitAmount,
        product_data: {
          name: item.title,
          description: `${item.description} Size: ${item.sizeLabel}. Frame: ${item.frameLabel}.`,
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

function buildCheckoutDraft(session, cartItems) {
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
    customerEmail: session.customer_details?.email || existingOrder?.customerEmail || '',
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

export async function getHealth() {
  await ensureReady();

  return {
    ok: true,
    stripeConfigured: Boolean(stripe),
    stripeWebhookConfigured: Boolean(stripeWebhookSecret),
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

export async function createCheckoutSession(body) {
  await ensureReady();

  if (!stripe) {
    throw httpError('Stripe is not configured. Set STRIPE_SECRET_KEY in .env.', 500);
  }

  const cartItems = await normalizeCartItems(body?.items);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: buildLineItems(cartItems),
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
              value: 5,
            },
            maximum: {
              unit: 'business_day',
              value: 10,
            },
          },
        },
      },
    ],
    allow_promotion_codes: true,
    automatic_tax: {
      enabled: automaticTaxEnabled,
    },
    success_url: `${clientUrl}/cart?checkout=success#cart`,
    cancel_url: `${clientUrl}/cart?checkout=cancelled#cart`,
    metadata: {
      brand: 'Armoze',
      orderSource: 'next-storefront',
    },
  });

  await orderStore.upsertOrder(buildCheckoutDraft(session, cartItems));

  return { url: session.url };
}

export async function subscribeToNewsletter(body) {
  await ensureReady();

  const subscriber = await newsletterStore.subscribe({
    email: normalizeNewsletterEmail(body?.email),
    source: body?.source || 'footer',
  });

  return {
    ok: true,
    subscriber: {
      email: subscriber.email,
      status: subscriber.status,
    },
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

export async function updateAdminOrder(orderId, { fulfillmentStatus }) {
  await ensureReady();

  const allowedStatuses = new Set(['new', 'printing', 'shipped', 'delivered', 'cancelled']);

  if (!allowedStatuses.has(fulfillmentStatus)) {
    throw httpError('Invalid fulfillment status.');
  }

  const order = await orderStore.updateFulfillmentStatus(orderId, fulfillmentStatus);

  if (!order) {
    throw httpError('Order not found.', 404);
  }

  return { order };
}
