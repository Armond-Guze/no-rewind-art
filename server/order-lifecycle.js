export const FREE_STANDARD_DELIVERY_ESTIMATE_BUSINESS_DAYS = Object.freeze({
  minimum: 8,
  maximum: 14,
});

function normalizeStripeText(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function firstStripeText(values, maxLength) {
  for (const value of values) {
    const normalized = normalizeStripeText(value, maxLength);

    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function normalizeStripeAddress(addresses) {
  const addressSources = addresses.filter((address) => address && typeof address === 'object');
  const getAddressValue = (key, maxLength = 200) =>
    firstStripeText(addressSources.map((address) => address[key]), maxLength);

  return {
    line1: getAddressValue('line1'),
    line2: getAddressValue('line2'),
    city: getAddressValue('city'),
    state: getAddressValue('state', 100),
    postalCode: getAddressValue('postal_code', 40),
    country: getAddressValue('country', 2).toUpperCase(),
  };
}

export function extractStripeShippingContact(session = {}) {
  const collectedShipping = session.collected_information?.shipping_details;
  const legacyShipping = session.shipping_details;
  const customerDetails = session.customer_details;
  const contactSources = [collectedShipping, legacyShipping, customerDetails].filter(
    (details) => details && typeof details === 'object',
  );
  const getContactValue = (key, maxLength = 200) =>
    firstStripeText(contactSources.map((details) => details[key]), maxLength);
  const address = normalizeStripeAddress(contactSources.map((details) => details.address));
  const email = firstStripeText(
    [...contactSources.map((details) => details.email), session.customer_email],
    320,
  ).toLowerCase();
  const contact = {
    name: getContactValue('name'),
    email,
    phone: getContactValue('phone', 80),
    address,
  };
  const hasContact =
    contact.name ||
    contact.email ||
    contact.phone ||
    Object.values(contact.address).some(Boolean);

  return hasContact ? contact : null;
}

export function mergeStripeShippingContacts(existingContact, nextContact) {
  if (!existingContact) {
    return nextContact || null;
  }

  if (!nextContact) {
    return existingContact;
  }

  return {
    name: nextContact.name || existingContact.name || '',
    email: nextContact.email || existingContact.email || '',
    phone: nextContact.phone || existingContact.phone || '',
    address: {
      line1: nextContact.address?.line1 || existingContact.address?.line1 || '',
      line2: nextContact.address?.line2 || existingContact.address?.line2 || '',
      city: nextContact.address?.city || existingContact.address?.city || '',
      state: nextContact.address?.state || existingContact.address?.state || '',
      postalCode: nextContact.address?.postalCode || existingContact.address?.postalCode || '',
      country: nextContact.address?.country || existingContact.address?.country || '',
    },
  };
}

export function hasUsableShippingAddress(contact) {
  return Boolean(
    contact?.address?.line1 &&
      contact?.address?.city &&
      contact?.address?.postalCode &&
      contact?.address?.country,
  );
}

export function shouldBackfillStripeShippingContact(order) {
  const checkoutSession = order?.raw?.checkoutSession;

  return Boolean(
    order?.paymentStatus === 'paid' &&
      order?.stripeSessionId &&
      !hasUsableShippingAddress(checkoutSession?.shippingContact) &&
      !checkoutSession?.shippingContactBackfillAttemptedAt,
  );
}

export function compareAdminOrders(left, right) {
  const leftPaid = left?.paymentStatus === 'paid' ? 1 : 0;
  const rightPaid = right?.paymentStatus === 'paid' ? 1 : 0;

  if (leftPaid !== rightPaid) {
    return rightPaid - leftPaid;
  }

  return new Date(right?.updatedAt || 0).getTime() - new Date(left?.updatedAt || 0).getTime();
}
