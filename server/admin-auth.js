import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

let cachedSupabaseAuthClient = null;
let cachedSupabaseAuthClientKey = '';

function authError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeSupabaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '');
}

export function parseAdminEmails(value) {
  return [
    ...new Set(
      String(value || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function getAdminAuthConfig(env = process.env) {
  const adminEmailSource = env.ADMIN_EMAILS === undefined ? env.ORDER_NOTIFICATION_EMAIL : env.ADMIN_EMAILS;
  const supabaseUrl = normalizeSupabaseUrl(
    env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || '',
  );
  const supabasePublicKey =
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    '';

  return {
    adminEmails: parseAdminEmails(adminEmailSource),
    legacyToken: String(env.ADMIN_API_TOKEN || '').trim(),
    supabaseUrl,
    supabasePublicKey: String(supabasePublicKey).trim(),
  };
}

export function safeTokenEqual(candidate, expected) {
  if (!candidate || !expected) {
    return false;
  }

  const candidateDigest = createHash('sha256').update(candidate).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function isAdminAuthConfigured(config = getAdminAuthConfig()) {
  return Boolean(
    config.legacyToken ||
      (config.adminEmails.length && config.supabaseUrl && config.supabasePublicKey),
  );
}

function getSupabaseAuthClient(config) {
  const clientKey = `${config.supabaseUrl}\n${config.supabasePublicKey}`;

  if (cachedSupabaseAuthClient && cachedSupabaseAuthClientKey === clientKey) {
    return cachedSupabaseAuthClient;
  }

  cachedSupabaseAuthClient = createClient(config.supabaseUrl, config.supabasePublicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  cachedSupabaseAuthClientKey = clientKey;
  return cachedSupabaseAuthClient;
}

async function verifySupabaseAccessToken(token, config) {
  const { data, error } = await getSupabaseAuthClient(config).auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase();

  if (error || !email) {
    return null;
  }

  return {
    id: data.user.id,
    email,
  };
}

export async function assertAdminAuthorization(
  authorizationHeader = '',
  { env = process.env, verifyAccessToken = verifySupabaseAccessToken } = {},
) {
  const config = getAdminAuthConfig(env);
  const token = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    if (!isAdminAuthConfigured(config)) {
      throw authError(
        'Admin dashboard is not configured. Set ADMIN_EMAILS with Supabase Auth or set ADMIN_API_TOKEN for emergency access.',
        503,
      );
    }

    throw authError('Sign in with an authorized admin account or use the emergency admin token.', 401);
  }

  if (config.legacyToken && safeTokenEqual(token, config.legacyToken)) {
    return { method: 'legacy-token', email: null, userId: null };
  }

  if (config.adminEmails.length) {
    if (!config.supabaseUrl || !config.supabasePublicKey) {
      if (!config.legacyToken) {
        throw authError(
          'Admin sign-in is not configured. Set the Supabase URL and publishable key.',
          503,
        );
      }
    } else {
      let user;

      try {
        user = await verifyAccessToken(token, config);
      } catch {
        throw authError('Admin identity could not be verified. Try again.', 503);
      }

      if (user?.email) {
        const normalizedEmail = user.email.trim().toLowerCase();

        if (!config.adminEmails.includes(normalizedEmail)) {
          throw authError('This account is not authorized for the admin dashboard.', 403);
        }

        return {
          method: 'supabase',
          email: normalizedEmail,
          userId: user.id || null,
        };
      }
    }
  }

  if (config.legacyToken || (config.adminEmails.length && config.supabaseUrl && config.supabasePublicKey)) {
    throw authError('Admin session is invalid or expired. Sign in again.', 401);
  }

  throw authError(
    'Admin dashboard is not configured. Set ADMIN_EMAILS with Supabase Auth or set ADMIN_API_TOKEN for emergency access.',
    503,
  );
}
