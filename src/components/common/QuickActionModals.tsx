import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';
import { ExpenseCategory, PaymentMethod } from '../../types';
import { calculateDaysBetween, formatCurrency } from '../../utils/formatters';
import { canUseQuickAction } from '../../utils/permissions';

export const QuickActionModals: React.FC = () => {
  const {
    quickModal,
    setQuickModal,
    clients,
    vehicles,
    invoices,
    reservations,
    addReservation,
    addInvoice,
    addPayment,
    addExpense,
    checkVehicleAvailability,
    settings,
    currentUser,
    openPreviewDoc,
    getNextDocumentNumber,
  } = useApp();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for Quick Reservation
  const today = new Date().toISOString().split('T')[0];
  const next3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [resClientId, setResClientId] = useState('');
  const [resVehicleId, setResVehicleId] = useState('');
  const [resStart, setResStart] = useState(today);
  const [resEnd, setResEnd] = useState(next3Days);

  // States for Quick Payment
  const [payClientId, setPayClientId] = useState('');
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState(50000);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('MOBILE_MONEY');

  // States for Quick Expense
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('CARBURANT');
  const [expDesc, setExpDesc] = useState('');
  const [expAmountHT, setExpAmountHT] = useState(30000);
  const [expVendor, setExpVendor] = useState('Station Total');

  if (!quickModal) return null;
  if (!canUseQuickAction(currentUser.role, quickModal)) return null;

  const handleCreateQuickReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cId = resClientId || clients[0]?.id;
    const vId = resVehicleId || vehicles[0]?.id;

    if (!cId || !vId) {
      setErrorMsg('Veuillez sélectionner un client et un véhicule.');
      return;
    }

    const avail = checkVehicleAvailability(vId, resStart, resEnd);
    if (!avail.available) {
      setErrorMsg(`Véhicule indisponible du ${avail.conflictWith?.startDate} au ${avail.conflictWith?.endDate}`);
      return;
    }

    const v = vehicles.find((veh) => veh.id === vId);
    const days = calculateDaysBetween(resStart, resEnd);
    const amount = (v?.dailyRate || 40000) * days;
    let nextRef: string;
    try {
      nextRef = await getNextDocumentNumber('reservation');
    } catch {
      setErrorMsg('Impossible de réserver un numéro de réservation. Réessayez.');
      return;
    }

    const res = addReservation({
      reference: nextRef,
      clientId: cId,
      vehicleId: vId,
      startDate: resStart,
      startTime: '09:00',
      endDate: resEnd,
      endTime: '18:00',
      pickupLocation: 'Agence Centrale Dakar',
      returnLocation: 'Agence Centrale Dakar',
      rateTypeApplied: 'JOURNALIER',
      baseRate: v?.dailyRate || 40000,
      totalDays: days,
      options: [],
      totalOptionsAmount: 0,
      baseAmount: amount,
      discountAmount: 0,
      totalEstimatedAmount: amount,
      depositRequired: v?.depositAmount || 200000,
      depositStatus: 'NON_VERSEE',
      startMileage: v?.currentMileage,
      fuelLevelStart: '100%',
      status: 'CONFIRMEE',
      contractSigned: false,
      createdById: currentUser.id,
    });

    if (res.success) {
      setQuickModal(null);
    } else {
      setErrorMsg(res.error || 'Erreur lors de la réservation');
    }
  };

  const handleCreateQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cId = payClientId || clients[0]?.id;
    if (!cId) return;

    const res = await addPayment({
      clientId: cId,
      invoiceId: payInvoiceId || undefined,
      amount: payAmount,
      paymentMethod: payMethod,
      paymentType: 'FACTURE',
      referenceNumber: 'WAVE-RAPIDE',
      date: today,
      notes: 'Règlement rapide',
      recordedById: currentUser.id,
    });

    if (res.success && res.payment) {
      setQuickModal(null);
      openPreviewDoc('RECEIPT', res.payment);
    } else {
      setErrorMsg(res.error || 'Erreur lors du paiement');
    }
  };

  const handleCreateQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || expAmountHT <= 0) return;

    const taxRate = settings.defaultTaxRatePercent;
    const tax = Math.round((expAmountHT * taxRate) / 100);
    let nextRef: string;
    try {
      nextRef = await getNextDocumentNumber('expense');
    } catch {
      setErrorMsg('Impossible de réserver un numéro de dépense. Réessayez.');
      return;
    }

    addExpense({
      reference: nextRef,
      category: expCategory,
      description: expDesc,
      amountHT: expAmountHT,
      taxRatePercent: taxRate,
      amountTax: tax,
      amountTTC: expAmountHT + tax,
      date: today,
      paymentMethod: 'MOBILE_MONEY',
      vendorName: expVendor,
      isDeductibleTax: true,
      recordedById: currentUser.id,
    });

    setQuickModal(null);
  };

  return (
    <>
      {/* QUICK RESERVATION MODAL */}
      {quickModal === 'RESERVATION' && (
        <Modal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          title="Création Rapide de Réservation"
          subtitle="Réservation instantanée avec contrôle des disponibilités"
          maxWidth="md"
        >
          <form onSubmit={handleCreateQuickReservation} className="space-y-4">
            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client *</label>
              <select
                value={resClientId}
                onChange={(e) => setResClientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Véhicule *</label>
              <select
                value={resVehicleId}
                onChange={(e) => setResVehicleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} ({v.licensePlate}) - {formatCurrency(v.dailyRate, settings)}/j
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Départ</label>
                <input
                  type="date"
                  value={resStart}
                  onChange={(e) => setResStart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Retour prévu</label>
                <input
                  type="date"
                  value={resEnd}
                  onChange={(e) => setResEnd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirmer la Réservation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* QUICK PAYMENT MODAL */}
      {quickModal === 'PAYMENT' && (
        <Modal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          title="Enregistrement Rapide de Paiement"
          subtitle="Encaisser sur une facture avec délivrance immédiate de reçu"
          maxWidth="md"
        >
          <form onSubmit={handleCreateQuickPayment} className="space-y-4">
            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Facture à régler</label>
              <select
                value={payInvoiceId}
                onChange={(e) => {
                  setPayInvoiceId(e.target.value);
                  const inv = invoices.find((i) => i.id === e.target.value);
                  if (inv) {
                    setPayClientId(inv.clientId);
                    setPayAmount(inv.remainingAmount);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="">Paiement libre direct</option>
                {invoices
                  .filter((i) => !i.deletedAt && i.remainingAmount > 0)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.number} - Reste : {formatCurrency(i.remainingAmount, settings)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant (FCFA) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Moyen de règlement</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                >
                  <option value="MOBILE_MONEY">Wave / Orange Money</option>
                  <option value="VIREMENT_BANCAIRE">Virement bancaire</option>
                  <option value="ESPECES">Espèces</option>
                  <option value="CHEQUE">Chèque</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Encaisser & Reçu
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* QUICK EXPENSE MODAL */}
      {quickModal === 'EXPENSE' && (
        <Modal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          title="Ajout Rapide de Dépense"
          subtitle="Enregistrement d'un décaissement en un clic"
          maxWidth="md"
        >
          <form onSubmit={handleCreateQuickExpense} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Motif / Description *</label>
              <input
                type="text"
                required
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Ex: Plein carburant véhicule"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                >
                  <option value="CARBURANT">Carburant</option>
                  <option value="ENTRETIEN">Entretien / Vidange</option>
                  <option value="REPARATION">Réparation</option>
                  <option value="DIVERS">Divers</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant HT (FCFA) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={expAmountHT}
                  onChange={(e) => setExpAmountHT(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-rose-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fournisseur</label>
              <input
                type="text"
                value={expVendor}
                onChange={(e) => setExpVendor(e.target.value)}
                placeholder="Ex: Station TotalEnergies"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Enregistrer la dépense
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
