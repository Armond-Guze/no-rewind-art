import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertManualOrderEmailAllowed,
  getCustomerEmailStatus,
  parseManualOrderEmailRequest,
} from './order-email-policy.js';

const paidOrder = {
  paymentStatus: 'paid',
  fulfillmentStatus: 'new',
  customerEmail: 'customer@example.com',
  trackingNumber: '',
  trackingUrl: '',
  raw: {},
};

test('customer transactional emails are automatic only after an explicit true flag', () => {
  assert.deepEqual(getCustomerEmailStatus({}), {
    customerEmailsConfigured: false,
    customerEmailsAutomatic: false,
    ownerAlertsConfigured: false,
  });
  assert.deepEqual(
    getCustomerEmailStatus({
      RESEND_API_KEY: 're_test',
      ORDER_NOTIFICATION_EMAIL: 'owner@example.com',
      CUSTOMER_EMAILS_AUTOMATIC: 'true',
    }),
    {
      customerEmailsConfigured: true,
      customerEmailsAutomatic: true,
      ownerAlertsConfigured: true,
    },
  );
  assert.equal(
    getCustomerEmailStatus({ CUSTOMER_EMAILS_AUTOMATIC: 'TRUE' }).customerEmailsAutomatic,
    false,
  );
});

test('normalizes the authenticated manual-send payload', () => {
  assert.deepEqual(parseManualOrderEmailRequest({ emailType: 'confirmation' }), {
    emailType: 'confirmation',
    resend: false,
  });
  assert.deepEqual(parseManualOrderEmailRequest({ emailType: 'shipping', resend: true }), {
    emailType: 'shipping',
    resend: true,
  });
  assert.deepEqual(parseManualOrderEmailRequest({ emailType: 'delivered' }), {
    emailType: 'delivered',
    resend: false,
  });
  assert.throws(
    () => parseManualOrderEmailRequest({ emailType: 'abandoned' }),
    (error) => error.status === 400 && /confirmation, shipping, or delivered/.test(error.message),
  );
  assert.throws(
    () => parseManualOrderEmailRequest({ emailType: 'confirmation', resend: 'yes' }),
    (error) => error.status === 400 && /resend/.test(error.message),
  );
});

test('manual shipping email requires paid, shipped, tracked orders', () => {
  assert.throws(
    () =>
      assertManualOrderEmailAllowed(
        { ...paidOrder, fulfillmentStatus: 'shipped' },
        { emailType: 'shipping' },
      ),
    (error) => error.status === 409 && /tracking/.test(error.message),
  );
  assert.throws(
    () =>
      assertManualOrderEmailAllowed(
        { ...paidOrder, trackingNumber: 'TRACK-1' },
        { emailType: 'shipping' },
      ),
    (error) => error.status === 409 && /Mark the order shipped/.test(error.message),
  );

  assert.deepEqual(
    assertManualOrderEmailAllowed(
      {
        ...paidOrder,
        fulfillmentStatus: 'shipped',
        trackingNumber: 'TRACK-1',
      },
      { emailType: 'shipping' },
    ),
    {
      flagName: 'shippedEmailSentAt',
      notificationType: 'customer_shipped_email',
    },
  );
});

test('manual delivered email requires a delivered order', () => {
  assert.throws(
    () =>
      assertManualOrderEmailAllowed(
        { ...paidOrder, fulfillmentStatus: 'shipped' },
        { emailType: 'delivered' },
      ),
    (error) => error.status === 409 && /Mark the order delivered/.test(error.message),
  );

  assert.deepEqual(
    assertManualOrderEmailAllowed(
      { ...paidOrder, fulfillmentStatus: 'delivered' },
      { emailType: 'delivered' },
    ),
    {
      flagName: 'deliveredEmailSentAt',
      notificationType: 'customer_delivered_email',
    },
  );
});

test('manual sends reject duplicates unless resend is deliberately true', () => {
  assert.throws(
    () =>
      assertManualOrderEmailAllowed(
        { ...paidOrder, raw: { confirmationEmailSentAt: '2026-08-06T12:00:00Z' } },
        { emailType: 'confirmation' },
      ),
    (error) => error.status === 409 && /resend to true/.test(error.message),
  );
  assert.throws(
    () =>
      assertManualOrderEmailAllowed(paidOrder, {
        emailType: 'confirmation',
        hasSentNotification: true,
      }),
    (error) => error.status === 409 && /already sent/.test(error.message),
  );

  assert.doesNotThrow(() =>
    assertManualOrderEmailAllowed(
      { ...paidOrder, raw: { confirmationEmailSentAt: '2026-08-06T12:00:00Z' } },
      { emailType: 'confirmation', resend: true, hasSentNotification: true },
    ),
  );
});

test('manual confirmation rejects unpaid orders and orders without an email', () => {
  assert.throws(
    () =>
      assertManualOrderEmailAllowed(
        { ...paidOrder, paymentStatus: 'checkout_started' },
        { emailType: 'confirmation' },
      ),
    (error) => error.status === 409 && /paid orders/.test(error.message),
  );
  assert.throws(
    () =>
      assertManualOrderEmailAllowed(
        { ...paidOrder, customerEmail: '' },
        { emailType: 'confirmation' },
      ),
    (error) => error.status === 409 && /customer email/.test(error.message),
  );
});
