import { errorJson, json, methodNotAllowed } from './_utils.js';
import { sendSupportRequestEmail } from '../notifications.js';
import { assertRateLimit, rateLimits } from '../rate-limit.js';

const maxRequestBytes = 4.25 * 1024 * 1024;
const maxPhotos = 3;
const maxPhotoBytes = 3 * 1024 * 1024;
const maxTotalPhotoBytes = 3.5 * 1024 * 1024;
const allowedPhotoTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanValue(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function sanitizeFilename(filename, index) {
  const cleaned = String(filename || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

  return cleaned || `support-photo-${index + 1}.jpg`;
}

export async function POST(request) {
  try {
    assertRateLimit(request, rateLimits.support);

    const contentType = request.headers.get('content-type') || '';
    const contentLength = Number(request.headers.get('content-length') || 0);

    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      throw requestError('Send the support form as multipart form data.', 415);
    }

    if (contentLength > maxRequestBytes) {
      throw requestError('The request is too large. Remove a photo or choose smaller files.', 413);
    }

    const formData = await request.formData();

    if (cleanValue(formData.get('company'), 120)) {
      return json({ ok: true });
    }

    const name = cleanValue(formData.get('name'), 80);
    const email = cleanValue(formData.get('email'), 160).toLowerCase();
    const orderNumber = cleanValue(formData.get('orderNumber'), 100);
    const topic = cleanValue(formData.get('topic'), 80);
    const message = cleanValue(formData.get('message'), 3000);
    const photoFiles = formData
      .getAll('photos')
      .filter((value) => value && typeof value === 'object' && typeof value.arrayBuffer === 'function');

    if (!name || name.length < 2) {
      throw requestError('Enter your name.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw requestError('Enter a valid email address.');
    }

    if (!topic) {
      throw requestError('Choose a support topic.');
    }

    if (message.length < 10) {
      throw requestError('Add a little more detail so support can review your request.');
    }

    if (photoFiles.length > maxPhotos) {
      throw requestError(`Choose no more than ${maxPhotos} photos.`);
    }

    let totalPhotoBytes = 0;
    const photos = [];

    for (const [index, file] of photoFiles.entries()) {
      if (!allowedPhotoTypes.has(file.type)) {
        throw requestError('Photos must be JPG, PNG, WEBP, HEIC, or HEIF files.');
      }

      if (file.size > maxPhotoBytes) {
        throw requestError(`${file.name || 'A photo'} is over the 3 MB per-photo limit.`, 413);
      }

      totalPhotoBytes += file.size;

      if (totalPhotoBytes > maxTotalPhotoBytes) {
        throw requestError('Keep the combined photo size under 3.5 MB.', 413);
      }

      photos.push({
        filename: sanitizeFilename(file.name, index),
        contentType: file.type,
        content: Buffer.from(await file.arrayBuffer()),
      });
    }

    const result = await sendSupportRequestEmail({
      name,
      email,
      orderNumber,
      topic,
      message,
      photos,
    });

    if (!result.sent) {
      throw requestError(
        result.reason || 'Support email is temporarily unavailable. Please email hello@armoze.com.',
        result.skipped ? 503 : 502,
      );
    }

    return json({ ok: true });
  } catch (error) {
    return errorJson(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
