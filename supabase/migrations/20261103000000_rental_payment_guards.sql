-- Apply after 20261023010000_business_safety.sql.
-- Keep rental invoices and receipts within the reservation total, even for
-- concurrent requests or clients that bypass the frontend.
create or replace function public.guard_rental_business_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_id text;
  invoice_id text;
  payment_type text;
  payment_amount numeric;
  paid_so_far numeric;
  reservation_payload jsonb;
  invoice_payload jsonb;
begin
  if new.entity_type = 'invoices' then
    reservation_id := nullif(new.payload ->> 'reservationId', '');
    if reservation_id is null then
      return new;
    end if;

    select payload into reservation_payload
    from public.business_records
    where company_id = new.company_id
      and entity_type = 'reservations'
      and id = reservation_id
    for update;

    if not found then
      raise exception 'La réservation liée à cette facture est introuvable';
    end if;
    if exists (
      select 1
      from public.business_records
      where company_id = new.company_id
        and entity_type = 'invoices'
        and id <> new.id
        and payload ->> 'reservationId' = reservation_id
    ) then
      raise exception 'Cette réservation possède déjà une facture';
    end if;
    if exists (
      select 1
      from public.business_records as payment
      where payment.company_id = new.company_id
        and payment.entity_type = 'payments'
        and payment.payload ->> 'paymentType' = 'ENCAISSEMENT_DIRECT'
        and payment.payload ->> 'reservationId' = reservation_id
        and nullif(payment.payload ->> 'deletedAt', '') is null
    ) then
      raise exception 'Un encaissement direct existe déjà pour cette location';
    end if;

    return new;
  end if;

  if new.entity_type <> 'payments' or nullif(new.payload ->> 'deletedAt', '') is not null then
    return new;
  end if;

  payment_type := new.payload ->> 'paymentType';
  payment_amount := (new.payload ->> 'amount')::numeric;
  invoice_id := nullif(new.payload ->> 'invoiceId', '');
  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Le montant du paiement doit être supérieur à zéro';
  end if;

  if payment_type = 'FACTURE' then
    if invoice_id is null then
      raise exception 'Un règlement de facture doit être associé à une facture';
    end if;

    select payload into invoice_payload
    from public.business_records
    where company_id = new.company_id
      and entity_type = 'invoices'
      and id = invoice_id
    for update;

    if not found then
      raise exception 'Facture introuvable, en brouillon ou annulée';
    end if;
    if invoice_payload ->> 'status' in ('ANNULEE', 'BROUILLON')
       or nullif(invoice_payload ->> 'deletedAt', '') is not null then
      raise exception 'Facture introuvable, en brouillon ou annulée';
    end if;
    if invoice_payload ->> 'clientId' is distinct from new.payload ->> 'clientId' then
      raise exception 'Le client du paiement ne correspond pas à celui de la facture';
    end if;
    if payment_amount >
       (invoice_payload ->> 'totalTTC')::numeric
       - coalesce((invoice_payload ->> 'paidAmount')::numeric, 0) then
      raise exception 'Le paiement dépasse le solde restant de la facture';
    end if;

    reservation_id := coalesce(
      nullif(new.payload ->> 'reservationId', ''),
      nullif(invoice_payload ->> 'reservationId', '')
    );
    if nullif(new.payload ->> 'reservationId', '') is not null
       and nullif(invoice_payload ->> 'reservationId', '') is not null
       and new.payload ->> 'reservationId' <> invoice_payload ->> 'reservationId' then
      raise exception 'La réservation du paiement ne correspond pas à celle de la facture';
    end if;
  elsif payment_type = 'ENCAISSEMENT_DIRECT' then
    reservation_id := nullif(new.payload ->> 'reservationId', '');
    if reservation_id is null or invoice_id is not null then
      raise exception 'Un encaissement direct doit être associé à une réservation, sans facture';
    end if;
  else
    return new;
  end if;

  if reservation_id is null then
    return new;
  end if;

  select payload into reservation_payload
  from public.business_records
  where company_id = new.company_id
    and entity_type = 'reservations'
    and id = reservation_id
  for update;

  if not found then
    raise exception 'La réservation liée au paiement est introuvable ou supprimée';
  end if;
  if nullif(reservation_payload ->> 'deletedAt', '') is not null then
    raise exception 'La réservation liée au paiement est introuvable ou supprimée';
  end if;
  if payment_type = 'ENCAISSEMENT_DIRECT' and exists (
    select 1
    from public.business_records
    where company_id = new.company_id
      and entity_type = 'invoices'
      and payload ->> 'reservationId' = reservation_id
  ) then
    raise exception 'Cette location possède une facture. Enregistrez le paiement sur la facture';
  end if;
  if reservation_payload ->> 'clientId' is distinct from new.payload ->> 'clientId' then
    raise exception 'Le client du paiement ne correspond pas à celui de la réservation';
  end if;

  select coalesce(sum((payment.payload ->> 'amount')::numeric), 0)
    into paid_so_far
  from public.business_records as payment
  left join public.business_records as invoice
    on invoice.company_id = payment.company_id
    and invoice.entity_type = 'invoices'
    and invoice.id = nullif(payment.payload ->> 'invoiceId', '')
  where payment.company_id = new.company_id
    and payment.entity_type = 'payments'
    and payment.id <> new.id
    and nullif(payment.payload ->> 'deletedAt', '') is null
    and payment.payload ->> 'paymentType' in ('FACTURE', 'ENCAISSEMENT_DIRECT')
    and coalesce(
      nullif(payment.payload ->> 'reservationId', ''),
      nullif(invoice.payload ->> 'reservationId', '')
    ) = reservation_id;

  if paid_so_far + payment_amount >
     coalesce((reservation_payload ->> 'totalEstimatedAmount')::numeric, 0) then
    raise exception 'Le paiement dépasse le solde restant de la location';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_rental_business_record() from public, anon, authenticated;

drop trigger if exists guard_rental_business_record on public.business_records;
create trigger guard_rental_business_record
  before insert or update on public.business_records
  for each row
  execute function public.guard_rental_business_record();
