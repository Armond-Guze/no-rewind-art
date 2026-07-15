'use client';

export type AttributionTouch = {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPage: string;
  capturedAt: string;
  gclid?: string;
  fbclid?: string;
};

export type CheckoutAttribution = {
  firstTouch: AttributionTouch;
  lastTouch: AttributionTouch;
};

const firstTouchKey = 'armoze-attribution-first-touch-v1';
const lastTouchKey = 'armoze-attribution-last-touch-v1';
const sessionTouchKey = 'armoze-attribution-session-touch-v1';
const attributionLifetimeMs = 90 * 24 * 60 * 60 * 1000;

function readTouch(key: string) {
  try {
    const value = window.localStorage.getItem(key);

    if (!value) {
      return null;
    }

    const touch = JSON.parse(value) as AttributionTouch;
    const capturedAt = new Date(touch.capturedAt).getTime();

    if (!touch.source || !touch.medium || !touch.landingPage || !Number.isFinite(capturedAt)) {
      return null;
    }

    if (Date.now() - capturedAt > attributionLifetimeMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return touch;
  } catch {
    return null;
  }
}

function writeTouch(key: string, touch: AttributionTouch) {
  try {
    window.localStorage.setItem(key, JSON.stringify(touch));
  } catch {
    // Attribution should never block shopping when storage is unavailable.
  }
}

function getExternalReferrer() {
  if (!document.referrer) {
    return '';
  }

  try {
    const referrer = new URL(document.referrer);

    return referrer.host === window.location.host ? '' : referrer.toString();
  } catch {
    return '';
  }
}

function getSourceAndMedium(params: URLSearchParams, referrer: string) {
  const campaignSource = params.get('utm_source')?.trim();
  const campaignMedium = params.get('utm_medium')?.trim();

  if (campaignSource) {
    return {
      source: campaignSource.toLowerCase(),
      medium: (campaignMedium || 'campaign').toLowerCase(),
    };
  }

  if (params.get('gclid')) {
    return { source: 'google', medium: 'cpc' };
  }

  if (params.get('fbclid')) {
    return { source: 'facebook', medium: 'paid_social' };
  }

  if (referrer) {
    try {
      return { source: new URL(referrer).hostname.replace(/^www\./, ''), medium: 'referral' };
    } catch {
      return { source: 'referral', medium: 'referral' };
    }
  }

  return { source: 'direct', medium: 'none' };
}

function buildCurrentTouch(): AttributionTouch {
  const params = new URLSearchParams(window.location.search);
  const referrer = getExternalReferrer();
  const { source, medium } = getSourceAndMedium(params, referrer);

  return {
    source,
    medium,
    ...(params.get('utm_campaign') ? { campaign: params.get('utm_campaign')!.trim() } : {}),
    ...(params.get('utm_content') ? { content: params.get('utm_content')!.trim() } : {}),
    ...(params.get('utm_term') ? { term: params.get('utm_term')!.trim() } : {}),
    ...(referrer ? { referrer } : {}),
    landingPage: `${window.location.pathname}${window.location.search}`,
    capturedAt: new Date().toISOString(),
    ...(params.get('gclid') ? { gclid: params.get('gclid')!.trim() } : {}),
    ...(params.get('fbclid') ? { fbclid: params.get('fbclid')!.trim() } : {}),
  };
}

function hasUrlAttributionSignal() {
  const params = new URLSearchParams(window.location.search);

  return [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'fbclid',
  ].some((key) => params.has(key));
}

export function captureStorefrontAttribution() {
  if (typeof window === 'undefined') {
    return null;
  }

  const currentTouch = buildCurrentTouch();
  const hasExplicitAttribution = hasUrlAttributionSignal();
  const firstTouch = readTouch(firstTouchKey);
  const lastTouch = readTouch(lastTouchKey);
  let sessionLandingPage = '';

  try {
    sessionLandingPage = window.sessionStorage.getItem(sessionTouchKey) || '';
  } catch {
    // Continue with local attribution when session storage is unavailable.
  }

  if (!firstTouch) {
    writeTouch(firstTouchKey, currentTouch);
  }

  if (!lastTouch || !sessionLandingPage || hasExplicitAttribution) {
    writeTouch(lastTouchKey, currentTouch);
  }

  if (!sessionLandingPage) {
    try {
      window.sessionStorage.setItem(sessionTouchKey, currentTouch.landingPage);
    } catch {
      // Checkout still works without session storage.
    }
  }

  return {
    firstTouch: firstTouch || currentTouch,
    lastTouch:
      !lastTouch || !sessionLandingPage || hasExplicitAttribution
        ? currentTouch
        : lastTouch,
  };
}

export function getCheckoutAttribution(): CheckoutAttribution | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return captureStorefrontAttribution();
}
