const defaultAuthRedirectPath = '/account';
const validationOrigin = 'https://armoze.invalid';

export function getSafeAuthRedirectPath(value, fallback = defaultAuthRedirectPath) {
  const candidate = String(value || '').trim();

  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback;
  }

  try {
    const validationUrl = new URL(candidate, validationOrigin);

    if (validationUrl.origin !== validationOrigin) {
      return fallback;
    }

    return `${validationUrl.pathname}${validationUrl.search}${validationUrl.hash}`;
  } catch {
    return fallback;
  }
}

export function getAuthCallbackUrl(origin, redirectPath) {
  const callbackUrl = new URL('/sign-in', `${origin}/`);
  const safeNext = getSafeAuthRedirectPath(redirectPath);

  if (safeNext !== defaultAuthRedirectPath) {
    callbackUrl.searchParams.set('next', safeNext);
  }

  return callbackUrl.toString();
}

export function getSignInStepUrl({ email = '', next = defaultAuthRedirectPath, step = '' } = {}) {
  const searchParams = new URLSearchParams();
  const safeNext = getSafeAuthRedirectPath(next);

  if (step) {
    searchParams.set(step, '1');
  }

  if (email) {
    searchParams.set('email', email);
  }

  if (safeNext !== defaultAuthRedirectPath) {
    searchParams.set('next', safeNext);
  }

  const query = searchParams.toString();
  return query ? `/sign-in?${query}` : '/sign-in';
}
