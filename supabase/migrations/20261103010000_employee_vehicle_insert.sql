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
            and member.role = 'EMPLOYEE'
        )
      )
      or (
        entity_type = 'audit_logs'
        and public.can_insert_audit_log(company_id, payload)
      )
    )
  );
