import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const dataDir =
  process.env.LOCAL_ORDER_STORE_DIR ||
  (process.env.VERCEL ? path.join(os.tmpdir(), 'armoze-orders') : path.join(os.homedir(), '.armoze', 'orders'));
const ordersFile = path.join(dataDir, 'orders.json');

const emptyDatabase = {
  orders: [],
  notifications: [],
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '';
}

function normalizeDatabaseUrl(databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    parsedUrl.searchParams.delete('sslcert');
    parsedUrl.searchParams.delete('sslkey');
    parsedUrl.searchParams.delete('sslmode');
    parsedUrl.searchParams.delete('sslrootcert');

    return parsedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeOrder(order) {
  const timestamp = nowIso();

  return {
    id: order.id || order.stripeSessionId,
    stripeSessionId: order.stripeSessionId || order.id,
    paymentIntentId: order.paymentIntentId || null,
    checkoutStatus: order.checkoutStatus || 'open',
    paymentStatus: order.paymentStatus || 'checkout_started',
    fulfillmentStatus: order.fulfillmentStatus || 'new',
    customerName: order.customerName || '',
    customerEmail: order.customerEmail || '',
    currency: order.currency || 'usd',
    amountSubtotal: Number(order.amountSubtotal || 0),
    amountShipping: Number(order.amountShipping || 0),
    amountTax: Number(order.amountTax || 0),
    amountTotal: Number(order.amountTotal || 0),
    items: Array.isArray(order.items) ? order.items : [],
    raw: order.raw || {},
    ownerNotificationSentAt: order.ownerNotificationSentAt || null,
    createdAt: order.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

function mergeOrder(existing, nextOrder) {
  if (!existing) {
    return normalizeOrder(nextOrder);
  }

  return normalizeOrder({
    ...existing,
    ...nextOrder,
    items: nextOrder.items?.length ? nextOrder.items : existing.items,
    raw: {
      ...(existing.raw || {}),
      ...(nextOrder.raw || {}),
    },
    createdAt: existing.createdAt,
    ownerNotificationSentAt:
      nextOrder.ownerNotificationSentAt ?? existing.ownerNotificationSentAt,
  });
}

function summarizeOrders(orders) {
  const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
  const totalRevenue = paidOrders.reduce((total, order) => total + Number(order.amountTotal || 0), 0);
  const newOrders = paidOrders.filter((order) => order.fulfillmentStatus === 'new').length;
  const averageOrderValue = paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0;

  return {
    orderCount: orders.length,
    paidOrderCount: paidOrders.length,
    newOrderCount: newOrders,
    totalRevenue,
    averageOrderValue,
  };
}

async function readLocalDatabase() {
  try {
    const raw = await readFile(ordersFile, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...emptyDatabase,
      ...parsed,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ...emptyDatabase };
    }

    throw error;
  }
}

async function writeLocalDatabase(database) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(ordersFile, `${JSON.stringify(database, null, 2)}\n`);
}

class LocalOrderStore {
  type = 'local-json';

  async init() {
    await writeLocalDatabase(await readLocalDatabase());
  }

  async getOrder(orderId) {
    const database = await readLocalDatabase();
    return database.orders.find(
      (order) => order.id === orderId || order.stripeSessionId === orderId,
    ) || null;
  }

  async upsertOrder(order) {
    const database = await readLocalDatabase();
    const existingIndex = database.orders.findIndex(
      (candidate) => candidate.id === order.id || candidate.stripeSessionId === order.stripeSessionId,
    );
    const existing = existingIndex >= 0 ? database.orders[existingIndex] : null;
    const merged = mergeOrder(existing, order);
    const wasNewlyPaid = existing?.paymentStatus !== 'paid' && merged.paymentStatus === 'paid';

    if (existingIndex >= 0) {
      database.orders[existingIndex] = merged;
    } else {
      database.orders.unshift(merged);
    }

    database.orders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    await writeLocalDatabase(database);

    return { order: merged, wasNewlyPaid };
  }

  async listOrders({ limit = 50 } = {}) {
    const database = await readLocalDatabase();
    const orders = [...database.orders]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);

    return {
      orders,
      summary: summarizeOrders(database.orders),
    };
  }

  async updateFulfillmentStatus(orderId, fulfillmentStatus) {
    const database = await readLocalDatabase();
    const existingIndex = database.orders.findIndex(
      (order) => order.id === orderId || order.stripeSessionId === orderId,
    );

    if (existingIndex < 0) {
      return null;
    }

    database.orders[existingIndex] = {
      ...database.orders[existingIndex],
      fulfillmentStatus,
      updatedAt: nowIso(),
    };
    await writeLocalDatabase(database);

    return database.orders[existingIndex];
  }

  async markOwnerNotificationSent(orderId) {
    const database = await readLocalDatabase();
    const existingIndex = database.orders.findIndex(
      (order) => order.id === orderId || order.stripeSessionId === orderId,
    );

    if (existingIndex < 0) {
      return null;
    }

    database.orders[existingIndex] = {
      ...database.orders[existingIndex],
      ownerNotificationSentAt: nowIso(),
      updatedAt: nowIso(),
    };
    await writeLocalDatabase(database);

    return database.orders[existingIndex];
  }

  async createNotification(notification) {
    const database = await readLocalDatabase();
    const nextNotification = {
      id: notification.id || makeId('ntf'),
      type: notification.type || 'order',
      orderId: notification.orderId || null,
      title: notification.title || '',
      body: notification.body || '',
      channel: notification.channel || 'system',
      status: notification.status || 'created',
      metadata: notification.metadata || {},
      createdAt: notification.createdAt || nowIso(),
    };

    database.notifications.unshift(nextNotification);
    database.notifications = database.notifications.slice(0, 200);
    await writeLocalDatabase(database);

    return nextNotification;
  }

  async listNotifications({ limit = 20 } = {}) {
    const database = await readLocalDatabase();
    return database.notifications.slice(0, limit);
  }
}

class PostgresOrderStore {
  type = 'postgres';

  constructor(databaseUrl) {
    const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };

    this.pool = new Pool({
      connectionString: normalizeDatabaseUrl(databaseUrl),
      ssl,
    });
  }

  async init() {
    const client = await this.pool.connect();

    try {
      await client.query('select pg_advisory_lock(421042, 20260513)');

      await client.query(`
        create table if not exists orders (
          id text primary key,
          stripe_session_id text unique not null,
          payment_intent_id text,
          checkout_status text not null default 'open',
          payment_status text not null default 'checkout_started',
          fulfillment_status text not null default 'new',
          customer_name text,
          customer_email text,
          currency text not null default 'usd',
          amount_subtotal integer not null default 0,
          amount_shipping integer not null default 0,
          amount_tax integer not null default 0,
          amount_total integer not null default 0,
          items jsonb not null default '[]'::jsonb,
          raw jsonb not null default '{}'::jsonb,
          owner_notification_sent_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);

      await client.query(`
        create table if not exists notifications (
          id text primary key,
          type text not null,
          order_id text,
          title text not null,
          body text not null,
          channel text not null,
          status text not null,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        );
      `);
    } finally {
      await client.query('select pg_advisory_unlock(421042, 20260513)').catch(() => {});
      client.release();
    }
  }

  rowToOrder(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      stripeSessionId: row.stripe_session_id,
      paymentIntentId: row.payment_intent_id,
      checkoutStatus: row.checkout_status,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
      customerName: row.customer_name || '',
      customerEmail: row.customer_email || '',
      currency: row.currency,
      amountSubtotal: row.amount_subtotal,
      amountShipping: row.amount_shipping,
      amountTax: row.amount_tax,
      amountTotal: row.amount_total,
      items: row.items || [],
      raw: row.raw || {},
      ownerNotificationSentAt: row.owner_notification_sent_at?.toISOString?.() || row.owner_notification_sent_at || null,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    };
  }

  notificationRowToObject(row) {
    return {
      id: row.id,
      type: row.type,
      orderId: row.order_id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      status: row.status,
      metadata: row.metadata || {},
      createdAt: row.created_at?.toISOString?.() || row.created_at,
    };
  }

  async getOrder(orderId) {
    const result = await this.pool.query(
      'select * from orders where id = $1 or stripe_session_id = $1 limit 1',
      [orderId],
    );

    return this.rowToOrder(result.rows[0]);
  }

  async upsertOrder(order) {
    const existing = await this.getOrder(order.id || order.stripeSessionId);
    const merged = mergeOrder(existing, order);
    const wasNewlyPaid = existing?.paymentStatus !== 'paid' && merged.paymentStatus === 'paid';

    const result = await this.pool.query(
      `
        insert into orders (
          id,
          stripe_session_id,
          payment_intent_id,
          checkout_status,
          payment_status,
          fulfillment_status,
          customer_name,
          customer_email,
          currency,
          amount_subtotal,
          amount_shipping,
          amount_tax,
          amount_total,
          items,
          raw,
          owner_notification_sent_at,
          created_at,
          updated_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14::jsonb, $15::jsonb, $16, $17, $18
        )
        on conflict (id) do update set
          stripe_session_id = excluded.stripe_session_id,
          payment_intent_id = excluded.payment_intent_id,
          checkout_status = excluded.checkout_status,
          payment_status = excluded.payment_status,
          fulfillment_status = excluded.fulfillment_status,
          customer_name = excluded.customer_name,
          customer_email = excluded.customer_email,
          currency = excluded.currency,
          amount_subtotal = excluded.amount_subtotal,
          amount_shipping = excluded.amount_shipping,
          amount_tax = excluded.amount_tax,
          amount_total = excluded.amount_total,
          items = excluded.items,
          raw = excluded.raw,
          owner_notification_sent_at = excluded.owner_notification_sent_at,
          updated_at = excluded.updated_at
        returning *
      `,
      [
        merged.id,
        merged.stripeSessionId,
        merged.paymentIntentId,
        merged.checkoutStatus,
        merged.paymentStatus,
        merged.fulfillmentStatus,
        merged.customerName,
        merged.customerEmail,
        merged.currency,
        merged.amountSubtotal,
        merged.amountShipping,
        merged.amountTax,
        merged.amountTotal,
        JSON.stringify(merged.items),
        JSON.stringify(merged.raw),
        merged.ownerNotificationSentAt,
        merged.createdAt,
        merged.updatedAt,
      ],
    );

    return { order: this.rowToOrder(result.rows[0]), wasNewlyPaid };
  }

  async listOrders({ limit = 50 } = {}) {
    const ordersResult = await this.pool.query(
      'select * from orders order by updated_at desc limit $1',
      [limit],
    );
    const summaryResult = await this.pool.query(`
      select
        count(*)::int as order_count,
        count(*) filter (where payment_status = 'paid')::int as paid_order_count,
        count(*) filter (where payment_status = 'paid' and fulfillment_status = 'new')::int as new_order_count,
        coalesce(sum(amount_total) filter (where payment_status = 'paid'), 0)::int as total_revenue
      from orders
    `);
    const row = summaryResult.rows[0];
    const paidOrderCount = Number(row.paid_order_count || 0);
    const totalRevenue = Number(row.total_revenue || 0);

    return {
      orders: ordersResult.rows.map((orderRow) => this.rowToOrder(orderRow)),
      summary: {
        orderCount: Number(row.order_count || 0),
        paidOrderCount,
        newOrderCount: Number(row.new_order_count || 0),
        totalRevenue,
        averageOrderValue: paidOrderCount ? Math.round(totalRevenue / paidOrderCount) : 0,
      },
    };
  }

  async updateFulfillmentStatus(orderId, fulfillmentStatus) {
    const result = await this.pool.query(
      `
        update orders
        set fulfillment_status = $2, updated_at = now()
        where id = $1 or stripe_session_id = $1
        returning *
      `,
      [orderId, fulfillmentStatus],
    );

    return this.rowToOrder(result.rows[0]);
  }

  async markOwnerNotificationSent(orderId) {
    const result = await this.pool.query(
      `
        update orders
        set owner_notification_sent_at = now(), updated_at = now()
        where id = $1 or stripe_session_id = $1
        returning *
      `,
      [orderId],
    );

    return this.rowToOrder(result.rows[0]);
  }

  async createNotification(notification) {
    const nextNotification = {
      id: notification.id || makeId('ntf'),
      type: notification.type || 'order',
      orderId: notification.orderId || null,
      title: notification.title || '',
      body: notification.body || '',
      channel: notification.channel || 'system',
      status: notification.status || 'created',
      metadata: notification.metadata || {},
      createdAt: notification.createdAt || nowIso(),
    };

    const result = await this.pool.query(
      `
        insert into notifications (
          id, type, order_id, title, body, channel, status, metadata, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        returning *
      `,
      [
        nextNotification.id,
        nextNotification.type,
        nextNotification.orderId,
        nextNotification.title,
        nextNotification.body,
        nextNotification.channel,
        nextNotification.status,
        JSON.stringify(nextNotification.metadata),
        nextNotification.createdAt,
      ],
    );

    return this.notificationRowToObject(result.rows[0]);
  }

  async listNotifications({ limit = 20 } = {}) {
    const result = await this.pool.query(
      'select * from notifications order by created_at desc limit $1',
      [limit],
    );

    return result.rows.map((row) => this.notificationRowToObject(row));
  }
}

export function createOrderStore() {
  const databaseUrl = getDatabaseUrl();

  if (databaseUrl) {
    return new PostgresOrderStore(databaseUrl);
  }

  return new LocalOrderStore();
}
