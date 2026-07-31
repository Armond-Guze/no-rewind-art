import 'dotenv/config';
import { createProductStore } from '../product-store.js';
import {
  buildMerchantImagePath,
  getMerchantImageVersion,
  isCanonicalMerchantImageRequest,
} from '../merchant-image-url.js';
import {
  readMerchantSourceImage,
  renderMerchantProductImage,
} from '../merchant-product-image.js';

const productStore = createProductStore();
const productStoreReady = productStore.init();

function imageError(message, status = 500) {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function getProductId(request) {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/merchant-images\/([^/]+)\/image\.webp$/i);

  if (!match) {
    return '';
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return '';
  }
}

export async function GET(request) {
  const productId = getProductId(request);

  if (!productId) {
    return imageError('Merchant image not found.', 404);
  }

  try {
    await productStoreReady;
    const catalog = await productStore.listCatalog();
    const product = catalog.products.find(
      (candidate) => candidate.published !== false && candidate.id === productId && candidate.image,
    );

    if (!product) {
      return imageError('Merchant image not found.', 404);
    }

    const requestUrl = new URL(request.url);
    const version = getMerchantImageVersion(product);
    const canonicalPath = buildMerchantImagePath(product);

    if (!isCanonicalMerchantImageRequest(requestUrl, product)) {
      return new Response(null, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=3600',
          Location: canonicalPath,
        },
      });
    }

    const imageBuffer = await renderMerchantProductImage(
      await readMerchantSourceImage(product.image),
    );

    return new Response(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable',
        'Content-Length': String(imageBuffer.length),
        'Content-Type': 'image/webp',
        ETag: `"merchant-${version}"`,
      },
    });
  } catch (error) {
    console.error('Unable to render merchant product image.', error?.message || error);
    return imageError('Merchant image is temporarily unavailable.', 503);
  }
}
