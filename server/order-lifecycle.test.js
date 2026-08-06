import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FREE_STANDARD_DELIVERY_ESTIMATE_BUSINESS_DAYS,
  compareAdminOrders,
  extractStripeShippingContact,
  hasUsableShippingAddress,
  mergeStripeShippingContacts,
  shouldBackfillStripeShippingContact,
} from './order-lifecycle.js';

test('free standard checkout delivery reflects production plus transit time', () => {
  assert.deepEqual(FREE_STANDARD_DELIVERY_ESTIMATE_BUSINESS_DAYS, {
    minimum: 8,
    maximum: 14,
  });
});

test('normalizes shipping contact across current, legacy, and customer Stripe fields', () => {
  const contact = extractStripeShippingContact({
    customer_email: 'fallback@example.com',
    collected_information: {
      shipping_details: {
        name: '  Shipping Name  ',
        address: {
          line1: '  123 Main St  ',
          city: ' Brooklyn ',
          postal_code: ' 11201 ',
          country: 'us',
        },
      },
    },
    shipping_details: {
      phone: ' +1 212 555 0100 ',
      address: {
        line2: ' Apt 4B ',
      },
    },
    customer_details: {
      email: ' Customer@Example.com ',
      address: {
        state: ' NY ',
      },
    },
  });

  assert.deepEqual(contact, {
    name: 'Shipping Name',
    email: 'customer@example.com',
    phone: '+1 212 555 0100',
    address: {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'Brooklyn',
      state: 'NY',
      postalCode: '11201',
      country: 'US',
    },
  });
  assert.equal(hasUsableShippingAddress(contact), true);
});

test('falls back to legacy shipping details and then customer details', () => {
  const legacyContact = extractStripeShippingContact({
    shipping_details: {
      name: 'Legacy Recipient',
      phone: '555-0101',
      address: {
        line1: '8 Legacy Lane',
        city: 'Austin',
        state: 'TX',
        postal_code: '78701',
        country: 'US',
      },
    },
  });
  const customerContact = extractStripeShippingContact({
    customer_email: 'guest@example.com',
    customer_details: {
      name: 'Customer Recipient',
      phone: '555-0102',
      address: {
        line1: '9 Customer Court',
        city: 'Miami',
        state: 'FL',
        postal_code: '33101',
        country: 'US',
      },
    },
  });

  assert.equal(legacyContact.name, 'Legacy Recipient');
  assert.equal(legacyContact.address.line1, '8 Legacy Lane');
  assert.equal(customerContact.email, 'guest@example.com');
  assert.equal(customerContact.address.line1, '9 Customer Court');
});

test('merges a newer partial Stripe contact without discarding stored address fields', () => {
  const existing = {
    name: 'Original Name',
    email: 'original@example.com',
    phone: '555-0100',
    address: {
      line1: '1 Original Way',
      line2: '',
      city: 'Denver',
      state: 'CO',
      postalCode: '80202',
      country: 'US',
    },
  };
  const merged = mergeStripeShippingContacts(existing, {
    name: 'Updated Name',
    email: '',
    phone: '',
    address: {
      line2: 'Suite 3',
    },
  });

  assert.deepEqual(merged, {
    ...existing,
    name: 'Updated Name',
    address: {
      ...existing.address,
      line2: 'Suite 3',
    },
  });
});

test('backfills only paid orders that lack a usable address and have not been attempted', () => {
  const baseOrder = {
    stripeSessionId: 'cs_live_order',
    paymentStatus: 'paid',
    raw: { checkoutSession: {} },
  };

  assert.equal(shouldBackfillStripeShippingContact(baseOrder), true);
  assert.equal(
    shouldBackfillStripeShippingContact({ ...baseOrder, paymentStatus: 'expired' }),
    false,
  );
  assert.equal(
    shouldBackfillStripeShippingContact({
      ...baseOrder,
      raw: {
        checkoutSession: {
          shippingContactBackfillAttemptedAt: '2026-08-05T12:00:00.000Z',
        },
      },
    }),
    false,
  );
  assert.equal(
    shouldBackfillStripeShippingContact({
      ...baseOrder,
      raw: {
        checkoutSession: {
          shippingContact: {
            address: {
              line1: '1 Main St',
              city: 'Boston',
              postalCode: '02108',
              country: 'US',
            },
          },
        },
      },
    }),
    false,
  );
});

test('admin ordering puts every paid order ahead of newer unpaid drafts', () => {
  const orders = [
    { id: 'unpaid-newest', paymentStatus: 'checkout_started', updatedAt: '2026-08-05T14:00:00Z' },
    { id: 'paid-oldest', paymentStatus: 'paid', updatedAt: '2026-08-01T14:00:00Z' },
    { id: 'paid-newest', paymentStatus: 'paid', updatedAt: '2026-08-04T14:00:00Z' },
    { id: 'expired', paymentStatus: 'expired', updatedAt: '2026-08-03T14:00:00Z' },
  ];

  assert.deepEqual(orders.sort(compareAdminOrders).map((order) => order.id), [
    'paid-newest',
    'paid-oldest',
    'unpaid-newest',
    'expired',
  ]);
});
