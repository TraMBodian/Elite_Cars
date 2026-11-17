-- Active la diffusion temps réel (postgres_changes) pour business_records.
-- Sans cela, Supabase Realtime n'émet aucun évènement pour cette table.
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
end $$;

-- Nécessaire pour que les évènements DELETE/UPDATE portent company_id (filtre realtime).
alter table public.business_records replica identity full;
