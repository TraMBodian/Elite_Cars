import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  Clock,
  Car,
  Key,
  CalendarCheck2,
  FileText,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Wrench
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

export const DashboardView: React.FC = () => {
  const {
    invoices,
    payments,
    expenses,
    vehicles,
    reservations,
    clients,
    settings,
    setActiveTab,
    setQuickModal,
    openPreviewDoc
  } = useApp();

  const [revenuePeriod, setRevenuePeriod] = useState<'6M' | '12M'>('12M');

  // KPI Calculations
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g., "2026-10"

  // 1. Chiffre d'affaires du mois (Sum of invoice TTC issued this month, excluding cancelled)
  const monthlyInvoices = invoices.filter(
    (inv) => !inv.deletedAt && inv.status !== 'ANNULEE' && inv.issueDate.startsWith(currentMonthPrefix)
  );
  const monthlyRevenue = monthlyInvoices.reduce((acc, inv) => acc + inv.totalTTC, 0);

  // 2. Total encaissé ce mois
  const monthlyPayments = payments.filter(
    (p) => !p.deletedAt && p.date.startsWith(currentMonthPrefix) && (p.paymentType === 'FACTURE' || p.paymentType === 'ENCAISSEMENT_DIRECT')
  );
  const monthlyCashIn = monthlyPayments.reduce((acc, p) => acc + p.amount, 0);

  // 3. Total des impayés (Toutes factures actives avec remainingAmount > 0)
  const activeUnpaidInvoices = invoices.filter(
    (inv) => !inv.deletedAt && inv.status !== 'ANNULEE' && inv.status !== 'PAYEE' && inv.remainingAmount > 0
  );
  const totalUnpaid = activeUnpaidInvoices.reduce((acc, inv) => acc + inv.remainingAmount, 0);

  // 4. Factures en retard (Due date passed + remainingAmount > 0)
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueInvoices = invoices.filter(
    (inv) => !inv.deletedAt && inv.status !== 'ANNULEE' && inv.remainingAmount > 0 && inv.dueDate < todayStr
  );
  const totalOverdueAmount = overdueInvoices.reduce((acc, inv) => acc + inv.remainingAmount, 0);

  // 5. Locations actives
  const activeRentals = reservations.filter((r) => !r.deletedAt && r.status === 'ACTIVE');

  // 6. Flotte status breakdown
  const availableVehicles = vehicles.filter((v) => !v.deletedAt && v.status === 'DISPONIBLE');
  const rentedVehicles = vehicles.filter((v) => !v.deletedAt && v.status === 'LOUE');
  const maintenanceVehicles = vehicles.filter((v) => !v.deletedAt && v.status === 'MAINTENANCE');
  const totalFleet = vehicles.filter((v) => !v.deletedAt).length;

  // Flotte occupancy rate
  const occupancyRate = totalFleet > 0 ? Math.round((rentedVehicles.length / totalFleet) * 100) : 0;

  // 7. Graphique des revenus (12 mois simulés / réels)
  const monthsList = [
    { label: 'Nov 25', key: '2025-11', amount: 3200000 },
    { label: 'Déc 25', key: '2025-12', amount: 4800000 },
    { label: 'Jan 26', key: '2026-01', amount: 3900000 },
    { label: 'Fév 26', key: '2026-02', amount: 4200000 },
    { label: 'Mar 26', key: '2026-03', amount: 4600000 },
    { label: 'Avr 26', key: '2026-04', amount: 5100000 },
    { label: 'Mai 26', key: '2026-05', amount: 4900000 },
    { label: 'Juin 26', key: '2026-06', amount: 5400000 },
    { label: 'Juil 26', key: '2026-07', amount: 6200000 },
    { label: 'Août 26', key: '2026-08', amount: 7100000 },
    { label: 'Sep 26', key: '2026-09', amount: 5800000 },
    {
      label: 'Oct 26',
      key: '2026-10',
      amount: monthlyRevenue > 0 ? monthlyRevenue : 2200700,
    },
  ];

  const displayedMonths = revenuePeriod === '6M' ? monthsList.slice(-6) : monthsList;
  const maxRevenue = Math.max(...displayedMonths.map((m) => m.amount), 1);

  // 8. Dépenses par catégorie ce mois
  const categoryLabels: Record<string, string> = {
    CARBURANT: 'Carburant',
    ENTRETIEN: 'Entretien & Révision',
    REPARATION: 'Réparations',
    ASSURANCE: 'Assurance flotte',
    AMENDE: 'Amendes',
    SALAIRE: 'Salaires & Commissions',
    LOYER: 'Loyer Agence',
    TAXE: 'Taxes & Impôts',
    DIVERS: 'Divers',
  };

  const categoryTotals: Record<string, number> = {};
  expenses
    .filter((e) => !e.deletedAt)
    .forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amountTTC;
    });

  const totalAllExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Urgent vehicle expirations
  const vehicleAlerts = vehicles.filter((v) => {
    if (v.deletedAt) return false;
    return v.insuranceExpiry <= todayStr || v.technicalInspectionExpiry <= todayStr;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if overdue invoices or maintenance exist */}
      {(overdueInvoices.length > 0 || vehicleAlerts.length > 0) && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Points d’attention prioritaires nécessitant une action
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {overdueInvoices.length} facture(s) en retard d’un montant de{' '}
                <span className="font-semibold text-rose-700">
                  {formatCurrency(totalOverdueAmount, settings)}
                </span>
                {vehicleAlerts.length > 0 && ` et ${vehicleAlerts.length} véhicule(s) avec visites ou assurances à renouveler.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('factures')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition"
            >
              Voir les impayés
            </button>
            {vehicleAlerts.length > 0 && (
              <button
                onClick={() => setActiveTab('vehicules')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
              >
                Alertes flotte
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: CA du mois */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chiffre d’affaires (Mois)
            </span>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(monthlyRevenue, settings)}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>{monthlyInvoices.length} facture(s) émises en cours</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Encaissé */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Encaissé (Mois)
            </span>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(monthlyCashIn, settings)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {monthlyPayments.length} règlement(s) perçus (Wave, Virements)
            </p>
          </div>
        </div>

        {/* KPI 3: Total des Impayés */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Créances & Impayés
            </span>
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-rose-700 tracking-tight">
              {formatCurrency(totalUnpaid, settings)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Dont <span className="font-semibold text-rose-600">{overdueInvoices.length}</span> en retard d’échéance
            </p>
          </div>
        </div>

        {/* KPI 4: Flotte & Locations Actives */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Occupation Flotte
            </span>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Car className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-900 tracking-tight">{occupancyRate}%</p>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {activeRentals.length} loués
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span className="text-emerald-700 font-medium">{availableVehicles.length} libres</span>
              <span className="text-amber-700 font-medium">{maintenanceVehicles.length} maintenance</span>
              <span>{totalFleet} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Charts (Revenus & Dépenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Évolution des Revenus</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chiffre d’affaires facturé mensuel (en {settings.currencySymbol})
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setRevenuePeriod('6M')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  revenuePeriod === '6M' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                6 mois
              </button>
              <button
                onClick={() => setRevenuePeriod('12M')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  revenuePeriod === '12M' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                12 mois
              </button>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-56 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2">
            {displayedMonths.map((m) => {
              const heightPercent = Math.max(12, Math.round((m.amount / maxRevenue) * 100));
              const isCurrent = m.key === currentMonthPrefix;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(m.amount / 1000000).toFixed(1)}M
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 relative ${
                      isCurrent
                        ? 'bg-blue-600 group-hover:bg-blue-700 shadow-xs'
                        : 'bg-slate-200 group-hover:bg-blue-400'
                    }`}
                  />
                  <span className={`text-[11px] truncate ${isCurrent ? 'font-bold text-blue-700' : 'text-slate-500'}`}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Moyenne mensuelle : ~4 800 000 FCFA</span>
            <button
              onClick={() => setActiveTab('rapports')}
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>Voir le rapport complet</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Expenses by Category Breakdown (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Répartition des Dépenses</h3>
              <p className="text-xs text-slate-500 mt-0.5">Par catégorie d’imputation</p>
            </div>
            <button
              onClick={() => setActiveTab('depenses')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Gérer
            </button>
          </div>

          <div className="space-y-3 my-2">
            {sortedCategories.slice(0, 5).map(([catKey, amount]) => {
              const percent = Math.round((amount / totalAllExpenses) * 100);
              const colorMaps: Record<string, string> = {
                CARBURANT: 'bg-amber-500',
                ENTRETIEN: 'bg-blue-600',
                REPARATION: 'bg-rose-500',
                ASSURANCE: 'bg-indigo-600',
                SALAIRE: 'bg-emerald-600',
                LOYER: 'bg-purple-600',
              };
              const color = colorMaps[catKey] || 'bg-slate-500';

              return (
                <div key={catKey} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {categoryLabels[catKey] || catKey}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(amount, settings)} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total des charges :</span>
            <span className="text-sm font-bold text-slate-900">
              {formatCurrency(totalAllExpenses, settings)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Activity (Factures, Paiements, Réservations) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dernières factures */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Dernières Factures</h4>
            </div>
            <button
              onClick={() => setActiveTab('factures')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Tout voir
            </button>
          </div>

          <div className="divide-y divide-slate-100 my-2">
            {invoices.slice(0, 4).map((inv) => {
              const client = clients.find((c) => c.id === inv.clientId);
              return (
                <div
                  key={inv.id}
                  onClick={() => openPreviewDoc('INVOICE', inv)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition"
                >
                  <div className="overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{inv.number}</span>
                      <StatusBadge status={inv.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {client?.fullName || 'Client'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">
                      {formatCurrency(inv.totalTTC, settings)}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(inv.issueDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setQuickModal('INVOICE')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
          >
            + Nouvelle Facture
          </button>
        </div>

        {/* Derniers encaissements */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Derniers Paiements</h4>
            </div>
            <button
              onClick={() => setActiveTab('paiements')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
            >
              Tout voir
            </button>
          </div>

          <div className="divide-y divide-slate-100 my-2">
            {payments.slice(0, 4).map((p) => {
              const client = clients.find((c) => c.id === p.clientId);
              return (
                <div
                  key={p.id}
                  onClick={() => openPreviewDoc('RECEIPT', p)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-xs text-slate-900">{p.receiptNumber}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {client?.fullName} • <span className="font-medium text-slate-700">{p.paymentMethod}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-700">
                      +{formatCurrency(p.amount, settings)}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(p.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setQuickModal('PAYMENT')}
            className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition"
          >
            + Encaisser un paiement
          </button>
        </div>

        {/* Dernières réservations */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Réservations Récentes</h4>
            </div>
            <button
              onClick={() => setActiveTab('reservations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Tout voir
            </button>
          </div>

          <div className="divide-y divide-slate-100 my-2">
            {reservations.slice(0, 4).map((res) => {
              const client = clients.find((c) => c.id === res.clientId);
              const vehicle = vehicles.find((v) => v.id === res.vehicleId);
              return (
                <div
                  key={res.id}
                  onClick={() => openPreviewDoc('CONTRACT', res)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition"
                >
                  <div className="overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{res.reference}</span>
                      <StatusBadge status={res.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {client?.fullName} • {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">
                      {formatCurrency(res.totalEstimatedAmount, settings)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDate(res.startDate)} → {formatDate(res.endDate)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setQuickModal('RESERVATION')}
            className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 transition"
          >
            + Nouvelle Réservation
          </button>
        </div>
      </div>
    </div>
  );
};
