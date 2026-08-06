create table if not exists orders (
  id text primary key,
  stripe_session_id text unique not null,
  payment_intent_id text,
  checkout_status text not null default 'open',
  payment_status text not null default 'checkout_started',
  fulfillment_status text not null default 'new',
  fulfillment_reference text,
  customer_name text,
  customer_email text,
  currency text not null default 'usd',
  amount_subtotal integer not null default 0,
  amount_shipping integer not null default 0,
  amount_tax integer not null default 0,
  amount_total integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  carrier text,
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  owner_notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders
  add column if not exists fulfillment_reference text;

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
create index if not exists orders_customer_email_paid_idx
  on orders (lower(customer_email), created_at desc)
  where payment_status = 'paid';
create index if not exists notifications_created_at_idx on notifications (created_at desc);
create index if not exists notifications_order_type_status_idx
  on notifications (order_id, type, status);

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

create table if not exists newsletter_subscribers (
  id text primary key,
  email text unique not null,
  source text not null default 'footer',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_updated_at_idx
  on newsletter_subscribers (updated_at desc);

-- These tables are accessed only by the server's direct PostgreSQL connection.
-- Keep them inaccessible through the Supabase Data API.
alter table orders enable row level security;
alter table notifications enable row level security;
alter table products enable row level security;
alter table newsletter_subscribers enable row level security;

revoke all privileges on table orders from public;
revoke all privileges on table notifications from public;
revoke all privileges on table products from public;
revoke all privileges on table newsletter_subscribers from public;

do $database_security$
declare
  role_name text;
  table_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if to_regrole(role_name) is not null then
      foreach table_name in array array[
        'orders',
        'notifications',
        'products',
        'newsletter_subscribers'
      ] loop
        execute format(
          'revoke all privileges on table %I from %I',
          table_name,
          role_name
        );
      end loop;
    end if;
  end loop;
end
$database_security$;
