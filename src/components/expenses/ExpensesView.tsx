import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Receipt,
  Search,
  Plus,
  Car,
  Tag,
  Calendar,
  DollarSign,
  Download,
  Trash2,
  FileText,
  AlertCircle,
  Paperclip,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { Modal } from '../common/Modal';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, vehicles, settings, currentUser, getNextDocumentNumber } = useApp();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    vehicleId: '',
    category: 'CARBURANT' as ExpenseCategory,
    description: '',
    amountHT: 40000,
    taxRatePercent: settings.defaultTaxRatePercent,
    isDeductibleTax: true,
    paymentMethod: 'MOBILE_MONEY' as PaymentMethod,
    vendorName: '',
    receiptAttachmentName: '',
    date: today,
  });

  const activeExpenses = useMemo(() => {
    return expenses.filter((e) => !e.deletedAt);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return activeExpenses.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.reference.toLowerCase().includes(search.toLowerCase()) ||
        e.vendorName.toLowerCase().includes(search.toLowerCase());

      const matchCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
      const matchVehicle = vehicleFilter === 'ALL' || (vehicleFilter === 'GENERAL' ? !e.vehicleId : e.vehicleId === vehicleFilter);

      return matchSearch && matchCategory && matchVehicle;
    });
  }, [activeExpenses, search, categoryFilter, vehicleFilter]);

  const totalExpensesTTC = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amountTTC, 0);
  }, [filteredExpenses]);

  const totalDeductibleTVA = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.isDeductibleTax)
      .reduce((acc, e) => acc + e.amountTax, 0);
  }, [filteredExpenses]);

  const handleOpenAdd = () => {
    setFormData({
      vehicleId: '',
      category: 'CARBURANT',
      description: '',
      amountHT: 35000,
      taxRatePercent: settings.defaultTaxRatePercent,
      isDeductibleTax: true,
      paymentMethod: 'MOBILE_MONEY',
      vendorName: 'Station Shell / Total',
      receiptAttachmentName: 'ticket_caisse.pdf',
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || formData.amountHT <= 0) return;

    const taxAmount = formData.taxRatePercent > 0
      ? Math.round((formData.amountHT * formData.taxRatePercent) / 100)
      : 0;
    const amountTTC = formData.amountHT + taxAmount;
    let nextRef: string;
    try {
      nextRef = await getNextDocumentNumber('expense');
    } catch {
      return;
    }

    addExpense({
      reference: nextRef,
      vehicleId: formData.vehicleId || undefined,
      category: formData.category,
      description: formData.description,
      amountHT: formData.amountHT,
      taxRatePercent: formData.taxRatePercent,
      amountTax: taxAmount,
      amountTTC,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      vendorName: formData.vendorName,
      receiptAttachmentName: formData.receiptAttachmentName,
      isDeductibleTax: formData.isDeductibleTax,
      recordedById: currentUser.id,
    });

    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const rows = filteredExpenses.map((e) => {
      const v = vehicles.find((veh) => veh.id === e.vehicleId);
      return {
        Référence: e.reference,
        Date: e.date,
        Catégorie: e.category,
        Désignation: e.description,
        Fournisseur: e.vendorName,
        Véhicule: v ? `${v.brand} ${v.model} (${v.licensePlate})` : 'Charge générale',
        'Montant HT': e.amountHT,
        'TVA déductible': e.isDeductibleTax ? e.amountTax : 0,
        'Montant TTC': e.amountTTC,
        'Mode de règlement': e.paymentMethod,
      };
    });
    exportToCSV(`depenses_charges_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Expense KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total des Dépenses (Sélection)</p>
            <p className="text-2xl font-black text-rose-700 mt-1">
              {formatCurrency(totalExpensesTTC, settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{filteredExpenses.length} écritures de charges</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">TVA Déductible Récupérable</p>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {formatCurrency(totalDeductibleTVA, settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">À déduire de la TVA collectée</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Tag className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Charges Véhicules Flotte</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(
                filteredExpenses.filter((e) => !!e.vehicleId).reduce((a, b) => a + b.amountTTC, 0),
                settings
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Carburant, vidanges & réparations</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Car className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dépense, fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Toutes catégories</option>
            <option value="CARBURANT">Carburant</option>
            <option value="ENTRETIEN">Entretien & Vidange</option>
            <option value="REPARATION">Réparation & Carrosserie</option>
            <option value="ASSURANCE">Assurance flotte</option>
            <option value="LOYER">Loyer & Locaux</option>
            <option value="SALAIRE">Salaires & Chauffeurs</option>
            <option value="AMENDE">Amendes & PV</option>
            <option value="TAXE">Taxes & Impôts</option>
            <option value="DIVERS">Divers</option>
          </select>

          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Tout (Flotte + Siège)</option>
            <option value="GENERAL">Frais généraux d’agence</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.licensePlate})
              </option>
            ))}
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
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter une Dépense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Réf.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Description & Fournisseur</th>
                <th className="py-3 px-4">Affectation Véhicule</th>
                <th className="py-3 px-4 text-center">TVA Déductible</th>
                <th className="py-3 px-4 text-right">Montant TTC</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => {
                const vehicle = vehicles.find((v) => v.id === exp.vehicleId);
                return (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{exp.reference}</td>

                    <td className="py-3.5 px-4">{formatDate(exp.date)}</td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{exp.description}</p>
                      <p className="text-[11px] text-slate-500">
                        {exp.vendorName} • {exp.paymentMethod}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      {vehicle ? (
                        <div className="flex items-center gap-1.5">
                          <Car className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-semibold text-slate-800">
                            {vehicle.brand} {vehicle.model}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Charge d’exploitation</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {exp.isDeductibleTax ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                          {formatCurrency(exp.amountTax, settings)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-rose-700 text-sm">
                      {formatCurrency(exp.amountTTC, settings)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Supprimer la dépense ${exp.reference} ?`)) {
                            deleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                        title="Supprimer la charge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune dépense trouvée pour cette recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Expense */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enregistrer une Dépense / Charge"
        subtitle="Affectation analytique par véhicule ou générale d’exploitation"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie de dépense *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              >
                <option value="CARBURANT">Carburant</option>
                <option value="ENTRETIEN">Entretien mécanique / Vidange</option>
                <option value="REPARATION">Réparation carrosserie</option>
                <option value="ASSURANCE">Assurance flotte</option>
                <option value="AMENDE">Amende / Contravention</option>
                <option value="SALAIRE">Rémunération chauffeurs & équipe</option>
                <option value="LOYER">Loyer bureaux / Parking</option>
                <option value="TAXE">Taxes, patentes & vignettes</option>
                <option value="DIVERS">Frais divers</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Affecter à un véhicule (Optionnel)
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              >
                <option value="">Charge générale de l'agence (sans véhicule)</option>
                {vehicles
                  .filter((v) => !v.deletedAt)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.licensePlate})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Motif *</label>
            <input
              type="text"
              required
              placeholder="Ex: Plein gazole ou Remplacement disques de freins"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fournisseur / Prestataire *</label>
              <input
                type="text"
                required
                placeholder="Ex: Station Total, CFAO Motors..."
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Moyen de règlement</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="MOBILE_MONEY">Mobile Money (Wave / Orange Money)</option>
                <option value="VIREMENT_BANCAIRE">Virement bancaire</option>
                <option value="ESPECES">Espèces</option>
                <option value="CHEQUE">Chèque</option>
                <option value="CARTE_BANCAIRE">Carte bancaire</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-rose-50/50 p-3 rounded-lg border border-rose-100">
            <div>
              <label className="block text-xs font-semibold text-rose-950 mb-1">Montant HT (FCFA) *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.amountHT}
                onChange={(e) => setFormData({ ...formData, amountHT: Number(e.target.value) })}
                className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs font-bold text-rose-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-950 mb-1">Taux TVA (%)</label>
              <select
                value={formData.taxRatePercent}
                onChange={(e) => setFormData({ ...formData, taxRatePercent: Number(e.target.value) })}
                className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs font-semibold"
              >
                <option value={18}>18% (Taux normal)</option>
                <option value={0}>0% (Exonéré)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-950 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deductible"
              checked={formData.isDeductibleTax}
              onChange={(e) => setFormData({ ...formData, isDeductibleTax: e.target.checked })}
              className="rounded text-blue-600"
            />
            <label htmlFor="deductible" className="text-xs text-slate-700 cursor-pointer font-medium">
              TVA déductible (facture en règle avec mention de TVA récupérable)
            </label>
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Enregistrer la Dépense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
