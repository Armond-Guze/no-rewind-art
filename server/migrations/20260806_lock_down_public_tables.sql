-- Phase 1 immediately closes Supabase Data API access. It intentionally does
-- not FORCE RLS because the application connects directly as the table owner.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';
select pg_advisory_xact_lock(421042, 20260806);

do $database_security_preflight$
declare
  missing_tables text[];
  runtime_bypasses_rls boolean;
begin
  select array_agg(table_name order by table_name)
    into missing_tables
  from unnest(array[
    'orders',
    'newsletter_subscribers',
    'notifications',
    'products',
    'merchant_feed_snapshots'
  ]::text[]) as required(table_name)
  where to_regclass(format('public.%I', table_name)) is null;

  if missing_tables is not null then
    raise exception
      'Security migration aborted: missing required tables: %',
      array_to_string(missing_tables, ', ');
  end if;

  select coalesce(rolsuper or rolbypassrls, false)
    into runtime_bypasses_rls
  from pg_roles
  where rolname = current_user;

  if not runtime_bypasses_rls and exists (
    select 1
    from pg_class target_table
    join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
    where target_schema.nspname = 'public'
      and target_table.relname = any(array[
        'orders',
        'newsletter_subscribers',
        'notifications',
        'products',
        'merchant_feed_snapshots'
      ])
      and target_table.relkind in ('r', 'p')
      and not pg_has_role(
        current_user,
        pg_get_userbyid(target_table.relowner),
        'USAGE'
      )
  ) then
    raise exception
      'Security migration aborted: runtime role % neither owns/inherits all target tables nor BYPASSRLS.',
      current_user;
  end if;
end
$database_security_preflight$;

revoke all privileges on table
  public.orders,
  public.newsletter_subscribers,
  public.notifications,
  public.products,
  public.merchant_feed_snapshots
from public, anon, authenticated;

alter table public.orders enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.notifications enable row level security;
alter table public.products enable row level security;
alter table public.merchant_feed_snapshots enable row level security;

drop policy if exists armoze_deny_data_api on public.orders;
create policy armoze_deny_data_api
  on public.orders as restrictive for all to anon, authenticated
  using (false) with check (false);

drop policy if exists armoze_deny_data_api on public.newsletter_subscribers;
create policy armoze_deny_data_api
  on public.newsletter_subscribers as restrictive for all to anon, authenticated
  using (false) with check (false);

drop policy if exists armoze_deny_data_api on public.notifications;
create policy armoze_deny_data_api
  on public.notifications as restrictive for all to anon, authenticated
  using (false) with check (false);

drop policy if exists armoze_deny_data_api on public.products;
create policy armoze_deny_data_api
  on public.products as restrictive for all to anon, authenticated
  using (false) with check (false);

drop policy if exists armoze_deny_data_api on public.merchant_feed_snapshots;
create policy armoze_deny_data_api
  on public.merchant_feed_snapshots as restrictive for all to anon, authenticated
  using (false) with check (false);

commit;

-- Phase 2 prevents the same exposure on future objects. It is separate so an
-- owner/default-privilege problem cannot roll back the urgent table lockout.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';
select pg_advisory_xact_lock(421042, 20260806);

do $database_default_security$
declare
  creator_role name;
begin
  for creator_role in
    select role_name
    from (
      select distinct pg_get_userbyid(target_table.relowner)::name as role_name
      from pg_class target_table
      join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
      where target_schema.nspname = 'public'
        and target_table.relname = any(array[
          'orders',
          'newsletter_subscribers',
          'notifications',
          'products',
          'merchant_feed_snapshots'
        ])
        and target_table.relkind in ('r', 'p')

      union

      select current_user::name
    ) roles
  loop
    execute format('grant usage, create on schema public to %I', creator_role);
    execute format(
      'alter default privileges for role %I in schema public revoke all privileges on tables from public, anon, authenticated',
      creator_role
    );
    execute format(
      'alter default privileges for role %I in schema public revoke all privileges on sequences from public, anon, authenticated',
      creator_role
    );
    execute format(
      'alter default privileges for role %I in schema public revoke all privileges on functions from public, anon, authenticated',
      creator_role
    );
    execute format(
      'alter default privileges for role %I in schema public revoke all privileges on types from public, anon, authenticated',
      creator_role
    );
  end loop;
end
$database_default_security$;

revoke create on schema public from public, anon, authenticated;

commit;
