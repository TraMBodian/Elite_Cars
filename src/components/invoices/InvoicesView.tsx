import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Search,
  Plus,
  Printer,
  Copy,
  Mail,
  XCircle,
  Trash2,
  Download,
  AlertCircle,
  CreditCard,
  PlusCircle,
  Calendar,
  Send,
  Eye
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

export const InvoicesView: React.FC = () => {
  const {
    invoices,
    addInvoice,
    updateInvoice,
    cancelInvoice,
    deleteInvoice,
    duplicateInvoice,
    clients,
    reservations,
    settings,
    openPreviewDoc,
    setQuickModal,
    quickModal,
    currentUser,
    showToast,
    getNextDocumentNumber,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [emailModalInvoice, setEmailModalInvoice] = useState<Invoice | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [cancelReasonInvoice, setCancelReasonInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Form state for creating an invoice
  const today = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + (settings.invoiceDueDays || 15) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const defaultTaxRate = settings.defaultTaxRatePercent ?? 18;

  const [formClientId, setFormClientId] = useState('');
  const [formReservationId, setFormReservationId] = useState('');
  const [formIssueDate, setFormIssueDate] = useState(today);
  const [formDueDate, setFormDueDate] = useState(defaultDue);
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    {
      id: `it-${Date.now()}-1`,
      description: 'Prestation de location de véhicule',
      quantity: 1,
      unitPrice: 50000,
      discountPercent: 0,
      taxRatePercent: defaultTaxRate,
      totalHT: 50000,
      totalTax: Math.round((50000 * defaultTaxRate) / 100),
      totalTTC: Math.round(50000 * (1 + defaultTaxRate / 100)),
    },
  ]);

  const activeInvoices = useMemo(() => {
    return invoices.filter((i) => !i.deletedAt);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return activeInvoices.filter((inv) => {
      const client = clients.find((c) => c.id === inv.clientId);
      const matchSearch =
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        (client && client.fullName.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [activeInvoices, search, statusFilter, clients]);

  // Recalculate item line
  const updateItemField = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setFormItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      const qty = Number(item.quantity) || 1;
      const pu = Number(item.unitPrice) || 0;
      const discount = Number(item.discountPercent) || 0;
      const taxRate = Number(item.taxRatePercent) || 0;

      const baseAmount = qty * pu;
      const discountVal = (baseAmount * discount) / 100;
      const ht = Math.max(0, baseAmount - discountVal);
      const tax = Math.round((ht * taxRate) / 100);
      const ttc = ht + tax;

      item.totalHT = ht;
      item.totalTax = tax;
      item.totalTTC = ttc;

      copy[index] = item;
      return copy;
    });
  };

  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: `it-${Date.now()}-${prev.length + 1}`,
        description: 'Option / Carburant / Service',
        quantity: 1,
        unitPrice: 15000,
        discountPercent: 0,
        taxRatePercent: defaultTaxRate,
        totalHT: 15000,
        totalTax: Math.round((15000 * defaultTaxRate) / 100),
        totalTTC: Math.round(15000 * (1 + defaultTaxRate / 100)),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Form Totals
  const subtotalHT = useMemo(() => formItems.reduce((acc, it) => acc + it.totalHT, 0), [formItems]);
  const totalTax = useMemo(() => formItems.reduce((acc, it) => acc + it.totalTax, 0), [formItems]);
  const totalTTC = useMemo(() => formItems.reduce((acc, it) => acc + it.totalTTC, 0), [formItems]);

  const handleOpenCreate = () => {
    setFormClientId(clients[0]?.id || '');
    setFormReservationId('');
    setFormIssueDate(new Date().toISOString().split('T')[0]);
    setFormDueDate(
      new Date(Date.now() + (settings.invoiceDueDays || 15) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    );
    setFormNotes('');
    setFormItems([
      {
        id: `it-${Date.now()}-1`,
        description: 'Location véhicule de tourisme',
        quantity: 1,
        unitPrice: 50000,
        discountPercent: 0,
        taxRatePercent: defaultTaxRate,
        totalHT: 50000,
        totalTax: Math.round((50000 * defaultTaxRate) / 100),
        totalTTC: Math.round(50000 * (1 + defaultTaxRate / 100)),
      },
    ]);
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    if (quickModal !== 'INVOICE') return;
    handleOpenCreate();
    setQuickModal(null);
  }, [quickModal, setQuickModal]);

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId) return;

    let nextNumber: string;
    try {
      nextNumber = await getNextDocumentNumber('invoice');
    } catch {
      return;
    }

    const grossSubtotalHT = formItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalDiscount = grossSubtotalHT - subtotalHT;
    const invoiceTotal = grossSubtotalHT - totalDiscount + totalTax;

    addInvoice({
      number: nextNumber,
      clientId: formClientId,
      reservationId: formReservationId || undefined,
      issueDate: formIssueDate,
      dueDate: formDueDate,
      items: formItems,
      subtotalHT: grossSubtotalHT,
      totalDiscount,
      totalTax,
      totalTTC: invoiceTotal,
      paidAmount: 0,
      remainingAmount: invoiceTotal,
      status: 'EMISE',
      termsAndConditions: 'Paiement à réception par virement bancaire ou Mobile Money.',
      notes: formNotes,
      createdById: currentUser.id,
    });

    setIsCreateModalOpen(false);
  };

  const handleConfirmCancel = () => {
    if (!cancelReasonInvoice || !cancelReason.trim()) return;
    cancelInvoice(cancelReasonInvoice.id, cancelReason);
    setCancelReasonInvoice(null);
    setCancelReason('');
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalInvoice || !emailRecipient) return;
    showToast(`Facture ${emailModalInvoice.number} envoyée avec succès à ${emailRecipient}.`);
    setEmailModalInvoice(null);
  };

  const handleExportCSV = () => {
    const rows = filteredInvoices.map((inv) => {
      const client = clients.find((c) => c.id === inv.clientId);
      return {
        'Numéro Facture': inv.number,
        Client: client?.fullName || '-',
        Émission: inv.issueDate,
        Échéance: inv.dueDate,
        'Montant HT': inv.subtotalHT,
        'TVA 18%': inv.totalTax,
        'Montant TTC': inv.totalTTC,
        'Encaissé': inv.paidAmount,
        'Reste à Payer': inv.remainingAmount,
        Statut: inv.status,
      };
    });
    exportToCSV(`factures_elite_cars_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher N° facture, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Tous les statuts ({activeInvoices.length})</option>
            <option value="EMISE">Émises / En attente</option>
            <option value="PARTIELLEMENT_PAYEE">Partiellement payées</option>
            <option value="PAYEE">Payées</option>
            <option value="EN_RETARD">En retard d’échéance</option>
            <option value="BROUILLON">Brouillons</option>
            <option value="ANNULEE">Annulées</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Créer Facture</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Numéro</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4 text-right">Total HT</th>
                <th className="py-3 px-4 text-right">TTC</th>
                <th className="py-3 px-4 text-right">Déjà Payé</th>
                <th className="py-3 px-4 text-right">Reste à Payer</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => {
                const client = clients.find((c) => c.id === inv.clientId);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <span
                        onClick={() => openPreviewDoc('INVOICE', inv)}
                        className="font-bold text-blue-600 text-sm hover:underline cursor-pointer"
                      >
                        {inv.number}
                      </span>
                      {inv.reservationId && (
                        <p className="text-[10px] text-slate-400">Liée à contrat</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{client?.fullName || 'Client'}</p>
                      {client?.companyName && (
                        <p className="text-[10px] text-slate-500 font-medium">{client.companyName}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <p>Émise : {formatDate(inv.issueDate)}</p>
                      <p className={`text-[11px] ${inv.status === 'EN_RETARD' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                        Échéance : {formatDate(inv.dueDate)}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium">
                      {formatCurrency(inv.subtotalHT, settings)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(inv.totalTTC, settings)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                      {formatCurrency(inv.paidAmount, settings)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold">
                      {inv.remainingAmount > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {formatCurrency(inv.remainingAmount, settings)}
                        </span>
                      ) : (
                        <span className="text-emerald-700">0 {settings.currencySymbol}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Imprimer / PDF */}
                        <button
                          onClick={() => openPreviewDoc('INVOICE', inv)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          title="Imprimer / Exporter Facture PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Fast Payment */}
                        {inv.remainingAmount > 0 && inv.status !== 'ANNULEE' && (
                          <button
                            onClick={() => setQuickModal('PAYMENT')}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] shadow-xs flex items-center gap-1"
                            title="Encaisser un paiement"
                          >
                            <CreditCard className="h-3 w-3" />
                            <span>Payer</span>
                          </button>
                        )}

                        {/* Dupliquer */}
                        <button
                          onClick={() => { void duplicateInvoice(inv.id); }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                          title="Dupliquer la facture"
                        >
                          <Copy className="h-4 w-4" />
                        </button>

                        {/* Envoyer par email */}
                        <button
                          onClick={() => {
                            setEmailModalInvoice(inv);
                            setEmailRecipient(client?.email || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                          title="Envoyer la facture par email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>

                        {/* Annuler avec motif */}
                        {inv.status !== 'ANNULEE' && (
                          <button
                            onClick={() => setCancelReasonInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                            title="Annuler la facture"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}

                        {/* Supprimer (Verrouillé si payée selon la règle métier) */}
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          disabled={inv.paidAmount > 0}
                          className={`p-1.5 rounded transition ${
                            inv.paidAmount > 0
                              ? 'text-slate-200 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                          }`}
                          title={
                            inv.paidAmount > 0
                              ? 'Suppression bloquée : facture avec règlements'
                              : 'Supprimer'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Aucune facture trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Invoice */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer une Facture Client"
        subtitle="Calcul automatique de la TVA (18%), remises et totaux TTC"
        maxWidth="4xl"
      >
        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client facturé *</label>
              <select
                required
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Sélectionner client...</option>
                {clients
                  .filter((c) => !c.deletedAt)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} {c.taxNumber ? `(NINEA: ${c.taxNumber})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date d’émission *</label>
              <input
                type="date"
                required
                value={formIssueDate}
                onChange={(e) => setFormIssueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date d’échéance *</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-blue-800"
              />
            </div>
          </div>

          {/* Lignes d'articles */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Lignes d’Articles / Prestations
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {formItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                  <div className="col-span-5">
                    <input
                      type="text"
                      required
                      placeholder="Description de la prestation..."
                      value={item.description}
                      onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-medium"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min={1}
                      placeholder="Qté"
                      value={item.quantity}
                      onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="P.U. HT"
                      value={item.unitPrice}
                      onChange={(e) => updateItemField(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs text-right font-medium"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      placeholder="Rem.%"
                      value={item.discountPercent}
                      onChange={(e) => updateItemField(idx, 'discountPercent', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs text-center"
                    />
                  </div>
                  <div className="col-span-2 text-right font-bold text-slate-900 pr-2">
                    {formatCurrency(item.totalTTC, settings)}
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={formItems.length === 1}
                      className="text-slate-300 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="w-80 space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total HT :</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotalHT, settings)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>TVA ({defaultTaxRate}%) :</span>
                <span className="font-semibold text-slate-900">{formatCurrency(totalTax, settings)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-blue-900 pt-2 border-t border-slate-200">
                <span>Total TTC :</span>
                <span>{formatCurrency(totalTTC, settings)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes et conditions</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ex: Modalités de règlement, références bons de commande..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Émettre la Facture
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Cancel Invoice */}
      {cancelReasonInvoice && (
        <Modal
          isOpen={!!cancelReasonInvoice}
          onClose={() => setCancelReasonInvoice(null)}
          title={`Annuler la Facture ${cancelReasonInvoice.number}`}
          subtitle="Conformité comptable : saisie obligatoire d’un motif d’annulation"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Conformément aux règles comptables, une facture émise ne peut être supprimée si elle a été transmise ou payée. Elle sera passée en statut « Annulée » avec archivage du motif.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motif d’annulation *
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur sur le client facturé, annulation de la prestation..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelReasonInvoice(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Retour
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirmer l’Annulation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Send Invoice by Email */}
      {emailModalInvoice && (
        <Modal
          isOpen={!!emailModalInvoice}
          onClose={() => setEmailModalInvoice(null)}
          title={`Envoyer la Facture ${emailModalInvoice.number}`}
          subtitle="Envoi par courrier électronique avec pièce jointe PDF"
          maxWidth="md"
        >
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destinataire *</label>
              <input
                type="email"
                required
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="comptabilite@entreprise.sn"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Objet</label>
              <input
                type="text"
                readOnly
                value={`[${settings.name}] Facture ${emailModalInvoice.number} - Montant: ${formatCurrency(emailModalInvoice.totalTTC, settings)}`}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
              <textarea
                rows={4}
                readOnly
                value={`Madame, Monsieur,\n\nVeuillez trouver ci-joint votre facture ${emailModalInvoice.number} pour un montant total de ${formatCurrency(emailModalInvoice.totalTTC, settings)}.\n\nDate d'échéance : ${formatDate(emailModalInvoice.dueDate)}.\n\nCordialement,\nService Comptabilité - ${settings.name}`}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs text-slate-600 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmailModalInvoice(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Envoyer maintenant</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
