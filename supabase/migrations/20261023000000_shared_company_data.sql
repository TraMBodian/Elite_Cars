create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.business_records (
  company_id uuid not null references public.companies(id) on delete cascade,
  entity_type text not null check (
    entity_type in ('settings', 'clients', 'vehicles', 'reservations', 'invoices', 'payments', 'expenses', 'audit_logs')
  ),
  id text not null,
  payload jsonb not null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (company_id, entity_type, id)
);

create index if not exists business_records_company_type_idx
  on public.business_records (company_id, entity_type);

create or replace function public.is_active_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = target_company_id
      and user_id = (select auth.uid())
      and active = true
  );
$$;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.business_records enable row level security;

revoke all on public.companies, public.company_members, public.business_records from anon, authenticated;
grant select on public.companies, public.company_members to authenticated;
grant select, insert, update on public.business_records to authenticated;

revoke all on function public.is_active_company_member(uuid) from public, anon;
grant execute on function public.is_active_company_member(uuid) to authenticated;

drop policy if exists "Members can read their company" on public.companies;
create policy "Members can read their company"
  on public.companies for select to authenticated
  using (public.is_active_company_member(id));

drop policy if exists "Members can read company membership" on public.company_members;
create policy "Members can read company membership"
  on public.company_members for select to authenticated
  using (public.is_active_company_member(company_id));

drop policy if exists "Members can read company records" on public.business_records;
create policy "Members can read company records"
  on public.business_records for select to authenticated
  using (public.is_active_company_member(company_id));

drop policy if exists "Members can insert company records" on public.business_records;
create policy "Members can insert company records"
  on public.business_records for insert to authenticated
  with check (
    public.is_active_company_member(company_id)
    and updated_by = (select auth.uid())
  );

drop policy if exists "Members can update company records" on public.business_records;
create policy "Members can update company records"
  on public.business_records for update to authenticated
  using (public.is_active_company_member(company_id))
  with check (
    public.is_active_company_member(company_id)
    and updated_by = (select auth.uid())
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'business_records'
  ) then
    alter publication supabase_realtime add table public.business_records;
  end if;
end;
$$;
