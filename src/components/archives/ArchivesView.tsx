import React, { useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  Car,
  CreditCard,
  FileText,
  RotateCcw,
  Search,
  Users,
  Receipt,
  CalendarCheck2,
  Eye,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Client, Expense, Invoice, Payment, Reservation, UserRole, Vehicle } from '../../types';
import { canAccessTab } from '../../utils/permissions';
import { exportToCSV, formatCurrency, formatDate } from '../../utils/formatters';

type ArchiveKind = 'FACTURE' | 'PAIEMENT' | 'DEPENSE' | 'RESERVATION' | 'CLIENT' | 'VEHICULE';
type ArchiveFilter = 'ALL' | ArchiveKind;

type ArchiveEntry =
  | { kind: 'FACTURE'; id: string; reference: string; description: string; date: string; status: string; deletedAt?: string | null; record: Invoice }
  | { kind: 'PAIEMENT'; id: string; reference: string; description: string; date: string; status: string; deletedAt?: string | null; record: Payment }
  | { kind: 'DEPENSE'; id: string; reference: string; description: string; date: string; status: string; deletedAt?: string | null; record: Expense }
  | { kind: 'RESERVATION'; id: string; reference: string; description: string; date: string; status: string; deletedAt?: string | null; record: Reservation }
  | { kind: 'CLIENT'; id: string; reference: string; description: string; date: string; status: string; deletedAt?: string | null; record: Client }
  | { kind: 'VEHICULE'; id: string; reference: string; description: string; date: string; status: string; deletedAt?: string | null; record: Vehicle };

const kindLabels: Record<ArchiveKind, string> = {
  FACTURE: 'Facture',
  PAIEMENT: 'Paiement / reçu',
  DEPENSE: 'Dépense',
  RESERVATION: 'Réservation / contrat',
  CLIENT: 'Client',
  VEHICULE: 'Véhicule',
};

const kindIcons: Record<ArchiveKind, React.FC<{ className?: string }>> = {
  FACTURE: FileText,
  PAIEMENT: CreditCard,
  DEPENSE: Receipt,
  RESERVATION: CalendarCheck2,
  CLIENT: Users,
  VEHICULE: Car,
};

const canRestoreEntry = (role: UserRole, kind: ArchiveKind): boolean => {
  if (role === 'ADMIN') return kind !== 'PAIEMENT';
  if (role === 'ACCOUNTANT') return kind === 'CLIENT' || kind === 'FACTURE' || kind === 'DEPENSE';
  if (role === 'MANAGER') return kind === 'CLIENT' || kind === 'VEHICULE' || kind === 'RESERVATION';
  return role === 'EMPLOYEE' && kind === 'RESERVATION';
};

const isOlderThanOneYear = (date: string): boolean => {
  if (!date) return false;
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return timestamp < cutoff.getTime();
};

const isArchivedEntry = (entry: ArchiveEntry): boolean => {
  if (entry.deletedAt) return true;
  if (entry.kind === 'FACTURE') return entry.record.status === 'ANNULEE' || isOlderThanOneYear(entry.date);
  if (entry.kind === 'RESERVATION') {
    return entry.record.status === 'TERMINEE' || entry.record.status === 'ANNULEE' || isOlderThanOneYear(entry.date);
  }
  return isOlderThanOneYear(entry.date);
};

export const ArchivesView: React.FC = () => {
  const {
    clients,
    vehicles,
    reservations,
    invoices,
    payments,
    expenses,
    currentUser,
    settings,
    showToast,
    restoreClient,
    restoreVehicle,
    restoreReservation,
    restoreInvoice,
    restoreExpense,
    openPreviewDoc,
  } = useApp();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<ArchiveFilter>('ALL');

  const accessibleKinds = useMemo(() => {
    const kinds: ArchiveKind[] = [];
    if (canAccessTab(currentUser.role, 'factures')) kinds.push('FACTURE');
    if (canAccessTab(currentUser.role, 'paiements')) kinds.push('PAIEMENT');
    if (canAccessTab(currentUser.role, 'depenses')) kinds.push('DEPENSE');
    if (canAccessTab(currentUser.role, 'reservations')) kinds.push('RESERVATION');
    if (canAccessTab(currentUser.role, 'clients')) kinds.push('CLIENT');
    if (canAccessTab(currentUser.role, 'vehicules')) kinds.push('VEHICULE');
    return kinds;
  }, [currentUser.role]);

  const entries = useMemo<ArchiveEntry[]>(() => {
    const rows: ArchiveEntry[] = [];
    if (accessibleKinds.includes('FACTURE')) {
      invoices.forEach((record) => rows.push({
        kind: 'FACTURE',
        id: record.id,
        reference: record.number,
        description: `Facture client · ${clients.find((client) => client.id === record.clientId)?.fullName ?? 'Client'}`,
        date: record.issueDate,
        status: record.status,
        deletedAt: record.deletedAt,
        record,
      }));
    }
    if (accessibleKinds.includes('PAIEMENT')) {
      payments.forEach((record) => rows.push({
        kind: 'PAIEMENT',
        id: record.id,
        reference: record.receiptNumber,
        description: `Reçu de paiement · ${clients.find((client) => client.id === record.clientId)?.fullName ?? 'Client'}`,
        date: record.date,
        status: record.paymentType,
        deletedAt: record.deletedAt,
        record,
      }));
    }
    if (accessibleKinds.includes('DEPENSE')) {
      expenses.forEach((record) => rows.push({
        kind: 'DEPENSE',
        id: record.id,
        reference: record.reference,
        description: `${record.category} · ${record.description} · ${record.vendorName}`,
        date: record.date,
        status: 'Enregistrée',
        deletedAt: record.deletedAt,
        record,
      }));
    }
    if (accessibleKinds.includes('RESERVATION')) {
      reservations.forEach((record) => rows.push({
        kind: 'RESERVATION',
        id: record.id,
        reference: record.reference,
        description: `Location · ${clients.find((client) => client.id === record.clientId)?.fullName ?? 'Client'}`,
        date: record.startDate,
        status: record.status,
        deletedAt: record.deletedAt,
        record,
      }));
    }
    if (accessibleKinds.includes('CLIENT')) {
      clients.forEach((record) => rows.push({
        kind: 'CLIENT',
        id: record.id,
        reference: record.companyName || record.fullName,
        description: record.type === 'ENTREPRISE' ? 'Client entreprise' : 'Client particulier',
        date: record.createdAt,
        status: record.type,
        deletedAt: record.deletedAt,
        record,
      }));
    }
    if (accessibleKinds.includes('VEHICULE')) {
      vehicles.forEach((record) => rows.push({
        kind: 'VEHICULE',
        id: record.id,
        reference: record.licensePlate,
        description: `${record.brand} ${record.model} · ${record.year}`,
        date: record.createdAt,
        status: record.status,
        deletedAt: record.deletedAt,
        record,
      }));
    }
    return rows.filter(isArchivedEntry).sort((a, b) => b.date.localeCompare(a.date));
  }, [accessibleKinds, clients, expenses, invoices, payments, reservations, vehicles]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return entries.filter((entry) => {
      if (kindFilter !== 'ALL' && entry.kind !== kindFilter) return false;
      if (!query) return true;
      return `${entry.reference} ${entry.description} ${entry.status} ${kindLabels[entry.kind]}`
        .toLocaleLowerCase('fr')
        .includes(query);
    });
  }, [entries, kindFilter, search]);

  const deletedCount = entries.filter((entry) => Boolean(entry.deletedAt)).length;
  const historicalCount = entries.length - deletedCount;

  const handleExport = () => {
    exportToCSV(`archives_elite_cars_${new Date().toISOString().slice(0, 10)}`, filteredEntries.map((entry) => ({
      Type: kindLabels[entry.kind],
      Référence: entry.reference,
      Description: entry.description,
      Date: entry.date,
      Statut: entry.deletedAt ? 'Retiré de la liste active' : entry.status,
      Archivé: entry.deletedAt ? 'Oui' : 'Historique',
    })));
  };

  const handleOpenDocument = (entry: ArchiveEntry) => {
    if (entry.kind === 'FACTURE') openPreviewDoc('INVOICE', entry.record);
    else if (entry.kind === 'PAIEMENT') openPreviewDoc('RECEIPT', entry.record);
    else if (entry.kind === 'RESERVATION') openPreviewDoc('CONTRACT', entry.record);
    else showToast('Aperçu disponible pour les factures, reçus et contrats.', 'info');
  };

  const handleRestore = (entry: ArchiveEntry) => {
    if (!entry.deletedAt) return;
    switch (entry.kind) {
      case 'CLIENT':
        restoreClient(entry.id);
        break;
      case 'VEHICULE':
        restoreVehicle(entry.id);
        break;
      case 'RESERVATION':
        restoreReservation(entry.id);
        break;
      case 'FACTURE':
        restoreInvoice(entry.id);
        break;
      case 'DEPENSE':
        restoreExpense(entry.id);
        break;
      case 'PAIEMENT':
        showToast('Un paiement annulé reste conservé dans l’historique et ne peut pas être réactivé.', 'warning');
        break;
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Archives et historique</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                Les factures et documents de plus d’un an, les locations terminées, les factures annulées
                et les éléments retirés restent consultables ici. Rien n’est effacé définitivement.
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter la liste
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Éléments consultables</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{entries.length}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Anciens documents / historique</p>
            <p className="mt-2 text-2xl font-black text-amber-900">{historicalCount}</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Retirés, restaurables</p>
            <p className="mt-2 text-2xl font-black text-blue-900">{deletedCount}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une référence, un client…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as ArchiveFilter)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="ALL">Tous les types ({entries.length})</option>
            {accessibleKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabels[kind]} ({entries.filter((entry) => entry.kind === kind).length})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Type / Référence</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const Icon = kindIcons[entry.kind];
                const isDeleted = Boolean(entry.deletedAt);
                const amount = entry.kind === 'FACTURE'
                  ? formatCurrency(entry.record.totalTTC, settings)
                  : entry.kind === 'PAIEMENT'
                    ? formatCurrency(entry.record.amount, settings)
                    : entry.kind === 'DEPENSE'
                      ? formatCurrency(entry.record.amountTTC, settings)
                      : null;
                return (
                  <tr key={`${entry.kind}-${entry.id}`} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`rounded-lg p-2 ${isDeleted ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{entry.reference}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{kindLabels[entry.kind]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-sm truncate font-medium text-slate-700">{entry.description}</p>
                      {amount && <p className="mt-1 text-[10px] text-slate-400">{amount}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        isDeleted ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {isDeleted ? 'Retiré de la liste active' : entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {(entry.kind === 'FACTURE' || entry.kind === 'PAIEMENT' || entry.kind === 'RESERVATION') && (
                          <button
                            onClick={() => handleOpenDocument(entry)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                            title="Consulter le document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {isDeleted && canRestoreEntry(currentUser.role, entry.kind) && (
                          <button
                            onClick={() => handleRestore(entry)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
                            title="Restaurer dans la liste active"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurer
                          </button>
                        )}
                        {isDeleted && !canRestoreEntry(currentUser.role, entry.kind) && (
                          <span className="text-[10px] text-slate-400">
                            {entry.kind === 'PAIEMENT' ? 'Historique conservé' : 'Restauration non autorisée'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-600">Aucun élément dans cette archive</p>
                    <p className="mt-1 text-xs text-slate-400">Les documents anciens et éléments retirés apparaîtront ici.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
          {filteredEntries.length} élément(s) affiché(s) · Les reçus de paiement annulés sont conservés pour l’historique et ne sont pas réactivables.
        </div>
      </section>
    </div>
  );
};
