import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  Search,
  Plus,
  Printer,
  Download,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { Payment, PaymentMethod, PaymentType } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

const normalizeDateInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '').slice(0, 8);
  if (!digits || digits.length < 8) return trimmed.slice(0, 10);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

const isValidDateInput = (value: string): boolean => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

export const PaymentsView: React.FC = () => {
  const {
    payments,
    addPayment,
    deletePayment,
    invoices,
    clients,
    vehicles,
    reservations,
    settings,
    openPreviewDoc,
    currentUser,
  } = useApp();

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PaymentType>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    clientId: '',
    invoiceId: '',
    reservationId: '',
    amount: 0,
    paymentMethod: 'MOBILE_MONEY' as PaymentMethod,
    paymentType: 'FACTURE' as PaymentType,
    referenceNumber: '',
    date: today,
    notes: '',
  });

  const activePayments = useMemo(() => {
    return payments.filter((p) => !p.deletedAt);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return activePayments.filter((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      const matchSearch =
        p.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        (client && client.fullName.toLowerCase().includes(search.toLowerCase())) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(search.toLowerCase()));

      const matchMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;
      const matchType = typeFilter === 'ALL' || p.paymentType === typeFilter;
      return matchSearch && matchMethod && matchType;
    });
  }, [activePayments, search, methodFilter, typeFilter, clients]);

  // Total encaissé
  const totalReceived = useMemo(() => {
    return activePayments
      .filter((p) => p.paymentType === 'FACTURE' || p.paymentType === 'ENCAISSEMENT_DIRECT')
      .reduce((acc, p) => acc + p.amount, 0);
  }, [activePayments]);

  const totalCautionsHeld = useMemo(() => {
    const inCaution = activePayments
      .filter((p) => p.paymentType === 'CAUTION_ENTREE')
      .reduce((acc, p) => acc + p.amount, 0);
    const outCaution = activePayments
      .filter((p) => p.paymentType === 'RESTITUTION_CAUTION')
      .reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, inCaution - outCaution);
  }, [activePayments]);

  const getReservationBalance = (reservationId: string): number => {
    const reservation = reservations.find((record) => record.id === reservationId);
    if (!reservation) return 0;
    const received = activePayments
      .filter((payment) => payment.paymentType === 'FACTURE' || payment.paymentType === 'ENCAISSEMENT_DIRECT')
      .filter((payment) => {
        const linkedReservationId = payment.reservationId ??
          invoices.find((invoice) => invoice.id === payment.invoiceId)?.reservationId;
        return linkedReservationId === reservationId;
      })
      .reduce((total, payment) => total + payment.amount, 0);
    return Math.max(0, reservation.totalEstimatedAmount - received);
  };

  const handleOpenAdd = () => {
    setFormError(null);
    const firstInvoiceWithDue = invoices.find(
      (i) => !i.deletedAt && i.status !== 'ANNULEE' && i.status !== 'BROUILLON' && i.remainingAmount > 0
    );
    setFormData({
      clientId: firstInvoiceWithDue ? firstInvoiceWithDue.clientId : clients[0]?.id || '',
      invoiceId: firstInvoiceWithDue ? firstInvoiceWithDue.id : '',
      reservationId: '',
      amount: firstInvoiceWithDue ? firstInvoiceWithDue.remainingAmount : 0,
      paymentMethod: 'MOBILE_MONEY',
      paymentType: 'FACTURE',
      referenceNumber: 'WAVE-TX-',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSelectInvoice = (invId: string) => {
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setFormData((prev) => ({
        ...prev,
        invoiceId: inv.id,
        paymentType: 'FACTURE',
        clientId: inv.clientId,
        reservationId: inv.reservationId || '',
        amount: inv.remainingAmount,
      }));
    } else {
      setFormData((prev) => ({ ...prev, invoiceId: '', reservationId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const normalizedDate = normalizeDateInput(formData.date);
    if (!isValidDateInput(normalizedDate)) {
      setFormError('La date d’encaissement doit être au format YYYY-MM-DD.');
      return;
    }

    if (formData.amount <= 0) {
      setFormError('Le montant doit être supérieur à zéro.');
      return;
    }

    if (!formData.clientId) {
      setFormError('Veuillez sélectionner un client.');
      return;
    }
    if (formData.paymentType === 'FACTURE' && !formData.invoiceId) {
      setFormError('Sélectionnez la facture à régler pour suivre son solde.');
      return;
    }
    if (formData.paymentType === 'ENCAISSEMENT_DIRECT' && !formData.reservationId) {
      setFormError('Sélectionnez la réservation concernée par cet encaissement.');
      return;
    }

    const res = await addPayment({
      clientId: formData.clientId,
      invoiceId: formData.invoiceId || undefined,
      reservationId: formData.reservationId || undefined,
      amount: formData.amount,
      paymentMethod: formData.paymentMethod,
      paymentType: formData.paymentType,
      referenceNumber: formData.referenceNumber,
      date: normalizedDate,
      notes: formData.notes,
      recordedById: currentUser.id,
    });

    if (res.success && res.payment) {
      setIsModalOpen(false);
      openPreviewDoc('RECEIPT', res.payment);
    } else if (res.error) {
      setFormError(res.error);
    }
  };

  const handleExportCSV = () => {
    const rows = filteredPayments.map((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      const invoice = invoices.find((i) => i.id === p.invoiceId);
      return {
        'N° Reçu': p.receiptNumber,
        Client: client?.fullName || '-',
        'Facture Liée': invoice ? invoice.number : '-',
        Date: p.date,
        Montant: p.amount,
        'Moyen de Paiement': p.paymentMethod,
        Type: p.paymentType,
        'Réf. Transaction': p.referenceNumber || '-',
      };
    });
    exportToCSV(`encaissements_elite_cars_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Stat Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total des Règlements Reçus</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {formatCurrency(totalReceived, settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activePayments.filter((p) => p.paymentType === 'FACTURE').length} encaissements sur factures
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Cautions sous Garantie (Caisse)</p>
            <p className="text-2xl font-black text-blue-800 mt-1">
              {formatCurrency(totalCautionsHeld, settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Fonds de garantie bloqués</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Canaux Dominants</p>
            <p className="text-base font-bold text-slate-800 mt-1">Mobile Money (Wave) & Virements</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Traçabilité 100% bancarisée</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher reçu, client, transaction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Tous les modes ({activePayments.length})</option>
            <option value="MOBILE_MONEY">Mobile Money (Wave/OM)</option>
            <option value="VIREMENT_BANCAIRE">Virement bancaire</option>
            <option value="ESPECES">Espèces</option>
            <option value="CHEQUE">Chèque</option>
            <option value="CARTE_BANCAIRE">Carte bancaire</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Tous types</option>
            <option value="FACTURE">Règlement Facture</option>
            <option value="CAUTION_ENTREE">Caution versée</option>
            <option value="RESTITUTION_CAUTION">Restitution caution</option>
            <option value="ENCAISSEMENT_DIRECT">Encaissement direct</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Enregistrer un Paiement</span>
          </button>
        </div>
      </div>

      {/* Table of Payments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">N° Reçu</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Facture Liée</th>
                <th className="py-3 px-4">Date & Réf.</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Montant Encaissé</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                const invoice = invoices.find((i) => i.id === p.invoiceId);
                const isCautionRefund = p.paymentType === 'RESTITUTION_CAUTION';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <span
                        onClick={() => openPreviewDoc('RECEIPT', p)}
                        className="text-emerald-700 hover:underline cursor-pointer"
                      >
                        {p.receiptNumber}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{client?.fullName || 'Client'}</p>
                      {client?.phone && <p className="text-[10px] text-slate-400">{client.phone}</p>}
                    </td>

                    <td className="py-3.5 px-4">
                      {invoice ? (
                        <span
                          onClick={() => openPreviewDoc('INVOICE', invoice)}
                          className="font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          {invoice.number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Paiement direct</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900">{formatDate(p.date)}</p>
                      {p.referenceNumber && (
                        <p className="text-[10px] text-slate-500 font-mono">{p.referenceNumber}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          p.paymentType === 'FACTURE'
                            ? 'bg-blue-50 text-blue-700'
                            : p.paymentType === 'CAUTION_ENTREE'
                            ? 'bg-indigo-50 text-indigo-700'
                            : p.paymentType === 'RESTITUTION_CAUTION'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.paymentType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-black text-sm ${
                          isCautionRefund ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {isCautionRefund ? '-' : '+'}
                        {formatCurrency(p.amount, settings)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openPreviewDoc('RECEIPT', p)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded transition"
                          title="Imprimer le Reçu Officiel"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer le versement ${p.receiptNumber} ?`)) {
                              deletePayment(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun paiement enregistré pour cette sélection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Enregistrer un Paiement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enregistrer un Paiement / Encaissement"
        subtitle="Génération automatique du reçu officiel et lettrage sur facture"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Associer à une Facture (Optionnel)
            </label>
            <select
              value={formData.invoiceId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              required={formData.paymentType === 'FACTURE'}
              disabled={formData.paymentType !== 'FACTURE'}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">
                {formData.paymentType === 'FACTURE' ? 'Sélectionner une facture...' : 'Aucune facture'}
              </option>
              {invoices
                .filter(
                  (i) =>
                    !i.deletedAt &&
                    i.status !== 'ANNULEE' &&
                    i.status !== 'BROUILLON' &&
                    i.remainingAmount > 0
                )
                .map((i) => {
                  const cl = clients.find((c) => c.id === i.clientId);
                  return (
                    <option key={i.id} value={i.id}>
                      {i.number} - {cl?.fullName} - Reste : {formatCurrency(i.remainingAmount, settings)}
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client payeur *</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="">Sélectionner client...</option>
                {clients
                  .filter((c) => !c.deletedAt)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.type})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type d’opération *</label>
              <select
                value={formData.paymentType}
                onChange={(e) => {
                  const paymentType = e.target.value as PaymentType;
                  setFormData((previous) => ({
                    ...previous,
                    paymentType,
                    invoiceId: paymentType === 'FACTURE' ? previous.invoiceId : '',
                    reservationId: paymentType === 'ENCAISSEMENT_DIRECT' ? '' : previous.reservationId,
                  }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              >
                <option value="FACTURE">Règlement Facture (Acompte ou Solde)</option>
                <option value="CAUTION_ENTREE">Encaissement Caution de garantie</option>
                <option value="RESTITUTION_CAUTION">Restitution Caution au client</option>
                <option value="ENCAISSEMENT_DIRECT">Encaissement direct</option>
              </select>
            </div>
          </div>

          {formData.paymentType === 'ENCAISSEMENT_DIRECT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location concernée *</label>
              <select
                required
                value={formData.reservationId}
                onChange={(e) => {
                  const reservationId = e.target.value;
                  const reservation = reservations.find((record) => record.id === reservationId);
                  setFormData((previous) => ({
                    ...previous,
                    reservationId,
                    clientId: reservation?.clientId || previous.clientId,
                    amount: reservationId ? getReservationBalance(reservationId) : 0,
                  }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="">Sélectionner une location...</option>
                {reservations
                  .filter((reservation) =>
                    !reservation.deletedAt &&
                    reservation.status !== 'ANNULEE' &&
                    !invoices.some((invoice) => invoice.reservationId === reservation.id) &&
                    getReservationBalance(reservation.id) > 0
                  )
                  .map((reservation) => {
                    const vehicle = vehicles.find((record) => record.id === reservation.vehicleId);
                    const client = clients.find((record) => record.id === reservation.clientId);
                    return (
                      <option key={reservation.id} value={reservation.id}>
                        {reservation.reference} · {vehicle?.brand} {vehicle?.model} · {client?.fullName} · Solde {formatCurrency(getReservationBalance(reservation.id), settings)}
                      </option>
                    );
                  })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-1">Montant Encaissé (FCFA) *</label>
              <input
                type="number"
                required
                min={1}
                max={
                  formData.invoiceId
                    ? invoices.find((invoice) => invoice.id === formData.invoiceId)?.remainingAmount
                    : formData.reservationId
                      ? getReservationBalance(formData.reservationId)
                      : undefined
                }
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-sm font-black text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-1">Moyen de règlement *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
              >
                <option value="MOBILE_MONEY">Mobile Money (Wave / Orange Money)</option>
                <option value="VIREMENT_BANCAIRE">Virement bancaire (CBAO, BICIS...)</option>
                <option value="ESPECES">Espèces (Caisse)</option>
                <option value="CHEQUE">Chèque</option>
                <option value="CARTE_BANCAIRE">Carte bancaire (TPE)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'encaissement</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: normalizeDateInput(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de transaction / Référence
              </label>
              <input
                type="text"
                placeholder="Ex: WAVE-TX-99824 ou CHQ-00192"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarques ou motifs</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex: Acompte 50% à la réservation..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Encaisser & Imprimer Reçu
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
