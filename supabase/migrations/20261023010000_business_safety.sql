create table if not exists public.document_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'receipt', 'expense', 'reservation')),
  prefix text not null,
  next_value integer not null default 0,
  primary key (company_id, document_type, prefix)
);

revoke all on public.document_counters from anon, authenticated;

create unique index if not exists business_records_invoice_number_unique
  on public.business_records (company_id, (payload ->> 'number'))
  where entity_type = 'invoices';

create unique index if not exists business_records_receipt_number_unique
  on public.business_records (company_id, (payload ->> 'receiptNumber'))
  where entity_type = 'payments';

create unique index if not exists business_records_expense_reference_unique
  on public.business_records (company_id, (payload ->> 'reference'))
  where entity_type = 'expenses';

create unique index if not exists business_records_reservation_reference_unique
  on public.business_records (company_id, (payload ->> 'reference'))
  where entity_type = 'reservations';

create or replace function public.can_access_company_record(
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
      when cm.role = 'ADMIN' then true
      when target_entity_type = 'settings' then true
      when target_entity_type = 'audit_logs' then false
      when cm.role = 'ACCOUNTANT' then target_entity_type in
        ('clients', 'invoices', 'payments', 'expenses')
      when cm.role in ('MANAGER', 'EMPLOYEE') then target_entity_type in
        ('clients', 'vehicles', 'reservations')
      else false
    end
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = (select auth.uid())
      and cm.active = true
  ), false);
$$;

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
        ('clients', 'reservations')
      else false
    end
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = (select auth.uid())
      and cm.active = true
  ), false);
$$;

create or replace function public.can_insert_audit_log(
  target_company_id uuid,
  log_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = (select auth.uid())
      and cm.active = true
      and log_payload ->> 'userId' = (select auth.uid())::text
      and log_payload ->> 'userRole' = cm.role
  );
$$;

revoke all on function public.can_access_company_record(uuid, text) from public, anon;
revoke all on function public.can_manage_company_record(uuid, text) from public, anon;
revoke all on function public.can_insert_audit_log(uuid, jsonb) from public, anon;
grant execute on function public.can_access_company_record(uuid, text) to authenticated;
grant execute on function public.can_manage_company_record(uuid, text) to authenticated;
grant execute on function public.can_insert_audit_log(uuid, jsonb) to authenticated;

drop policy if exists "Members can read company records" on public.business_records;
create policy "Members can read permitted company records"
  on public.business_records for select to authenticated
  using (public.can_access_company_record(company_id, entity_type));

drop policy if exists "Members can insert company records" on public.business_records;
drop policy if exists "Members can update company records" on public.business_records;

create policy "Members can insert permitted company records"
  on public.business_records for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and (
      public.can_manage_company_record(company_id, entity_type)
      or (
        entity_type = 'audit_logs'
        and public.can_insert_audit_log(company_id, payload)
      )
    )
  );

create policy "Members can update permitted company records"
  on public.business_records for update to authenticated
  using (public.can_manage_company_record(company_id, entity_type))
  with check (
    public.can_manage_company_record(company_id, entity_type)
    and updated_by = (select auth.uid())
  );

create or replace function public.next_document_number(
  target_company_id uuid,
  target_document_type text,
  target_prefix text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_role text;
  allocated_number integer;
begin
  select role into member_role
  from public.company_members
  where company_id = target_company_id
    and user_id = (select auth.uid())
    and active = true;

  if member_role is null then
    raise exception 'Utilisateur non autorisé pour cette entreprise' using errcode = '42501';
  end if;
  if target_document_type is null
     or target_document_type not in ('invoice', 'receipt', 'expense', 'reservation') then
    raise exception 'Type de document invalide';
  end if;
  if target_prefix is null or length(trim(target_prefix)) = 0 then
    raise exception 'Préfixe de document requis';
  end if;
  if target_document_type in ('invoice', 'receipt', 'expense')
     and member_role not in ('ADMIN', 'ACCOUNTANT') then
    raise exception 'Seuls les administrateurs et comptables peuvent numéroter les documents financiers'
      using errcode = '42501';
  end if;
  if target_document_type = 'reservation'
     and member_role not in ('ADMIN', 'MANAGER', 'EMPLOYEE') then
    raise exception 'Utilisateur non autorisé à créer une réservation' using errcode = '42501';
  end if;

  insert into public.document_counters (company_id, document_type, prefix, next_value)
  values (target_company_id, target_document_type, target_prefix, 1)
  on conflict (company_id, document_type, prefix)
  do update set next_value = public.document_counters.next_value + 1
  returning next_value into allocated_number;

  return target_prefix || lpad(allocated_number::text, 4, '0');
end;
$$;

create or replace function public.save_invoice_record(
  target_company_id uuid,
  invoice_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  member_role text;
  invoice_id text := invoice_payload ->> 'id';
  prior_row public.business_records%rowtype;
  prior_invoice jsonb;
  prior_paid numeric;
begin
  select role into member_role
  from public.company_members
  where company_id = target_company_id
    and user_id = actor_id
    and active = true;

  if member_role is null or member_role not in ('ADMIN', 'ACCOUNTANT') then
    raise exception 'Seuls les administrateurs et comptables peuvent gérer les factures'
      using errcode = '42501';
  end if;
  if invoice_id is null or coalesce(invoice_payload ->> 'number', '') = '' then
    raise exception 'Identifiant ou numéro de facture manquant';
  end if;
  if coalesce(invoice_payload ->> 'status', '') not in (
    'BROUILLON', 'EMISE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'EN_RETARD', 'ANNULEE'
  ) then
    raise exception 'Statut de facture invalide';
  end if;
  if coalesce((invoice_payload ->> 'totalTTC')::numeric, -1) < 0
     or coalesce((invoice_payload ->> 'remainingAmount')::numeric, -1) < 0
     or coalesce((invoice_payload ->> 'paidAmount')::numeric, -1) < 0 then
    raise exception 'Montants de facture invalides';
  end if;
  if (invoice_payload ->> 'paidAmount')::numeric
     + (invoice_payload ->> 'remainingAmount')::numeric
     <> (invoice_payload ->> 'totalTTC')::numeric then
    raise exception 'Le paiement et le solde ne correspondent pas au total TTC';
  end if;
  if coalesce((invoice_payload ->> 'paidAmount')::numeric, 0)
       > (invoice_payload ->> 'totalTTC')::numeric
     or (invoice_payload ->> 'status' = 'PAYEE'
       and (invoice_payload ->> 'remainingAmount')::numeric <> 0)
     or (coalesce((invoice_payload ->> 'paidAmount')::numeric, 0) = 0
       and invoice_payload ->> 'status' in ('PAYEE', 'PARTIELLEMENT_PAYEE'))
     or (coalesce((invoice_payload ->> 'paidAmount')::numeric, 0) > 0
       and invoice_payload ->> 'status' in ('BROUILLON', 'EMISE')) then
    raise exception 'Le statut de la facture ne correspond pas à son solde';
  end if;
  if invoice_payload ->> 'status' = 'ANNULEE'
     and length(trim(coalesce(invoice_payload ->> 'cancellationReason', ''))) = 0 then
    raise exception 'Un motif est requis pour annuler une facture';
  end if;

  select * into prior_row
  from public.business_records
  where company_id = target_company_id
    and entity_type = 'invoices'
    and id = invoice_id
  for update;

  if found then
    prior_invoice := prior_row.payload;
    prior_paid := coalesce((prior_invoice ->> 'paidAmount')::numeric, 0);
    if prior_invoice ->> 'paidAmount' is distinct from invoice_payload ->> 'paidAmount'
       or prior_invoice ->> 'remainingAmount' is distinct from invoice_payload ->> 'remainingAmount' then
      raise exception 'Les montants réglés se modifient uniquement par un paiement ou une annulation de paiement';
    end if;
    if prior_paid > 0 and (
      (prior_invoice - array['status', 'updatedAt', 'notes', 'createdById', 'cancellationReason'])
        is distinct from
      (invoice_payload - array['status', 'updatedAt', 'notes', 'createdById', 'cancellationReason'])
      or invoice_payload ->> 'status' not in ('PAYEE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD', 'ANNULEE')
    ) then
      raise exception 'Une facture réglée ne peut pas être modifiée. Annulez-la avec un motif.';
    end if;
  elsif coalesce((invoice_payload ->> 'paidAmount')::numeric, 0) <> 0 then
    raise exception 'Une nouvelle facture ne peut pas contenir de paiement préalable';
  end if;

  insert into public.business_records (company_id, entity_type, id, payload, updated_by)
  values (
    target_company_id,
    'invoices',
    invoice_id,
    invoice_payload || jsonb_build_object('createdById', actor_id::text),
    actor_id
  )
  on conflict (company_id, entity_type, id)
  do update set
    payload = excluded.payload,
    updated_by = excluded.updated_by,
    updated_at = now();

  return invoice_payload;
end;
$$;

create or replace function public.record_invoice_payment(
  target_company_id uuid,
  payment_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  member_role text;
  payment_id text;
  payment_number text;
  invoice_id text;
  invoice_row public.business_records%rowtype;
  payment_row public.business_records%rowtype;
  invoice_payload jsonb;
  saved_payment jsonb;
  payment_amount numeric;
  paid_amount numeric;
  total_amount numeric;
  remaining_amount numeric;
  due_date text;
begin
  select role into member_role
  from public.company_members
  where company_id = target_company_id
    and user_id = actor_id
    and active = true;

  if member_role is null or member_role not in ('ADMIN', 'ACCOUNTANT') then
    raise exception 'Seuls les administrateurs et comptables peuvent enregistrer un paiement'
      using errcode = '42501';
  end if;

  payment_id := payment_payload ->> 'id';
  payment_number := payment_payload ->> 'receiptNumber';
  invoice_id := nullif(payment_payload ->> 'invoiceId', '');
  payment_amount := (payment_payload ->> 'amount')::numeric;

  if payment_id is null or payment_number is null or payment_amount is null or payment_amount <= 0 then
    raise exception 'Informations de paiement invalides';
  end if;

  if invoice_id is not null then
    select * into invoice_row
    from public.business_records
    where company_id = target_company_id
      and entity_type = 'invoices'
      and id = invoice_id
    for update;

    if not found or invoice_row.payload ->> 'status' in ('ANNULEE', 'BROUILLON')
       or coalesce(invoice_row.payload ->> 'deletedAt', '') <> '' then
      raise exception 'Facture introuvable, en brouillon ou annulée';
    end if;
    if invoice_row.payload ->> 'clientId' is distinct from payment_payload ->> 'clientId' then
      raise exception 'Le client du paiement ne correspond pas à celui de la facture';
    end if;

    invoice_payload := invoice_row.payload;
    paid_amount := coalesce((invoice_payload ->> 'paidAmount')::numeric, 0);
    total_amount := (invoice_payload ->> 'totalTTC')::numeric;
    remaining_amount := total_amount - paid_amount;
    if payment_amount > remaining_amount then
      raise exception 'Le paiement dépasse le solde restant (%).', remaining_amount;
    end if;

    paid_amount := paid_amount + payment_amount;
    remaining_amount := total_amount - paid_amount;
    due_date := invoice_payload ->> 'dueDate';
    invoice_payload := jsonb_set(invoice_payload, '{paidAmount}', to_jsonb(paid_amount), true);
    invoice_payload := jsonb_set(invoice_payload, '{remainingAmount}', to_jsonb(remaining_amount), true);
    invoice_payload := jsonb_set(
      invoice_payload,
      '{status}',
      to_jsonb(case
        when remaining_amount = 0 then 'PAYEE'
        when due_date < current_date::text then 'EN_RETARD'
        else 'PARTIELLEMENT_PAYEE'
      end),
      true
    );
    invoice_payload := jsonb_set(invoice_payload, '{updatedAt}', to_jsonb(now()::text), true);
  end if;

  saved_payment := payment_payload
    || jsonb_build_object('recordedById', actor_id::text, 'deletedAt', null);

  insert into public.business_records (company_id, entity_type, id, payload, updated_by)
  values (target_company_id, 'payments', payment_id, saved_payment, actor_id);

  if invoice_id is not null then
    update public.business_records
    set payload = invoice_payload, updated_by = actor_id, updated_at = now()
    where company_id = target_company_id
      and entity_type = 'invoices'
      and id = invoice_id;
  end if;

  return jsonb_build_object('payment', saved_payment, 'invoice', invoice_payload);
end;
$$;

create or replace function public.void_invoice_payment(
  target_company_id uuid,
  target_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  member_role text;
  payment_row public.business_records%rowtype;
  invoice_row public.business_records%rowtype;
  saved_payment jsonb;
  invoice_payload jsonb;
  invoice_id text;
  payment_amount numeric;
  paid_amount numeric;
  total_amount numeric;
  remaining_amount numeric;
  due_date text;
begin
  select role into member_role
  from public.company_members
  where company_id = target_company_id
    and user_id = actor_id
    and active = true;
  if member_role is null or member_role not in ('ADMIN', 'ACCOUNTANT') then
    raise exception 'Seuls les administrateurs et comptables peuvent annuler un paiement'
      using errcode = '42501';
  end if;

  select * into payment_row
  from public.business_records
  where company_id = target_company_id
    and entity_type = 'payments'
    and id = target_payment_id
  for update;

  if not found then raise exception 'Paiement introuvable'; end if;
  if coalesce(payment_row.payload ->> 'deletedAt', '') <> '' then
    return jsonb_build_object('payment', payment_row.payload);
  end if;

  invoice_id := nullif(payment_row.payload ->> 'invoiceId', '');
  payment_amount := (payment_row.payload ->> 'amount')::numeric;
  saved_payment := jsonb_set(payment_row.payload, '{deletedAt}', to_jsonb(now()::text), true);

  if invoice_id is not null then
    select * into invoice_row
    from public.business_records
    where company_id = target_company_id
      and entity_type = 'invoices'
      and id = invoice_id
    for update;
    if not found then raise exception 'Facture liée introuvable'; end if;

    invoice_payload := invoice_row.payload;
    paid_amount := greatest(0, coalesce((invoice_payload ->> 'paidAmount')::numeric, 0) - payment_amount);
    total_amount := (invoice_payload ->> 'totalTTC')::numeric;
    remaining_amount := total_amount - paid_amount;
    due_date := invoice_payload ->> 'dueDate';

    invoice_payload := jsonb_set(invoice_payload, '{paidAmount}', to_jsonb(paid_amount), true);
    invoice_payload := jsonb_set(invoice_payload, '{remainingAmount}', to_jsonb(remaining_amount), true);
    invoice_payload := jsonb_set(
      invoice_payload,
      '{status}',
      to_jsonb(case
        when invoice_payload ->> 'status' = 'ANNULEE' then 'ANNULEE'
        when remaining_amount = 0 then 'PAYEE'
        when due_date < current_date::text then 'EN_RETARD'
        when paid_amount = 0 then 'EMISE'
        else 'PARTIELLEMENT_PAYEE'
      end),
      true
    );
    invoice_payload := jsonb_set(invoice_payload, '{updatedAt}', to_jsonb(now()::text), true);

    update public.business_records
    set payload = invoice_payload, updated_by = actor_id, updated_at = now()
    where company_id = target_company_id and entity_type = 'invoices' and id = invoice_id;
  end if;

  update public.business_records
  set payload = saved_payment, updated_by = actor_id, updated_at = now()
  where company_id = target_company_id and entity_type = 'payments' and id = target_payment_id;

  return jsonb_build_object('payment', saved_payment, 'invoice', invoice_payload);
end;
$$;

revoke all on function public.next_document_number(uuid, text, text) from public, anon;
revoke all on function public.save_invoice_record(uuid, jsonb) from public, anon;
revoke all on function public.record_invoice_payment(uuid, jsonb) from public, anon;
revoke all on function public.void_invoice_payment(uuid, text) from public, anon;
grant execute on function public.next_document_number(uuid, text, text) to authenticated;
grant execute on function public.save_invoice_record(uuid, jsonb) to authenticated;
grant execute on function public.record_invoice_payment(uuid, jsonb) to authenticated;
grant execute on function public.void_invoice_payment(uuid, text) to authenticated;
