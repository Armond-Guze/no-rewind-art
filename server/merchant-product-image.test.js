import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  buildMerchantImagePath,
  isCanonicalMerchantImageRequest,
} from './merchant-image-url.js';
import {
  getMerchantImageLayout,
  MERCHANT_IMAGE_SIZE,
  readResponseBodyWithLimit,
  renderMerchantProductImage,
} from './merchant-product-image.js';

function pixelAt(data, info, x, y) {
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + info.channels)];
}

test('builds stable, versioned merchant image paths', () => {
  const product = {
    id: 'bookshelf-canvas',
    image: 'https://cdn.sanity.io/images/project/production/bookshelf-6000x3000.png',
  };
  const firstPath = buildMerchantImagePath(product);

  assert.match(firstPath, /^\/merchant-images\/bookshelf-canvas\/image\.webp\?v=[a-f0-9]{12}$/);
  assert.equal(buildMerchantImagePath(product), firstPath);
  assert.notEqual(
    buildMerchantImagePath({ ...product, image: product.image.replace('bookshelf', 'bookshelf-v2') }),
    firstPath,
  );
  assert.equal(isCanonicalMerchantImageRequest(`https://armoze.com${firstPath}`, product), true);

  for (const noncanonicalUrl of [
    `https://armoze.com${firstPath}&`,
    `https://armoze.com${firstPath.replace('?v=', '?%76=')}`,
    `https://armoze.com${firstPath.replace('image.webp', 'image.WEBP')}`,
    `https://armoze.com${firstPath.replace('bookshelf', '%62ookshelf')}`,
  ]) {
    assert.equal(isCanonicalMerchantImageRequest(noncanonicalUrl, product), false);
  }
});

test('stops reading a remote image as soon as it exceeds the byte limit', async () => {
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8));
      controller.enqueue(new Uint8Array(8));
      controller.close();
    },
  }));

  await assert.rejects(
    readResponseBodyWithLimit(response, 12),
    /exceeds the 32 MB safety limit/,
  );
});

test('renders a square white merchant image with the storefront shadow treatment', async () => {
  const source = await sharp({
    create: {
      width: 1000,
      height: 500,
      channels: 3,
      background: { r: 171, g: 58, b: 47 },
    },
  }).png().toBuffer();
  const output = await renderMerchantProductImage(source);
  const metadata = await sharp(output).metadata();
  const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
  const layout = getMerchantImageLayout(1000, 500);
  const corner = pixelAt(data, info, 10, 10);
  const productCenter = pixelAt(
    data,
    info,
    Math.round(layout.left + layout.productWidth / 2),
    Math.round(layout.top + layout.productHeight / 2),
  );
  const shadow = pixelAt(
    data,
    info,
    Math.round(layout.left + layout.productWidth / 2),
    layout.top + layout.productHeight + 30,
  );

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, MERCHANT_IMAGE_SIZE);
  assert.equal(metadata.height, MERCHANT_IMAGE_SIZE);
  assert.equal(metadata.hasAlpha, false);
  assert.ok(corner.every((channel) => channel >= 250));
  assert.ok(productCenter[0] > productCenter[1] * 2);
  assert.ok(shadow.every((channel) => channel < 250));
  assert.ok(output.length < 16 * 1024 * 1024);
});

test('trims transparent template padding before sizing the product', async () => {
  const product = await sharp({
    create: {
      width: 800,
      height: 300,
      channels: 4,
      background: { r: 40, g: 60, b: 90, alpha: 1 },
    },
  }).png().toBuffer();
  const paddedSource = await sharp({
    create: {
      width: 1200,
      height: 1200,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: product, left: 200, top: 450 }]).png().toBuffer();
  const output = await renderMerchantProductImage(paddedSource);
  const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
  const center = pixelAt(data, info, 800, 760);

  assert.ok(center[2] > center[0]);
});
