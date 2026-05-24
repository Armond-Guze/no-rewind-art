import express from 'express';
import { buildGoogleMerchantFeedXml } from './google-merchant-feed.js';
import {
  assertAdmin,
  createCheckoutSession,
  getHealth,
  listAdminAssets,
  listAdminOrders,
  listAdminProducts,
  listPublicCatalog,
  processStripeWebhook,
  subscribeToNewsletter,
  updateAdminOrder,
  updateAdminProduct,
} from './backend.js';

const app = express();
const port = Number(process.env.PORT || 4242);

function sendError(response, error) {
  response.status(error?.status || 500).json({
    error: error?.message || 'Request failed.',
  });
}

function requireAdmin(request, response, next) {
  try {
    assertAdmin(request.get('authorization') || '');
    next();
  } catch (error) {
    sendError(response, error);
  }
}

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (request, response) => {
  try {
    response.json(await processStripeWebhook(request.body, request.headers['stripe-signature']));
  } catch (error) {
    sendError(response, error);
  }
});

app.use(express.json());

app.get('/api/health', async (_request, response) => {
  try {
    response.json(await getHealth());
  } catch (error) {
    sendError(response, error);
  }
});

app.get('/api/products', async (_request, response) => {
  try {
    response.json(await listPublicCatalog());
  } catch (error) {
    sendError(response, error);
  }
});

async function sendGoogleMerchantFeed(_request, response) {
  try {
    response.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    response.type('application/xml');
    response.send(await buildGoogleMerchantFeedXml());
  } catch (error) {
    sendError(response, error);
  }
}

app.get('/merchant-feed.xml', sendGoogleMerchantFeed);
app.get('/api/google-merchant-feed.xml', sendGoogleMerchantFeed);

app.post('/api/create-checkout-session', async (request, response) => {
  try {
    response.json(await createCheckoutSession(request.body));
  } catch (error) {
    sendError(response, error);
  }
});

app.post('/api/newsletter', async (request, response) => {
  try {
    response.json(await subscribeToNewsletter(request.body));
  } catch (error) {
    sendError(response, error);
  }
});

app.get('/api/admin/orders', requireAdmin, async (request, response) => {
  try {
    response.json(await listAdminOrders({ limit: request.query.limit }));
  } catch (error) {
    sendError(response, error);
  }
});

app.patch('/api/admin/orders/:orderId', requireAdmin, async (request, response) => {
  try {
    response.json(await updateAdminOrder(request.params.orderId, request.body));
  } catch (error) {
    sendError(response, error);
  }
});

app.get('/api/admin/products', requireAdmin, async (_request, response) => {
  try {
    response.json(await listAdminProducts());
  } catch (error) {
    sendError(response, error);
  }
});

app.patch('/api/admin/products/:productId', requireAdmin, async (request, response) => {
  try {
    response.json(await updateAdminProduct(request.params.productId, request.body));
  } catch (error) {
    sendError(response, error);
  }
});

app.get('/api/admin/assets', requireAdmin, async (_request, response) => {
  try {
    response.json(await listAdminAssets());
  } catch (error) {
    sendError(response, error);
  }
});

app.listen(port, async () => {
  const health = await getHealth();
  console.log(`Armoze checkout server running on http://127.0.0.1:${port}`);
  console.log(`Order storage: ${health.storage}`);
});
