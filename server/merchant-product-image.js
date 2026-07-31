import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const MERCHANT_IMAGE_SIZE = 1600;

const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_INPUT_PIXELS = 64 * 1024 * 1024;
const PRODUCT_MAX_SPAN = 1360;
const SHADOW_COLOR = [31, 26, 18];
const SHADOW_LAYERS = [
  { offsetY: 24, blur: 18, opacity: 0.38 },
  { offsetY: 6, blur: 6, opacity: 0.2 },
];

function validateSourceSize(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('The merchant image source is empty.');
  }

  if (buffer.length > MAX_SOURCE_BYTES) {
    throw new Error('The merchant image source exceeds the 32 MB safety limit.');
  }
}

function isInsideDirectory(filePath, directoryPath) {
  const normalizedFilePath = path.resolve(filePath).toLowerCase();
  const normalizedDirectoryPath = `${path.resolve(directoryPath).toLowerCase()}${path.sep}`;

  return normalizedFilePath.startsWith(normalizedDirectoryPath);
}

async function readLocalSourceImage(imagePath) {
  const publicDirectory = path.resolve(process.cwd(), 'public');
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(new URL(imagePath, 'https://armoze.local').pathname);
  } catch {
    throw new Error('The local merchant image path is invalid.');
  }

  const sourcePath = path.resolve(publicDirectory, decodedPath.replace(/^[/\\]+/, ''));

  if (!isInsideDirectory(sourcePath, publicDirectory)) {
    throw new Error('The local merchant image path is outside the public directory.');
  }

  return readFile(sourcePath);
}

async function fetchSanitySourceImage(imageUrl) {
  const url = new URL(imageUrl);

  if (url.protocol !== 'https:' || url.hostname !== 'cdn.sanity.io') {
    throw new Error('Only Sanity CDN URLs can be rendered as remote merchant images.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg' },
      signal: controller.signal,
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      throw new Error(`Sanity returned ${response.status} for the merchant image source.`);
    }

    const finalUrl = new URL(response.url);

    if (finalUrl.protocol !== 'https:' || finalUrl.hostname !== 'cdn.sanity.io') {
      throw new Error('The merchant image source redirected outside the Sanity CDN.');
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = Number(response.headers.get('content-length') || 0);

    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error('The merchant image source did not return an image.');
    }

    if (contentLength > MAX_SOURCE_BYTES) {
      throw new Error('The merchant image source exceeds the 32 MB safety limit.');
    }

    return readResponseBodyWithLimit(response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function readResponseBodyWithLimit(response, maxBytes = MAX_SOURCE_BYTES) {
  if (!response?.body) {
    throw new Error('The merchant image source returned an empty response.');
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('The merchant image source exceeds the 32 MB safety limit.');
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

export async function readMerchantSourceImage(imageUrl) {
  const normalizedUrl = String(imageUrl || '').trim();

  if (!normalizedUrl) {
    throw new Error('A product image is required to build a merchant image.');
  }

  const buffer = /^https?:\/\//i.test(normalizedUrl)
    ? await fetchSanitySourceImage(normalizedUrl)
    : await readLocalSourceImage(normalizedUrl);

  validateSourceSize(buffer);
  return buffer;
}

function getOrientedDimensions(metadata) {
  return {
    width: metadata.autoOrient?.width || metadata.width,
    height: metadata.autoOrient?.height || metadata.height,
  };
}

async function inspectSource(sourceBuffer) {
  const image = sharp(sourceBuffer, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate();
  const metadata = await image.metadata();
  const dimensions = getOrientedDimensions(metadata);

  if (!dimensions.width || !dimensions.height) {
    throw new Error('The merchant image source has invalid dimensions.');
  }

  const stats = await image.stats();
  const trimTransparentPixels = metadata.hasAlpha === true && stats.isOpaque === false;

  if (!trimTransparentPixels) {
    return { ...dimensions, trimTransparentPixels };
  }

  const { info } = await image
    .clone()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    width: info.width,
    height: info.height,
    trimTransparentPixels,
  };
}

export function getMerchantImageLayout(sourceWidth, sourceHeight) {
  const width = Number(sourceWidth);
  const height = Number(sourceHeight);

  if (!width || !height || width < 1 || height < 1) {
    throw new Error('The merchant image layout requires positive source dimensions.');
  }

  const scale = Math.min(PRODUCT_MAX_SPAN / width, PRODUCT_MAX_SPAN / height);
  const productWidth = Math.max(1, Math.round(width * scale));
  const productHeight = Math.max(1, Math.round(height * scale));
  const shadowBottom = Math.max(...SHADOW_LAYERS.map((layer) => layer.offsetY + layer.blur * 3));
  const left = Math.round((MERCHANT_IMAGE_SIZE - productWidth) / 2);
  const top = Math.round((MERCHANT_IMAGE_SIZE - productHeight - shadowBottom) / 2);

  return {
    left,
    top,
    productWidth,
    productHeight,
    shadowBottom,
  };
}

async function renderShadowLayer(productBuffer, layer) {
  const padding = Math.ceil(layer.blur * 3);
  const [red, green, blue] = SHADOW_COLOR;
  const { data, info } = await sharp(productBuffer)
    .ensureAlpha()
    .linear([0, 0, 0, layer.opacity], [red, green, blue, 0])
    .extend({
      top: padding,
      right: padding,
      bottom: padding,
      left: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .blur(layer.blur)
    .png()
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height, padding, ...layer };
}

export async function renderMerchantProductImage(sourceBuffer) {
  validateSourceSize(sourceBuffer);

  const source = await inspectSource(sourceBuffer);
  const layout = getMerchantImageLayout(source.width, source.height);
  let productPipeline = sharp(sourceBuffer, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate();

  if (source.trimTransparentPixels) {
    productPipeline = productPipeline.trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 8,
    });
  }

  const productBuffer = await productPipeline
    .resize(layout.productWidth, layout.productHeight, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .png({ compressionLevel: 8, adaptiveFiltering: true })
    .toBuffer();
  const shadowLayers = await Promise.all(
    SHADOW_LAYERS.map((layer) => renderShadowLayer(productBuffer, layer)),
  );
  const composites = [
    ...shadowLayers.map((shadow) => ({
      input: shadow.data,
      left: layout.left - shadow.padding,
      top: layout.top + shadow.offsetY - shadow.padding,
    })),
    {
      input: productBuffer,
      left: layout.left,
      top: layout.top,
    },
  ];

  return sharp({
    create: {
      width: MERCHANT_IMAGE_SIZE,
      height: MERCHANT_IMAGE_SIZE,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(composites)
    .webp({ quality: 92, alphaQuality: 100, effort: 4, smartSubsample: true })
    .toBuffer();
}
