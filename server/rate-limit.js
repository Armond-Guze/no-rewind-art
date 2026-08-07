const buckets = new Map();
let nextPruneAt = 0;

export const rateLimits = {
  checkout: {
    key: 'checkout',
    limit: 20,
    windowMs: 10 * 60 * 1000,
  },
  newsletter: {
    key: 'newsletter',
    limit: 8,
    windowMs: 15 * 60 * 1000,
  },
  support: {
    key: 'support',
    limit: 5,
    windowMs: 30 * 60 * 1000,
  },
  accountOrders: {
    key: 'account-orders',
    limit: 60,
    windowMs: 10 * 60 * 1000,
  },
  orderStatus: {
    key: 'order-status',
    limit: 12,
    windowMs: 10 * 60 * 1000,
  },
  admin: {
    key: 'admin',
    limit: 120,
    windowMs: 10 * 60 * 1000,
  },
  adminAuthFailed: {
    key: 'admin-auth-failed',
    limit: 8,
    windowMs: 15 * 60 * 1000,
  },
};

function getClientKey(request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const forwardedIp = forwardedFor.split(',')[0]?.trim();
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    forwardedIp ||
    'unknown';

  return clientIp;
}

function rateLimitError(retryAfterSeconds) {
  const error = new Error('Too many requests. Try again in a few minutes.');
  error.status = 429;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

function pruneExpiredBuckets(now) {
  if (now < nextPruneAt) {
    return;
  }

  nextPruneAt = now + 5 * 60 * 1000;

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey);
    }
  }
}

export function assertRateLimit(request, { key, limit, windowMs }) {
  const now = Date.now();
  pruneExpiredBuckets(now);

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
