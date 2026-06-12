'use client';

import { useEffect } from 'react';

type MerchantWidgetConfig = {
  merchant_id: number;
  position?: string;
  region?: string;
};

type MerchantWidget = {
  start: (config: MerchantWidgetConfig) => void;
};

declare global {
  interface Window {
    merchantwidget?: MerchantWidget;
    __armozeGoogleCustomerReviewsBadgeStarted?: boolean;
  }
}

const badgeEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_ENABLED === 'true';
const merchantId = Number(
  process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID || '5793512839',
);
const badgePosition = process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_POSITION;
const badgeRegion = process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_REVIEWS_BADGE_REGION;
const merchantWidgetScriptId = 'merchantWidgetScript';

function getMerchantWidgetConfig(): MerchantWidgetConfig {
  const config: MerchantWidgetConfig = {
    merchant_id: merchantId,
  };

  if (badgePosition) {
    config.position = badgePosition;
  }

  if (badgeRegion) {
    config.region = badgeRegion;
  }

  return config;
}

export function GoogleCustomerReviewsBadge() {
  useEffect(() => {
    if (!badgeEnabled || !Number.isFinite(merchantId) || merchantId <= 0) {
      return;
    }

    const startBadge = () => {
      if (window.__armozeGoogleCustomerReviewsBadgeStarted || !window.merchantwidget) {
        return;
      }

      window.merchantwidget.start(getMerchantWidgetConfig());
      window.__armozeGoogleCustomerReviewsBadgeStarted = true;
    };

    if (window.merchantwidget) {
      startBadge();
      return;
    }

    const existingScript = document.getElementById(merchantWidgetScriptId);

    if (existingScript) {
      existingScript.addEventListener('load', startBadge, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = merchantWidgetScriptId;
    script.src = 'https://www.gstatic.com/shopping/merchant/merchantwidget.js';
    script.defer = true;
    script.addEventListener('load', startBadge, { once: true });
    document.head.appendChild(script);
  }, []);

  return null;
}
