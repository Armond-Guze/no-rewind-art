'use client';

import { useEffect } from 'react';

type GoogleCustomerReviewsOptInPayload = {
  merchantId: number;
  orderId: string;
  email: string;
  deliveryCountry: string;
  estimatedDeliveryDate: string;
};

type GoogleCustomerReviewsOptInResponse = {
  optIn?: GoogleCustomerReviewsOptInPayload | null;
};

type GoogleApi = {
  load: (apiName: 'surveyoptin', callback: () => void) => void;
  surveyoptin?: {
    render: (payload: {
      merchant_id: number;
      order_id: string;
      email: string;
      delivery_country: string;
      estimated_delivery_date: string;
      opt_in_style: 'CENTER_DIALOG';
    }) => void;
  };
};

declare global {
  interface Window {
    gapi?: GoogleApi;
    renderArmozeGoogleCustomerReviewsOptIn?: () => void;
    __armozeGoogleCustomerReviewsSessions?: Set<string>;
  }
}

const googleCustomerReviewsScriptId = 'google-customer-reviews-platform';
const optInRetryDelaysMs = [0, 1_500, 3_000, 5_000];

function getCheckoutSessionId() {
  const currentUrl = new URL(window.location.href);

  return currentUrl.searchParams.get('session_id') || '';
}

function renderGoogleCustomerReviewsOptIn(
  sessionId: string,
  optIn: GoogleCustomerReviewsOptInPayload,
) {
  const renderedSessions = window.__armozeGoogleCustomerReviewsSessions ?? new Set<string>();
  window.__armozeGoogleCustomerReviewsSessions = renderedSessions;

  if (renderedSessions.has(sessionId)) {
    return;
  }

  window.gapi?.load('surveyoptin', () => {
    window.gapi?.surveyoptin?.render({
      merchant_id: optIn.merchantId,
      order_id: optIn.orderId,
      email: optIn.email,
      delivery_country: optIn.deliveryCountry,
      estimated_delivery_date: optIn.estimatedDeliveryDate,
      opt_in_style: 'CENTER_DIALOG',
    });
    renderedSessions.add(sessionId);
  });
}

function loadGoogleCustomerReviewsScript(renderOptIn: () => void) {
  window.renderArmozeGoogleCustomerReviewsOptIn = renderOptIn;

  if (window.gapi?.load) {
    renderOptIn();
    return;
  }

  const existingScript = document.getElementById(googleCustomerReviewsScriptId);

  if (existingScript) {
    existingScript.addEventListener('load', renderOptIn, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = googleCustomerReviewsScriptId;
  script.src =
    'https://apis.google.com/js/platform.js?onload=renderArmozeGoogleCustomerReviewsOptIn';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export function GoogleCustomerReviewsOptIn({
  checkoutResult,
}: {
  checkoutResult?: string;
}) {
  useEffect(() => {
    if (checkoutResult !== 'success') {
      return;
    }

    const sessionId = getCheckoutSessionId();

    if (!sessionId) {
      return;
    }

    let cancelled = false;

    async function loadOptInData() {
      for (const retryDelayMs of optInRetryDelaysMs) {
        if (retryDelayMs) {
          await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
        }

        if (cancelled) {
          return;
        }

        try {
          const response = await fetch(
            `/api/google-customer-reviews/opt-in?session_id=${encodeURIComponent(sessionId)}`,
            { cache: 'no-store' },
          );

          if (!response.ok) {
            continue;
          }

          const data = (await response.json()) as GoogleCustomerReviewsOptInResponse;
          const optIn = data.optIn;

          if (!optIn) {
            continue;
          }

          if (!cancelled) {
            loadGoogleCustomerReviewsScript(() =>
              renderGoogleCustomerReviewsOptIn(sessionId, optIn),
            );
          }

          return;
        } catch {
          // Retry briefly because some payment methods settle just after the redirect.
        }
      }
    }

    void loadOptInData();

    return () => {
      cancelled = true;
    };
  }, [checkoutResult]);

  return null;
}
