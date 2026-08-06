import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const databaseEnvironmentNames = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'LOCAL_ORDER_STORE_DIR',
];

test('local order store persists fulfillment references and prioritizes paid orders', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'armoze-order-store-test-'));
  const previousEnvironment = Object.fromEntries(
    databaseEnvironmentNames.map((name) => [name, process.env[name]]),
  );

  try {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    process.env.LOCAL_ORDER_STORE_DIR = directory;

    const { createOrderStore } = await import(`./order-store.js?test=${Date.now()}`);
    const store = createOrderStore();
    await store.init();

    await store.upsertOrder({
      id: 'cs_test_unpaid',
      stripeSessionId: 'cs_test_unpaid',
      paymentStatus: 'checkout_started',
    });
    await store.upsertOrder({
      id: 'cs_test_paid',
      stripeSessionId: 'cs_test_paid',
      paymentStatus: 'paid',
    });
    const updated = await store.updateFulfillment('cs_test_paid', {
      fulfillmentStatus: 'printing',
      fulfillmentReference: 'GO-12345',
    });
    const listed = await store.listOrders({ limit: 2 });
    await store.createNotification({
      orderId: 'cs_test_paid',
      type: 'customer_confirmation_email',
      status: 'sent',
      title: 'Confirmation sent',
      body: 'Sent.',
    });

    assert.equal(updated.fulfillmentReference, 'GO-12345');
    assert.equal(listed.orders[0].id, 'cs_test_paid');
    assert.equal((await store.getOrder('cs_test_paid')).fulfillmentReference, 'GO-12345');
    assert.equal(
      await store.hasSentNotification('cs_test_paid', 'customer_confirmation_email'),
      true,
    );
    assert.equal(
      await store.hasSentNotification('cs_test_paid', 'customer_shipped_email'),
      false,
    );
  } finally {
    for (const name of databaseEnvironmentNames) {
      if (previousEnvironment[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousEnvironment[name];
      }
    }

    await rm(directory, { recursive: true, force: true });
  }
});
