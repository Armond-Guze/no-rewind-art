export type GoogleAdsPurchasePayload = {
  currency?: string;
  value?: number;
  transaction_id?: string;
};

export type GoogleAdsPurchaseCall = [
  command: 'event',
  eventName: string,
  eventData: {
    value: number;
    currency: string;
    transaction_id: string;
    send_to?: string;
  },
];

function normalizeCurrency(value: unknown) {
  const currency = String(value || 'USD').trim().toUpperCase();

  return /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
}

export function buildGoogleAdsPurchaseCall(
  googleAdsId: string,
  purchaseLabel: string,
  purchaseEventName: string,
  payload: GoogleAdsPurchasePayload,
): GoogleAdsPurchaseCall | null {
  const adsId = googleAdsId.trim();
  const transactionId = String(payload.transaction_id || '').trim();
  const value = Number(payload.value);

  if (!adsId || !transactionId || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const conversionPayload = {
    value,
    currency: normalizeCurrency(payload.currency),
    transaction_id: transactionId,
  };
  const label = purchaseLabel.trim();

  if (label) {
    return [
      'event',
      'conversion',
      {
        send_to: `${adsId}/${label}`,
        ...conversionPayload,
      },
    ];
  }

  const eventName = purchaseEventName.trim();

  return eventName ? ['event', eventName, conversionPayload] : null;
}
