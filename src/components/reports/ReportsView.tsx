import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Car,
  AlertCircle,
  TrendingUp,
  PieChart,
  FileText,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';

export const ReportsView: React.FC = () => {
  const { invoices, payments, expenses, vehicles, reservations, clients, settings } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'RENTABILITE_FLOTTE' | 'CREANCES_IMPAYES' | 'DEPENSES_ANALYTIQUE'>('RENTABILITE_FLOTTE');

  // 1. Rentabilité par véhicule
  const vehicleProfitability = useMemo(() => {
    return vehicles
      .filter((v) => !v.deletedAt)
      .map((v) => {
        const vehicleRentals = reservations.filter((r) => r.vehicleId === v.id && !r.deletedAt);
        const revenue = vehicleRentals.reduce((acc, r) => acc + r.totalEstimatedAmount, 0);
        const vehicleExpenses = expenses.filter((e) => e.vehicleId === v.id && !e.deletedAt);
        const totalCosts = vehicleExpenses.reduce((acc, e) => acc + e.amountTTC, 0);
        const margin = revenue - totalCosts;
        const totalDaysRented = vehicleRentals.reduce((acc, r) => acc + r.totalDays, 0);

        return {
          vehicle: v,
          revenue,
          costs: totalCosts,
          margin,
          rentalCount: vehicleRentals.length,
          daysRented: totalDaysRented,
          marginPercent: revenue > 0 ? Math.round((margin / revenue) * 100) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [vehicles, reservations, expenses]);

  // 2. Créances & Impayés Aging Balance
  const unpaidInvoices = useMemo(() => {
    const today = new Date().getTime();
    return invoices
      .filter((inv) => !inv.deletedAt && inv.status !== 'ANNULEE' && inv.remainingAmount > 0)
      .map((inv) => {
        const client = clients.find((c) => c.id === inv.clientId);
        const dueTime = new Date(inv.dueDate).getTime();
        const daysOverdue = Math.round((today - dueTime) / (1000 * 60 * 60 * 24));

        let agingCategory = 'COURANT'; // Pas encore échu
        if (daysOverdue > 60) agingCategory = 'PLUS_60_JOURS';
        else if (daysOverdue > 30) agingCategory = '30_A_60_JOURS';
        else if (daysOverdue > 0) agingCategory = '1_A_30_JOURS';

        return {
          invoice: inv,
          client,
          daysOverdue,
          agingCategory,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [invoices, clients]);

  const totalUnpaidAmount = unpaidInvoices.reduce((acc, it) => acc + it.invoice.remainingAmount, 0);

  // 3. Dépenses par catégorie
  const expenseBreakdown = useMemo(() => {
    const catTotals: Record<string, number> = {};
    expenses
      .filter((e) => !e.deletedAt)
      .forEach((e) => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amountTTC;
      });

    const total = Object.values(catTotals).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(catTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportRentabiliteCSV = () => {
    const rows = vehicleProfitability.map((vp) => ({
      Marque: vp.vehicle.brand,
      Modèle: vp.vehicle.model,
      Immatriculation: vp.vehicle.licensePlate,
      'CA Généré (FCFA)': vp.revenue,
      'Charges & Entretiens (FCFA)': vp.costs,
      'Marge Nette (FCFA)': vp.margin,
      'Taux de Marge': `${vp.marginPercent}%`,
      'Nombre de Locations': vp.rentalCount,
      'Jours Loués': vp.daysRented,
    }));
    exportToCSV(`rapport_rentabilite_flotte_${new Date().toISOString().split('T')[0]}`, rows);
  };

  const handleExportImpayesCSV = () => {
    const rows = unpaidInvoices.map((it) => ({
      'N° Facture': it.invoice.number,
      Client: it.client?.fullName || '-',
      'Téléphone Client': it.client?.phone || '-',
      'Date d’échéance': it.invoice.dueDate,
      'Retard (Jours)': it.daysOverdue > 0 ? it.daysOverdue : 0,
      'Total Facture': it.invoice.totalTTC,
      'Montant Déjà Réglé': it.invoice.paidAmount,
      'Reste à Recouvrer': it.invoice.remainingAmount,
      'Tranche d’ancienneté': it.agingCategory,
    }));
    exportToCSV(`balance_agee_impayes_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs & Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setActiveReportTab('RENTABILITE_FLOTTE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeReportTab === 'RENTABILITE_FLOTTE'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <Car className="h-3.5 w-3.5" />
            <span>Rentabilité par Véhicule</span>
          </button>
          <button
            onClick={() => setActiveReportTab('CREANCES_IMPAYES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeReportTab === 'CREANCES_IMPAYES'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Balance Âgée des Impayés</span>
          </button>
          <button
            onClick={() => setActiveReportTab('DEPENSES_ANALYTIQUE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeReportTab === 'DEPENSES_ANALYTIQUE'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>Analyse des Charges</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={
              activeReportTab === 'RENTABILITE_FLOTTE'
                ? handleExportRentabiliteCSV
                : handleExportImpayesCSV
            }
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimer le Rapport</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RENTABILITÉ PAR VÉHICULE */}
      {activeReportTab === 'RENTABILITE_FLOTTE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rapport de Performance Financière par Véhicule
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chiffre d’affaires, charges imputées (carburant, entretien) et marge nette
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Véhicule</th>
                    <th className="py-3 px-4">Immatriculation</th>
                    <th className="py-3 px-4 text-center">Locations / Jours</th>
                    <th className="py-3 px-4 text-right">CA Généré</th>
                    <th className="py-3 px-4 text-right">Charges Flotte</th>
                    <th className="py-3 px-4 text-right">Marge Nette</th>
                    <th className="py-3 px-4 text-center">Taux Marge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleProfitability.map((item) => (
                    <tr key={item.vehicle.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.vehicle.brand} {item.vehicle.model}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {item.vehicle.licensePlate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-900">{item.rentalCount} loc.</span>
                        <span className="text-[11px] text-slate-400 block">({item.daysRented} jours)</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(item.revenue, settings)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-rose-700">
                        {formatCurrency(item.costs, settings)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                        {formatCurrency(item.margin, settings)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.marginPercent >= 70
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.marginPercent >= 40
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.marginPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE ÂGÉE DES CRÉANCES */}
      {activeReportTab === 'CREANCES_IMPAYES' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold text-rose-800">
                Total des Créances Clients à Recouvrer
              </p>
              <p className="text-2xl font-black text-rose-900 mt-1">
                {formatCurrency(totalUnpaidAmount, settings)}
              </p>
            </div>
            <div className="text-right text-xs text-rose-800">
              <p><span className="font-bold">{unpaidInvoices.length}</span> facture(s) en attente de solde</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Facture</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Date Échéance</th>
                    <th className="py-3 px-4 text-center">Retard (Jours)</th>
                    <th className="py-3 px-4 text-right">Montant Total</th>
                    <th className="py-3 px-4 text-right">Reste Dû</th>
                    <th className="py-3 px-4 text-center">Statut Relance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unpaidInvoices.map((it) => (
                    <tr key={it.invoice.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-blue-600">{it.invoice.number}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{it.client?.fullName}</p>
                        <p className="text-[11px] text-slate-500">{it.client?.phone}</p>
                      </td>
                      <td className="py-3.5 px-4">{formatDate(it.invoice.dueDate)}</td>
                      <td className="py-3.5 px-4 text-center">
                        {it.daysOverdue > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            +{it.daysOverdue} jours
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Non échu</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        {formatCurrency(it.invoice.totalTTC, settings)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-700 text-sm">
                        {formatCurrency(it.invoice.remainingAmount, settings)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            it.daysOverdue > 15
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {it.daysOverdue > 15 ? 'Mise en demeure requise' : 'Relance amiable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {unpaidInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Aucun impayé actif. Excellent recouvrement !
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYSE DES DÉPENSES */}
      {activeReportTab === 'DEPENSES_ANALYTIQUE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Ventilation des Charges d'Exploitation
            </h3>
            <div className="space-y-4">
              {expenseBreakdown.map((exp) => (
                <div key={exp.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{exp.category}</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(exp.amount, settings)} ({exp.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${exp.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Recommandation de Gestion</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Les postes de carburant et d'entretien constituent les premières charges variables directes de la flotte. L’application d’une politique de restitution « plein pour plein » systématique et le suivi strict des vidanges préventives permet d’optimiser la marge opérationnelle de 12 à 15%.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-bold">Indicateur Clé : Coût au Kilomètre Moyen</p>
              <p className="text-[11px] text-blue-700">Estimé à ~45 FCFA / km sur l'ensemble de la flotte active.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
