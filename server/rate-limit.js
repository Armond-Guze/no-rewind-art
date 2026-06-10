const buckets = new Map();

function getClientKey(request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const forwardedIp = forwardedFor.split(',')[0]?.trim();
  const directIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    forwardedIp ||
    'unknown';

  return directIp;
}

function rateLimitError(retryAfterSeconds) {
  const error = new Error('Too many requests. Try again in a few minutes.');
  error.status = 429;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

export function assertRateLimit(request, { key, limit, windowMs }) {
  const now = Date.now();
  const bucketKey = `${key}:${getClientKey(request)}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    throw rateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
  }
}
