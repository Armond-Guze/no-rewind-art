'use client';

export type AttributionTouch = {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  campaignId?: string;
  referrer?: string;
  landingPage: string;
  capturedAt: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  dclid?: string;
  gclsrc?: string;
  msclkid?: string;
  ttclid?: string;
  srsltid?: string;
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

function sourceMatches(source: string, candidates: string[]) {
  return candidates.some((candidate) =>
    source === candidate ||
    source.startsWith(`${candidate}.`) ||
    source.endsWith(`.${candidate}`),
  );
}

function getReferrerMedium(source: string) {
  if (sourceMatches(source, [
    'google.com',
    'bing.com',
    'search.yahoo.com',
    'yahoo.com',
    'duckduckgo.com',
    'ecosia.org',
    'baidu.com',
    'yandex.com',
    'search.brave.com',
  ])) {
    return 'organic';
  }

  if (sourceMatches(source, [
    'facebook.com',
    'instagram.com',
    'tiktok.com',
    'pinterest.com',
    'linkedin.com',
    'youtube.com',
    'twitter.com',
    't.co',
    'x.com',
    'reddit.com',
  ])) {
    return 'social';
  }

  return 'referral';
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

  if (params.get('gclid') || params.get('gbraid') || params.get('wbraid') || params.get('dclid')) {
    return { source: 'google', medium: 'cpc' };
  }

  if (params.get('msclkid')) {
    return { source: 'bing', medium: 'cpc' };
  }

  if (params.get('ttclid')) {
    return { source: 'tiktok', medium: 'paid_social' };
  }

  if (params.get('srsltid')) {
    return { source: 'google', medium: 'organic' };
  }

  if (params.get('fbclid')) {
    // Facebook appends fbclid to both paid ads and organic outbound links.
    // Ads should use UTMs (for example utm_medium=paid_social) so we do not
    // claim an organic Facebook click was definitely paid.
    return { source: 'facebook', medium: 'social' };
  }

  if (referrer) {
    try {
      const source = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
      return { source, medium: getReferrerMedium(source) };
    } catch {
      return { source: 'referral', medium: 'referral' };
    }
  }

  return { source: 'direct', medium: 'none' };
}

const landingPageParameterNames = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'gclsrc',
  'msclkid',
  'ttclid',
  'srsltid',
  'fbclid',
] as const;

function buildSafeLandingPage(params: URLSearchParams) {
  const safeParams = new URLSearchParams();

  landingPageParameterNames.forEach((name) => {
    const value = params.get(name)?.trim();

    if (value) {
      safeParams.set(name, value.slice(0, 250));
    }
  });

  const query = safeParams.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
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
    ...(params.get('utm_id') ? { campaignId: params.get('utm_id')!.trim() } : {}),
    ...(referrer ? { referrer } : {}),
    landingPage: buildSafeLandingPage(params),
    capturedAt: new Date().toISOString(),
    ...(params.get('gclid') ? { gclid: params.get('gclid')!.trim() } : {}),
    ...(params.get('gbraid') ? { gbraid: params.get('gbraid')!.trim() } : {}),
    ...(params.get('wbraid') ? { wbraid: params.get('wbraid')!.trim() } : {}),
    ...(params.get('dclid') ? { dclid: params.get('dclid')!.trim() } : {}),
    ...(params.get('gclsrc') ? { gclsrc: params.get('gclsrc')!.trim() } : {}),
    ...(params.get('msclkid') ? { msclkid: params.get('msclkid')!.trim() } : {}),
    ...(params.get('ttclid') ? { ttclid: params.get('ttclid')!.trim() } : {}),
    ...(params.get('srsltid') ? { srsltid: params.get('srsltid')!.trim() } : {}),
    ...(params.get('fbclid') ? { fbclid: params.get('fbclid')!.trim() } : {}),
  };
}

function hasUrlAttributionSignal() {
  const params = new URLSearchParams(window.location.search);

  return landingPageParameterNames.some((key) => Boolean(params.get(key)?.trim()));
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
