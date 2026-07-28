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
    'window.renderArmozeGoogleCustomerReviewsOptIn = function () {',
    "  window.gapi.load('surveyoptin', function () {",
    `    window.gapi.surveyoptin.render(${serializeForInlineScript(payload)});`,
    '  });',
    '};',
  ].join('\n');
}
