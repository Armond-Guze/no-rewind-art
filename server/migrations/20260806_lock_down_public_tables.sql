-- Server-only storefront data must not be readable or writable through the
-- Supabase Data API. The application connects directly to PostgreSQL.

begin;

select pg_advisory_xact_lock(421042, 20260806);

alter table if exists public.orders enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.newsletter_subscribers enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.merchant_feed_snapshots enable row level security;

revoke all privileges on table public.orders from public;
revoke all privileges on table public.notifications from public;
revoke all privileges on table public.newsletter_subscribers from public;
revoke all privileges on table public.products from public;
revoke all privileges on table public.merchant_feed_snapshots from public;

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
        'newsletter_subscribers',
        'products',
        'merchant_feed_snapshots'
      ] loop
        execute format(
          'revoke all privileges on table public.%I from %I',
          table_name,
          role_name
        );
      end loop;
    end if;
  end loop;
end
$database_security$;

-- Supabase commonly grants Data API roles access to new public objects through
-- default privileges. These statements affect only objects created by the role
-- that runs this migration.
alter default privileges in schema public revoke all on tables from public;
alter default privileges in schema public revoke all on sequences from public;
alter default privileges in schema public revoke execute on functions from public;

do $database_default_security$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if to_regrole(role_name) is not null then
      execute format(
        'alter default privileges in schema public revoke all on tables from %I',
        role_name
      );
      execute format(
        'alter default privileges in schema public revoke all on sequences from %I',
        role_name
      );
      execute format(
        'alter default privileges in schema public revoke execute on functions from %I',
        role_name
      );
    end if;
  end loop;
end
$database_default_security$;

commit;
