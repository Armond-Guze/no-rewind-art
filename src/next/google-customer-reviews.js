export const googleCustomerReviewsPlatformScriptUrl =
  'https://apis.google.com/js/platform.js?onload=renderArmozeGoogleCustomerReviewsOptIn';

function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function buildGoogleCustomerReviewsOptInScript(optIn) {
  if (!optIn) {
    return '';
  }

  const merchantId = Number(optIn.merchantId);

  if (!Number.isSafeInteger(merchantId) || merchantId <= 0) {
    return '';
  }

  const orderId = String(optIn.orderId || '');
  const email = String(optIn.email || '');
  const deliveryCountry = String(optIn.deliveryCountry || '').toUpperCase();
  const estimatedDeliveryDate = String(optIn.estimatedDeliveryDate || '');

  if (
    !orderId ||
    orderId.length > 256 ||
    !email ||
    email.length > 320 ||
    !email.includes('@') ||
    !/^[A-Z]{2}$/.test(deliveryCountry) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(estimatedDeliveryDate)
  ) {
    return '';
  }

  const payload = {
    merchant_id: merchantId,
    order_id: orderId,
    email,
    delivery_country: deliveryCountry,
    estimated_delivery_date: estimatedDeliveryDate,
    opt_in_style: 'CENTER_DIALOG',
  };

  return [
    '(function () {',
    `  var payload = ${serializeForInlineScript(payload)};`,
    '  var rendered = window.__armozeGoogleCustomerReviewsSessions || new Set();',
    '  window.__armozeGoogleCustomerReviewsSessions = rendered;',
    '  function renderOptIn() {',
    '    if (rendered.has(payload.order_id) || !window.gapi?.load) return;',
    "    window.gapi.load('surveyoptin', function () {",
    '      if (rendered.has(payload.order_id) || !window.gapi?.surveyoptin?.render) return;',
    '      window.gapi.surveyoptin.render(payload);',
    '      rendered.add(payload.order_id);',
    '    });',
    '  }',
    '  window.renderArmozeGoogleCustomerReviewsOptIn = function () {',
    "    if (document.readyState === 'loading') {",
    "      document.addEventListener('DOMContentLoaded', renderOptIn, { once: true });",
    '    } else {',
    '      renderOptIn();',
    '    }',
    '  };',
    '  if (window.gapi?.load) {',
    '    window.renderArmozeGoogleCustomerReviewsOptIn();',
    '    return;',
    '  }',
    "  var script = document.getElementById('google-customer-reviews-platform');",
    '  if (script) {',
    "    script.addEventListener('load', window.renderArmozeGoogleCustomerReviewsOptIn, { once: true });",
    '    return;',
    '  }',
    // Load only after defining the callback. A separate React async script is
    // hoisted to <head> and can finish before the inline callback in the body.
    "  script = document.createElement('script');",
    "  script.id = 'google-customer-reviews-platform';",
    `  script.src = ${serializeForInlineScript(googleCustomerReviewsPlatformScriptUrl)};`,
    '  script.async = true;',
    '  document.head.appendChild(script);',
    '})();',
  ].join('\n');
}
