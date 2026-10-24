import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calculator,
  Search,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';

export const AccountingView: React.FC = () => {
  const { payments, expenses, invoices, settings } = useApp();

  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR'>('THIS_MONTH');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECETTE' | 'DEPENSE'>('ALL');
  const [search, setSearch] = useState('');

  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const currentYear = new Date().toISOString().slice(0, 4); // "2026"

  // Unified financial transaction stream (Encaissements + Décaissements)
  const unifiedTransactions = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: 'RECETTE' | 'DEPENSE';
      reference: string;
      description: string;
      amountHT: number;
      taxAmount: number;
      amountTTC: number;
      paymentMethod: string;
    }[] = [];

    // 1. Payments received
    payments
      .filter((p) => !p.deletedAt && (p.paymentType === 'FACTURE' || p.paymentType === 'ENCAISSEMENT_DIRECT'))
      .forEach((p) => {
        const inv = invoices.find((i) => i.id === p.invoiceId);
        list.push({
          id: p.id,
          date: p.date,
          type: 'RECETTE',
          reference: p.receiptNumber,
          description: inv ? `Règlement Facture ${inv.number}` : p.notes || 'Encaissement prestation',
          amountHT: Math.round(p.amount / 1.18),
          taxAmount: Math.round(p.amount - p.amount / 1.18),
          amountTTC: p.amount,
          paymentMethod: p.paymentMethod,
        });
      });

    // 2. Expenses paid
    expenses
      .filter((e) => !e.deletedAt)
      .forEach((e) => {
        list.push({
          id: e.id,
          date: e.date,
          type: 'DEPENSE',
          reference: e.reference,
          description: `${e.category} - ${e.description} (${e.vendorName})`,
          amountHT: e.amountHT,
          taxAmount: e.isDeductibleTax ? e.amountTax : 0,
          amountTTC: e.amountTTC,
          paymentMethod: e.paymentMethod,
        });
      });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, invoices]);

  // Date filtering
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter((tx) => {
      let matchDate = true;
      if (dateFilter === 'THIS_MONTH') {
        matchDate = tx.date.startsWith(currentMonth);
      } else if (dateFilter === 'THIS_YEAR') {
        matchDate = tx.date.startsWith(currentYear);
      }

      const matchType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchSearch =
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.reference.toLowerCase().includes(search.toLowerCase());

      return matchDate && matchType && matchSearch;
    });
  }, [unifiedTransactions, dateFilter, typeFilter, search, currentMonth, currentYear]);

  // Aggregate Calculations
  const totalEncaissements = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'RECETTE')
      .reduce((acc, t) => acc + t.amountTTC, 0);
  }, [filteredTransactions]);

  const totalDecaissements = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'DEPENSE')
      .reduce((acc, t) => acc + t.amountTTC, 0);
  }, [filteredTransactions]);

  const netCashFlow = totalEncaissements - totalDecaissements;

  // TVA calculation
  const totalTVACollectee = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'RECETTE')
      .reduce((acc, t) => acc + t.taxAmount, 0);
  }, [filteredTransactions]);

  const totalTVADeductible = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'DEPENSE')
      .reduce((acc, t) => acc + t.taxAmount, 0);
  }, [filteredTransactions]);

  const netTVADue = totalTVACollectee - totalTVADeductible;

  const handleExportCSV = () => {
    const rows = filteredTransactions.map((tx) => ({
      Date: tx.date,
      Type: tx.type,
      Référence: tx.reference,
      Libellé: tx.description,
      'Montant HT': tx.amountHT,
      TVA: tx.taxAmount,
      'Montant TTC': tx.amountTTC,
      'Moyen Paiement': tx.paymentMethod,
    }));
    exportToCSV(`journal_tresorerie_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Dashboard Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Encaissements */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Encaissements</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-700">
              {formatCurrency(totalEncaissements, settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Rentrées de trésorerie nettes</p>
          </div>
        </div>

        {/* Décaissements */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Décaissements</span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-rose-700">
              {formatCurrency(totalDecaissements, settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Dépenses et charges réglées</p>
          </div>
        </div>

        {/* Résultat d'exploitation (Cash flow) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Solde Trésorerie Nette</span>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-2xl font-black ${
                netCashFlow >= 0 ? 'text-slate-900' : 'text-rose-700'
              }`}
            >
              {formatCurrency(netCashFlow, settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {netCashFlow >= 0 ? 'Excédent de trésorerie positif' : 'Déficit de trésorerie sur la période'}
            </p>
          </div>
        </div>

        {/* TVA Nette */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">TVA Nette à Reverser</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-blue-800">
              {formatCurrency(Math.max(0, netTVADue), settings)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Collectée : {formatCurrency(totalTVACollectee, settings)} - Déd. : {formatCurrency(totalTVADeductible, settings)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Period Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher libellé, référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Period selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setDateFilter('THIS_MONTH')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                dateFilter === 'THIS_MONTH' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ce mois (Octobre 2026)
            </button>
            <button
              onClick={() => setDateFilter('THIS_YEAR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                dateFilter === 'THIS_YEAR' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Année 2026
            </button>
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                dateFilter === 'ALL' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Historique complet
            </button>
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Toutes les opérations</option>
            <option value="RECETTE">Encaissements (+)</option>
            <option value="DEPENSE">Décaissements (-)</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exporter Journal CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Operations Journal Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Journal Général des Opérations Financières ({filteredTransactions.length} écritures)
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">Grand Livre de Trésorerie</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4">Libellé de l’Écriture</th>
                <th className="py-3 px-4">Moyen</th>
                <th className="py-3 px-4 text-right">Montant HT</th>
                <th className="py-3 px-4 text-right">TVA</th>
                <th className="py-3 px-4 text-right">Débit (Sortie)</th>
                <th className="py-3 px-4 text-right">Crédit (Entrée)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTransactions.map((tx) => {
                const isRecette = tx.type === 'RECETTE';
                return (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-sans text-slate-900">{formatDate(tx.date)}</td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">{tx.reference}</td>

                    <td className="py-3.5 px-4 font-sans">
                      <p className="font-semibold text-slate-900">{tx.description}</p>
                    </td>

                    <td className="py-3.5 px-4 font-sans text-slate-600">{tx.paymentMethod}</td>

                    <td className="py-3.5 px-4 text-right">{formatCurrency(tx.amountHT, settings)}</td>

                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {formatCurrency(tx.taxAmount, settings)}
                    </td>

                    {/* Débit: Dépense */}
                    <td className="py-3.5 px-4 text-right font-bold text-rose-700">
                      {!isRecette ? formatCurrency(tx.amountTTC, settings) : '-'}
                    </td>

                    {/* Crédit: Recette */}
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      {isRecette ? formatCurrency(tx.amountTTC, settings) : '-'}
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Aucune transaction sur la période choisie.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Journal Totals Footer */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
              <tr>
                <td colSpan={6} className="py-3 px-4 text-right font-sans uppercase">
                  Totaux de la Période :
                </td>
                <td className="py-3 px-4 text-right text-rose-700 font-mono">
                  {formatCurrency(totalDecaissements, settings)}
                </td>
                <td className="py-3 px-4 text-right text-emerald-700 font-mono">
                  {formatCurrency(totalEncaissements, settings)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
