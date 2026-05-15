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

create index if not exists orders_updated_at_idx on orders (updated_at desc);
create index if not exists orders_payment_status_idx on orders (payment_status);
create index if not exists notifications_created_at_idx on notifications (created_at desc);

create table if not exists products (
  id text primary key,
  slug text unique not null,
  published boolean not null default true,
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_published_idx on products (published);
create index if not exists products_sort_order_idx on products (sort_order);
