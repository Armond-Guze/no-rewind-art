import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import { findProduct, findSizeOption } from './catalog.js';
import { sendOwnerOrderNotification } from './notifications.js';
import { createOrderStore } from './order-store.js';

if (process.env.STRIPE_ALLOW_INSECURE_LOCAL_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('Stripe local TLS verification is disabled. Use this only for local test mode.');
}

const app = express();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const clientUrl = process.env.CLIENT_URL || 'http://127.0.0.1:5173';
const port = Number(process.env.PORT || 4242);
const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX === 'true';
const adminApiToken = process.env.ADMIN_API_TOKEN;
const allowUnsignedWebhooks = process.env.STRIPE_WEBHOOK_ALLOW_UNSIGNED === 'true';

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    })
  : null;

const orderStore = createOrderStore();
await orderStore.init();

function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);
}

function clientError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getPaymentIntentId(session) {
  if (!session.payment_intent) {
    return null;
  }

  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent.id;
}

function normalizeCartItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw clientError('Cart is empty.');
  }

  return items.map((item) => {
    const product = findProduct(item.id);
    const quantity = Number(item.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw clientError('Invalid cart item.');
    }

    const sizeOption = findSizeOption(product, item.sizeId);

    return {
      productId: product.id,
      title: product.name,
      description: product.description,
      imagePath: product.imagePath || '',
      sizeId: sizeOption.id,
      sizeLabel: sizeOption.label,
      quantity,
      unitAmount: sizeOption.priceInCents,
      lineTotal: sizeOption.priceInCents * quantity,
    };
  });
}

function buildLineItems(cartItems) {
  return cartItems.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: 'usd',
      unit_amount: item.unitAmount,
      product_data: {
        name: item.title,
        description: `${item.description} Size: ${item.sizeLabel}.`,
        metadata: {
          productId: item.productId,
          sizeId: item.sizeId,
          sizeLabel: item.sizeLabel,
          imagePath: item.imagePath,
        },
      },
    },
  }));
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
      quantity,
      unitAmount: quantity ? Math.round(lineTotal / quantity) : lineTotal,
      lineTotal,
    };
  });
}

async function completeOrderFromCheckoutSession(session, paymentStatusOverride) {
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

function requireAdmin(request, response, next) {
  if (!adminApiToken) {
    response.status(503).json({
      error: 'Admin dashboard is not configured. Set ADMIN_API_TOKEN in .env.',
    });
    return;
  }

  const header = request.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

  if (token !== adminApiToken) {
    response.status(401).json({ error: 'Invalid admin token.' });
    return;
  }

  next();
}

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (request, response) => {
  if (!stripe) {
    response.status(500).json({ error: 'Stripe is not configured.' });
    return;
  }

  let event;

  try {
    if (stripeWebhookSecret) {
      event = stripe.webhooks.constructEvent(
        request.body,
        request.headers['stripe-signature'],
        stripeWebhookSecret,
      );
    } else if (allowUnsignedWebhooks) {
      event = JSON.parse(request.body.toString('utf8'));
    } else {
      response.status(500).json({
        error: 'Stripe webhook signing is not configured. Set STRIPE_WEBHOOK_SECRET.',
      });
      return;
    }
  } catch (error) {
    response.status(400).json({ error: error.message });
    return;
  }

  try {
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

    response.json({ received: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: error?.message || 'Webhook processing failed.' });
  }
});

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    stripeConfigured: Boolean(stripe),
    stripeWebhookConfigured: Boolean(stripeWebhookSecret),
    storage: orderStore.type,
    notificationsConfigured: Boolean(process.env.RESEND_API_KEY && process.env.ORDER_NOTIFICATION_EMAIL),
    adminConfigured: Boolean(adminApiToken),
  });
});

app.post('/api/create-checkout-session', async (request, response) => {
  if (!stripe) {
    response.status(500).json({
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env.',
    });
    return;
  }

  let cartItems;

  try {
    cartItems = normalizeCartItems(request.body?.items);
  } catch (error) {
    response.status(error.status || 400).json({ error: error.message });
    return;
  }

  try {
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
      automatic_tax: {
        enabled: automaticTaxEnabled,
      },
      success_url: `${clientUrl}/?checkout=success#cart`,
      cancel_url: `${clientUrl}/?checkout=cancelled#cart`,
      metadata: {
        brand: 'Armoze',
        orderSource: 'vite-storefront',
      },
    });

    await orderStore.upsertOrder(buildCheckoutDraft(session, cartItems));

    response.json({ url: session.url });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: error?.message || 'Unable to create checkout session.',
    });
  }
});

app.get('/api/admin/orders', requireAdmin, async (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit || 50), 1), 100);
  const result = await orderStore.listOrders({ limit });
  const notifications = await orderStore.listNotifications({ limit: 12 });

  response.json({
    ...result,
    notifications,
  });
});

app.patch('/api/admin/orders/:orderId', requireAdmin, async (request, response) => {
  const allowedStatuses = new Set(['new', 'printing', 'shipped', 'delivered', 'cancelled']);
  const fulfillmentStatus = request.body?.fulfillmentStatus;

  if (!allowedStatuses.has(fulfillmentStatus)) {
    response.status(400).json({ error: 'Invalid fulfillment status.' });
    return;
  }

  const order = await orderStore.updateFulfillmentStatus(request.params.orderId, fulfillmentStatus);

  if (!order) {
    response.status(404).json({ error: 'Order not found.' });
    return;
  }

  response.json({ order });
});

app.listen(port, () => {
  console.log(`Armoze checkout server running on http://127.0.0.1:${port}`);
  console.log(`Order storage: ${orderStore.type}`);
});
