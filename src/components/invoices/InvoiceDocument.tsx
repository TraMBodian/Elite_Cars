import React from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, Download, X, CheckCircle, QrCode, FileText, Shield } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Invoice, Payment, Reservation } from '../../types';

export const DocumentPreviewModal: React.FC = () => {
  const { activePreviewDoc, closePreviewDoc, settings, clients, vehicles, invoices } = useApp();

  if (!activePreviewDoc) return null;

  const { type, data } = activePreviewDoc;

  const handlePrint = () => {
    window.print();
  };

  const client = clients.find(
    (c) =>
      c.id ===
      (type === 'INVOICE'
        ? (data as Invoice).clientId
        : type === 'RECEIPT'
        ? (data as Payment).clientId
        : (data as Reservation).clientId)
  );

  const vehicle =
    type === 'CONTRACT'
      ? vehicles.find((v) => v.id === (data as Reservation).vehicleId)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-sm">
              {type === 'INVOICE'
                ? `Visualisation Facture ${(data as Invoice).number}`
                : type === 'RECEIPT'
                ? `Reçu de Paiement ${(data as Payment).receiptNumber}`
                : `Contrat de Location ${(data as Reservation).reference}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer / Sauvegarder en PDF</span>
            </button>
            <button
              onClick={closePreviewDoc}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          <div
            id="printable-area"
            className="w-full max-w-[800px] bg-white p-8 sm:p-12 shadow-md border border-slate-200 text-slate-800 min-h-[1050px] flex flex-col justify-between"
          >
            {/* TYPE 1: FACTURE OFFICIELLE */}
            {type === 'INVOICE' && (
              <InvoiceContent invoice={data as Invoice} client={client} settings={settings} />
            )}

            {/* TYPE 2: REÇU DE PAIEMENT */}
            {type === 'RECEIPT' && (
              <ReceiptContent
                payment={data as Payment}
                client={client}
                settings={settings}
                invoices={invoices}
              />
            )}

            {/* TYPE 3: CONTRAT DE LOCATION */}
            {type === 'CONTRACT' && (
              <ContractContent
                reservation={data as Reservation}
                client={client}
                vehicle={vehicle}
                settings={settings}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component: Invoice Content
const InvoiceContent: React.FC<{ invoice: Invoice; client: any; settings: any }> = ({
  invoice,
  client,
  settings,
}) => {
  return (
    <div className="flex flex-col justify-between h-full space-y-8">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start border-b-2 border-blue-900 pb-6">
          <div>
            <div className="mb-2 inline-flex rounded bg-slate-900 p-2">
              <img src="/elite-cars-logo.webp" alt={settings.name} className="h-auto max-h-12 w-48 object-contain object-left" />
            </div>
            <h1 className="text-lg font-black text-blue-900 tracking-tight">{settings.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{settings.legalForm}</p>
            <div className="mt-3 text-xs text-slate-600 space-y-0.5">
              <p>{settings.address}, {settings.city} - {settings.country}</p>
              <p>Tél : {settings.phone}</p>
              <p>Email : {settings.email}</p>
              <p className="font-semibold text-slate-700">NINEA : {settings.ninea} | RC : {settings.rccm}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-blue-900 text-white font-bold text-sm tracking-widest uppercase rounded">
              FACTURE
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2">{invoice.number}</p>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p><span className="font-medium text-slate-500">Date d’émission :</span> {formatDate(invoice.issueDate)}</p>
              <p><span className="font-medium text-slate-500">Date d’échéance :</span> {formatDate(invoice.dueDate)}</p>
              <p>
                <span className="font-medium text-slate-500">Statut :</span>{' '}
                <span className="font-bold text-blue-800">{invoice.status}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Client Block */}
        <div className="grid grid-cols-2 gap-8 my-6">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Émetteur / Prestataire
            </p>
            <p className="text-sm font-bold text-slate-900">{settings.name}</p>
            <p className="text-xs text-slate-600">{settings.address}</p>
            <p className="text-xs text-slate-600">{[settings.city, settings.country].filter(Boolean).join(', ')}</p>
          </div>

          <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
              Facturé à (Client)
            </p>
            <p className="text-sm font-bold text-slate-900">{client?.fullName || 'Client Particulier'}</p>
            {client?.companyName && (
              <p className="text-xs font-semibold text-slate-700">Raison Sociale : {client.companyName}</p>
            )}
            {client?.taxNumber && (
              <p className="text-xs font-semibold text-slate-700">NINEA / N° Fiscal : {client.taxNumber}</p>
            )}
            <p className="text-xs text-slate-600">{client?.address}, {client?.city}</p>
            <p className="text-xs text-slate-600">Tél : {client?.phone} | {client?.email}</p>
          </div>
        </div>

        {/* Table of items */}
        <table className="w-full text-left border-collapse text-xs mt-6">
          <thead>
            <tr className="bg-slate-900 text-white font-semibold">
              <th className="py-2.5 px-3 rounded-l">Désignation</th>
              <th className="py-2.5 px-3 text-center">Qté</th>
              <th className="py-2.5 px-3 text-right">P.U. HT</th>
              <th className="py-2.5 px-3 text-center">TVA</th>
              <th className="py-2.5 px-3 text-right rounded-r">Total HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-b border-slate-200">
            {invoice.items.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="py-3 px-3 font-medium text-slate-900">
                  {it.description}
                  {it.discountPercent > 0 && (
                    <span className="block text-[10px] text-amber-600">
                      Remise accordée : {it.discountPercent}%
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-center font-medium">{it.quantity}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(it.unitPrice, settings)}</td>
                <td className="py-3 px-3 text-center text-slate-600">{it.taxRatePercent}%</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">
                  {formatCurrency(it.totalHT, settings)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Totals */}
        <div className="flex justify-end mt-6">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Sous-total HT :</span>
              <span className="font-semibold text-slate-900">{formatCurrency(invoice.subtotalHT, settings)}</span>
            </div>

            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Remise commerciale :</span>
                <span className="font-semibold">-{formatCurrency(invoice.totalDiscount, settings)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>TVA ({settings.defaultTaxRatePercent}%) :</span>
              <span className="font-semibold text-slate-900">{formatCurrency(invoice.totalTax, settings)}</span>
            </div>

            <div className="flex justify-between text-sm font-black text-blue-900 border-t-2 border-blue-900 pt-2">
              <span>TOTAL TTC :</span>
              <span>{formatCurrency(invoice.totalTTC, settings)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 border-t border-slate-200 pt-1">
              <span>Montant Déjà Réglé :</span>
              <span className="font-bold">{formatCurrency(invoice.paidAmount, settings)}</span>
            </div>

            <div className="flex justify-between text-sm font-black text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
              <span>RESTE À PAYER :</span>
              <span>{formatCurrency(invoice.remainingAmount, settings)}</span>
            </div>
          </div>
        </div>

        {/* Payment info & Bank details */}
        {(settings.bankName || settings.bankAccountIban || settings.bankAccountRib || settings.waveNumber || settings.orangeMoneyNumber) && (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 text-xs">
            {(settings.bankName || settings.bankAccountIban || settings.bankAccountRib) && (
              <div>
                <p className="font-bold text-slate-800 mb-1">Coordonnées Bancaires de Règlement :</p>
                {settings.bankName && <p className="text-slate-600"><span className="font-medium">Banque :</span> {settings.bankName}</p>}
                {settings.bankAccountIban && <p className="text-slate-600"><span className="font-medium">IBAN :</span> {settings.bankAccountIban}</p>}
                {settings.bankAccountRib && <p className="text-slate-600"><span className="font-medium">RIB :</span> {settings.bankAccountRib}</p>}
              </div>
            )}
            {(settings.waveNumber || settings.orangeMoneyNumber) && (
              <div>
                <p className="font-bold text-slate-800 mb-1">Règlements Mobiles Instantanés :</p>
                {settings.waveNumber && <p className="text-slate-600"><span className="font-medium">Wave :</span> {settings.waveNumber}</p>}
                {settings.orangeMoneyNumber && <p className="text-slate-600"><span className="font-medium">Orange Money :</span> {settings.orangeMoneyNumber}</p>}
                <p className="text-[11px] text-slate-500 mt-1 italic">Veuillez préciser le numéro de facture en référence.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer & Signature Stamp */}
      <div className="border-t border-slate-200 pt-6 mt-8">
        <div className="flex justify-between items-end">
          <div className="text-[10px] text-slate-500 max-w-sm">
            <p>{settings.footerNotice}</p>
            <p className="mt-1 font-semibold text-slate-600">Document émis par {settings.name}.</p>
          </div>

          <div className="text-center w-52 border border-dashed border-slate-300 rounded p-4 bg-slate-50/50">
            <p className="text-[11px] font-bold text-slate-700 uppercase">Cachet & Signature</p>
            <div className="h-14 flex items-center justify-center text-slate-400 text-xs italic">
              {settings.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component: Receipt Content
const ReceiptContent: React.FC<{ payment: Payment; client: any; settings: any; invoices: any[] }> = ({
  payment,
  client,
  settings,
  invoices,
}) => {
  const linkedInvoice = invoices.find((i) => i.id === payment.invoiceId);

  return (
    <div className="flex flex-col justify-between h-full space-y-8">
      <div>
        <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-6">
          <div>
            <div className="mb-2 inline-flex rounded bg-slate-900 p-2">
              <img src="/elite-cars-logo.webp" alt={settings.name} className="h-auto max-h-12 w-48 object-contain object-left" />
            </div>
            <h1 className="text-lg font-black text-emerald-800 tracking-tight">{settings.name}</h1>
            <p className="text-xs text-slate-500">{settings.legalForm}</p>
            <p className="text-xs text-slate-600 mt-1">{[settings.address, settings.city, settings.country].filter(Boolean).join(' - ')}</p>
            <p className="text-xs text-slate-600 font-medium">NINEA : {settings.ninea}</p>
          </div>

          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-emerald-700 text-white font-bold text-sm tracking-widest uppercase rounded">
              REÇU DE PAIEMENT
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2">{payment.receiptNumber}</p>
            <p className="text-xs text-slate-600 mt-1">Date d’encaissement : {formatDate(payment.date)}</p>
          </div>
        </div>

        <div className="my-8 p-6 bg-emerald-50/50 rounded-xl border border-emerald-200">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Reçu de :</p>
              <p className="font-bold text-slate-900 text-base">{client?.fullName || 'Client Particulier'}</p>
              {client?.companyName && <p className="text-xs text-slate-600">{client.companyName}</p>}
              <p className="text-xs text-slate-600">Tél : {client?.phone}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Mode de versement :</p>
              <p className="font-bold text-slate-900">{payment.paymentMethod}</p>
              {payment.referenceNumber && (
                <p className="text-xs text-slate-600">Réf. transaction : {payment.referenceNumber}</p>
              )}
              <p className="text-xs text-slate-600 font-medium mt-1">Type : {payment.paymentType}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-emerald-200 flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-slate-600">
                {linkedInvoice
                  ? `Règlement appliqué sur facture N° ${linkedInvoice.number}`
                  : payment.notes || 'Encaissement direct de prestation'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase font-bold text-emerald-800">Somme Encaissée</p>
              <p className="text-2xl font-black text-emerald-700">
                {formatCurrency(payment.amount, settings)}
              </p>
            </div>
          </div>
        </div>

        {linkedInvoice && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <p className="font-bold text-slate-800">Situation de la Facture {linkedInvoice.number} :</p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-slate-600">
              <div>Total Facture : <span className="font-semibold text-slate-900">{formatCurrency(linkedInvoice.totalTTC, settings)}</span></div>
              <div>Cumul Versé : <span className="font-semibold text-emerald-700">{formatCurrency(linkedInvoice.paidAmount, settings)}</span></div>
              <div>Reste à Payer : <span className="font-semibold text-rose-700">{formatCurrency(linkedInvoice.remainingAmount, settings)}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-6 mt-8 flex justify-between items-end">
        <div className="text-[10px] text-slate-400">
          Ce reçu constitue une preuve irrévocable de paiement pour les sommes mentionnées.
        </div>
        <div className="text-center w-52 border border-dashed border-emerald-300 rounded p-4 bg-emerald-50/30">
          <p className="text-[11px] font-bold text-emerald-900 uppercase">Visa de Caisse</p>
          <div className="h-12 flex items-center justify-center text-emerald-700 text-xs italic">
            Acquitté - {settings.name}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component: Rental Contract Content
const ContractContent: React.FC<{ reservation: Reservation; client: any; vehicle: any; settings: any }> = ({
  reservation,
  client,
  vehicle,
  settings,
}) => {
  return (
    <div className="flex flex-col justify-between h-full space-y-6 text-xs">
      <div>
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div>
            <div className="mb-2 inline-flex rounded bg-slate-900 p-2">
              <img src="/elite-cars-logo.webp" alt={settings.name} className="h-auto max-h-10 w-40 object-contain object-left" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">{settings.name}</h1>
            <p className="text-[11px] text-slate-500">Contrat officiel de location de véhicule sans chauffeur</p>
          </div>
          <div className="text-right">
            <span className="bg-slate-900 text-white px-2.5 py-1 rounded font-bold text-xs">
              CONTRAT N° {reservation.reference}
            </span>
            <p className="text-slate-500 text-[11px] mt-1">Date : {formatDate(reservation.createdAt)}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <p className="font-bold text-slate-800 uppercase text-[10px] mb-1">Le Loueur :</p>
            <p className="font-semibold">{settings.name}</p>
            <p>{[settings.address, settings.city, settings.country].filter(Boolean).join(' - ')}</p>
            <p>NINEA : {settings.ninea}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <p className="font-bold text-slate-800 uppercase text-[10px] mb-1">Le Locataire :</p>
            <p className="font-semibold">{client?.fullName}</p>
            <p>Tél : {client?.phone}</p>
            <p>Permis N° : {client?.driverLicenseNumber || 'Non renseigné'}</p>
          </div>
        </div>

        {/* Vehicle */}
        <div className="p-3.5 bg-blue-50/60 rounded border border-blue-200 my-4">
          <p className="font-bold text-blue-900 uppercase text-[10px] mb-1">Véhicule Loué :</p>
          <div className="grid grid-cols-3 gap-2">
            <div><span className="text-slate-500">Marque & Modèle :</span> <span className="font-bold">{vehicle?.brand} {vehicle?.model}</span></div>
            <div><span className="text-slate-500">Immatriculation :</span> <span className="font-bold">{vehicle?.licensePlate}</span></div>
            <div><span className="text-slate-500">Kilométrage Départ :</span> <span className="font-bold">{reservation.startMileage || vehicle?.currentMileage} km</span></div>
          </div>
        </div>

        {/* Period & Rates */}
        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <p className="font-bold text-slate-800 uppercase text-[10px]">Période de Location :</p>
            <p>Départ : <span className="font-semibold">{formatDate(reservation.startDate)} à {reservation.startTime}</span> ({reservation.pickupLocation})</p>
            <p>Retour : <span className="font-semibold">{formatDate(reservation.endDate)} à {reservation.endTime}</span> ({reservation.returnLocation})</p>
            <p>Durée totale : <span className="font-bold">{reservation.totalDays} jour(s)</span></p>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <p className="font-bold text-slate-800 uppercase text-[10px]">Conditions Financières :</p>
            <p>Tarif forfaitaire : <span className="font-semibold">{formatCurrency(reservation.baseAmount, settings)}</span></p>
            <p>Options choisies : <span className="font-semibold">{formatCurrency(reservation.totalOptionsAmount, settings)}</span></p>
            <p>Caution déposée : <span className="font-bold text-blue-800">{formatCurrency(reservation.depositRequired, settings)}</span> ({reservation.depositStatus})</p>
            <p className="font-bold text-slate-900 pt-1 border-t border-slate-200">
              Total Estimé : {formatCurrency(reservation.totalEstimatedAmount, settings)}
            </p>
          </div>
        </div>

        {/* Clauses */}
        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-600 space-y-1 leading-relaxed">
          <p className="font-bold text-slate-800">Clauses & Engagements du Locataire :</p>
          <p>1. Le locataire s’engage à restituer le véhicule dans le même état de propreté et avec le niveau de carburant initial.</p>
          <p>2. Tout retard non notifié sera facturé au prorata journalier majoré de 50%.</p>
          <p>3. En cas d’accident ou de panne, alerter immédiatement l’assistance au {settings.phone}.</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-8">
        <div className="p-4 border border-dashed border-slate-300 rounded text-center">
          <p className="font-bold text-slate-700 uppercase text-[10px]">Signature du Locataire</p>
          <p className="text-[10px] text-slate-400 italic mb-6">"Lu et approuvé - Bon pour accord"</p>
        </div>
        <div className="p-4 border border-dashed border-slate-300 rounded text-center">
          <p className="font-bold text-slate-700 uppercase text-[10px]">Pour {settings.name}</p>
          <p className="text-[10px] text-slate-400 italic mb-6">Cachet et signature du responsable</p>
        </div>
      </div>
    </div>
  );
};
