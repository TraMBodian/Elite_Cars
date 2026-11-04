create or replace function public.can_manage_company_record(
  target_company_id uuid,
  target_entity_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when target_entity_type in ('invoices', 'payments', 'audit_logs') then false
      when cm.role = 'ADMIN' then true
      when target_entity_type = 'settings' then false
      when cm.role = 'ACCOUNTANT' then target_entity_type in
        ('clients', 'expenses')
      when cm.role = 'MANAGER' then target_entity_type in
        ('clients', 'vehicles', 'reservations')
      when cm.role = 'EMPLOYEE' then target_entity_type in
        ('clients', 'vehicles', 'reservations')
      else false
    end
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = (select auth.uid())
      and cm.active = true
  ), false);
$$;

drop policy if exists "Members can insert permitted company records" on public.business_records;

create policy "Members can insert permitted company records"
  on public.business_records for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and (
      public.can_manage_company_record(company_id, entity_type)
      or (
        entity_type = 'vehicles'
        and exists (
          select 1
          from public.company_members as member
          where member.company_id = business_records.company_id
            and member.user_id = (select auth.uid())
            and member.active = true
            and member.role in ('MANAGER', 'EMPLOYEE')
        )
      )
      or (
        entity_type = 'audit_logs'
        and public.can_insert_audit_log(company_id, payload)
      )
    )
  );
