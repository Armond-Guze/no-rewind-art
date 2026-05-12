import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import { findProduct } from './catalog.js';

if (process.env.STRIPE_ALLOW_INSECURE_LOCAL_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('Stripe local TLS verification is disabled. Use this only for local test mode.');
}

const app = express();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const clientUrl = process.env.CLIENT_URL || 'http://127.0.0.1:5173';
const port = Number(process.env.PORT || 4242);
const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX === 'true';

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    })
  : null;

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    stripeConfigured: Boolean(stripe),
  });
});

app.post('/api/create-checkout-session', async (request, response) => {
  if (!stripe) {
    response.status(500).json({
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env.',
    });
    return;
  }

  const items = Array.isArray(request.body?.items) ? request.body.items : [];

  if (!items.length) {
    response.status(400).json({ error: 'Cart is empty.' });
    return;
  }

  const lineItems = [];

  for (const item of items) {
    const product = findProduct(item.id);
    const quantity = Number(item.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      response.status(400).json({ error: 'Invalid cart item.' });
      return;
    }

    lineItems.push({
      quantity,
      price_data: {
        currency: 'usd',
        unit_amount: product.unitAmount,
        product_data: {
          name: product.name,
          description: product.description,
        },
      },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
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
      },
    });

    response.json({ url: session.url });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: error?.message || 'Unable to create checkout session.',
    });
  }
});

app.listen(port, () => {
  console.log(`Armoze checkout server running on http://127.0.0.1:${port}`);
});
