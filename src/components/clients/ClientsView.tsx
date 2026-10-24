import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Building2,
  User,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  Clock,
  Eye
} from 'lucide-react';
import { Client, ClientType } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

export const ClientsView: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, invoices, reservations, payments, settings, openPreviewDoc } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PARTICULIER' | 'ENTREPRISE'>('ALL');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'PARTICULIER' as ClientType,
    fullName: '',
    companyName: '',
    taxNumber: '',
    rccm: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dakar',
    driverLicenseNumber: '',
    driverLicenseExpiry: '',
    notes: '',
  });

  // Filter clients (exclude soft-deleted)
  const activeClients = useMemo(() => {
    return clients.filter((c) => !c.deletedAt);
  }, [clients]);

  const filteredClients = useMemo(() => {
    return activeClients.filter((c) => {
      const matchSearch =
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase())) ||
        (c.taxNumber && c.taxNumber.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === 'ALL' || c.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [activeClients, search, typeFilter]);

  // Compute stats per client
  const getClientFinancials = (clientId: string) => {
    const clientInvoices = invoices.filter((i) => i.clientId === clientId && !i.deletedAt && i.status !== 'ANNULEE');
    const totalBilled = clientInvoices.reduce((acc, i) => acc + i.totalTTC, 0);
    const totalPaid = clientInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
    const totalUnpaid = clientInvoices.reduce((acc, i) => acc + i.remainingAmount, 0);
    const clientReservations = reservations.filter((r) => r.clientId === clientId && !r.deletedAt);
    return { totalBilled, totalPaid, totalUnpaid, invoiceCount: clientInvoices.length, rentalCount: clientReservations.length };
  };

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      type: 'PARTICULIER',
      fullName: '',
      companyName: '',
      taxNumber: '',
      rccm: '',
      email: '',
      phone: '',
      address: '',
      city: 'Dakar',
      driverLicenseNumber: '',
      driverLicenseExpiry: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      type: client.type,
      fullName: client.fullName,
      companyName: client.companyName || '',
      taxNumber: client.taxNumber || '',
      rccm: client.rccm || '',
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      driverLicenseNumber: client.driverLicenseNumber || '',
      driverLicenseExpiry: client.driverLicenseExpiry || '',
      notes: client.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) return;

    if (editingClient) {
      updateClient(editingClient.id, formData);
    } else {
      addClient(formData);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const rows = filteredClients.map((c) => {
      const fin = getClientFinancials(c.id);
      return {
        Nom: c.fullName,
        Type: c.type,
        Entreprise: c.companyName || '-',
        NINEA: c.taxNumber || '-',
        Téléphone: c.phone,
        Email: c.email,
        Adresse: `${c.address}, ${c.city}`,
        Locations: fin.rentalCount,
        'Facturé Total': fin.totalBilled,
        'Encaissé': fin.totalPaid,
        'Impayé Actuel': fin.totalUnpaid,
      };
    });
    exportToCSV(`clients_elite_cars_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top action and filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher client, NINEA, tél..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filter pills & buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                typeFilter === 'ALL' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tous ({activeClients.length})
            </button>
            <button
              onClick={() => setTypeFilter('ENTREPRISE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                typeFilter === 'ENTREPRISE' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Building2 className="h-3 w-3" />
              <span>Entreprises</span>
            </button>
            <button
              onClick={() => setTypeFilter('PARTICULIER')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                typeFilter === 'PARTICULIER' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <User className="h-3 w-3" />
              <span>Particuliers</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
            title="Exporter la liste en CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nouveau Client</span>
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Client / Entreprise</th>
                <th className="py-3 px-4">Type & NINEA</th>
                <th className="py-3 px-4">Coordonnées</th>
                <th className="py-3 px-4 text-center">Locations</th>
                <th className="py-3 px-4 text-right">Total Facturé</th>
                <th className="py-3 px-4 text-right">Impayés</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => {
                const fin = getClientFinancials(client.id);
                return (
                  <tr key={client.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            client.type === 'ENTREPRISE'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {client.type === 'ENTREPRISE' ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            client.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                             onClick={() => setSelectedClient(client)}>
                            {client.fullName}
                          </p>
                          {client.companyName && client.companyName !== client.fullName && (
                            <p className="text-[11px] text-slate-500 font-medium">{client.companyName}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            client.type === 'ENTREPRISE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {client.type === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}
                        </span>
                        {client.taxNumber ? (
                          <p className="text-[11px] font-mono text-slate-600">NINEA : {client.taxNumber}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400">NINEA non renseigné</p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-slate-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[160px]">{client.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                        {fin.rentalCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(fin.totalBilled, settings)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {fin.totalUnpaid > 0 ? (
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {formatCurrency(fin.totalUnpaid, settings)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                          À jour
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          title="Fiche détaillée & historique"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer le client ${client.fullName} ?`)) {
                              deleteClient(client.id);
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

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    Aucun client ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Client */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Modifier la Fiche Client' : 'Nouveau Client'}
        subtitle="Renseignez les coordonnées et informations fiscales"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type de client *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ClientType })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="PARTICULIER">Particulier (Individu)</option>
                <option value="ENTREPRISE">Entreprise / Société / ONG</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formData.type === 'ENTREPRISE' ? 'Nom du contact / Responsable *' : 'Nom complet *'}
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ex: Bamba Diop ou Mme Ndiaye"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {formData.type === 'ENTREPRISE' && (
            <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div>
                <label className="block text-xs font-semibold text-blue-900 mb-1">Raison Sociale</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Ex: Sonatel SA, Eiffage..."
                  className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-900 mb-1">NINEA / Numéro Fiscal</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  placeholder="Ex: 001249823 2V1"
                  className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+221 77 000 00 00"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@domaine.sn"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: Almadies, Zone 12"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ville</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {formData.type === 'PARTICULIER' && (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro Permis de conduire</label>
                <input
                  type="text"
                  value={formData.driverLicenseNumber}
                  onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value })}
                  placeholder="SN-DKR-2020-XXXX"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date validité permis</label>
                <input
                  type="date"
                  value={formData.driverLicenseExpiry}
                  onChange={(e) => setFormData({ ...formData, driverLicenseExpiry: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes internes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex: Habitudes, préférences de véhicules..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              {editingClient ? 'Enregistrer les modifications' : 'Créer le client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Client Detail & Financial History */}
      {selectedClient && (
        <Modal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={`Fiche Client : ${selectedClient.fullName}`}
          subtitle={`Type: ${selectedClient.type} | N° Fiscal: ${selectedClient.taxNumber || 'Non renseigné'}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Financial summary banner */}
            {(() => {
              const fin = getClientFinancials(selectedClient.id);
              const clientInvoices = invoices.filter(
                (i) => i.clientId === selectedClient.id && !i.deletedAt
              );
              const clientRentals = reservations.filter(
                (r) => r.clientId === selectedClient.id && !r.deletedAt
              );
              const clientPayments = payments.filter(
                (p) => p.clientId === selectedClient.id && !p.deletedAt
              );

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Total Facturé</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {formatCurrency(fin.totalBilled, settings)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{clientInvoices.length} factures</p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs text-emerald-800 font-semibold uppercase">Total Encaissé</p>
                      <p className="text-xl font-bold text-emerald-700 mt-1">
                        {formatCurrency(fin.totalPaid, settings)}
                      </p>
                      <p className="text-[11px] text-emerald-600 mt-0.5">{clientPayments.length} paiements reçus</p>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                      <p className="text-xs text-rose-800 font-semibold uppercase">Reste à Recouvrer</p>
                      <p className="text-xl font-bold text-rose-700 mt-1">
                        {formatCurrency(fin.totalUnpaid, settings)}
                      </p>
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        {fin.totalUnpaid > 0 ? 'Créance client active' : 'Solde équilibré'}
                      </p>
                    </div>
                  </div>

                  {/* Tabs/Lists inside Client Drawer */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Historique des Factures ({clientInvoices.length})</span>
                      </h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">Numéro</th>
                              <th className="py-2 px-3">Émission</th>
                              <th className="py-2 px-3">Échéance</th>
                              <th className="py-2 px-3 text-right">Total TTC</th>
                              <th className="py-2 px-3 text-right">Reste à Payer</th>
                              <th className="py-2 px-3 text-center">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clientInvoices.map((inv) => (
                              <tr
                                key={inv.id}
                                onClick={() => openPreviewDoc('INVOICE', inv)}
                                className="hover:bg-slate-50 cursor-pointer"
                              >
                                <td className="py-2.5 px-3 font-bold text-blue-600">{inv.number}</td>
                                <td className="py-2.5 px-3">{formatDate(inv.issueDate)}</td>
                                <td className="py-2.5 px-3">{formatDate(inv.dueDate)}</td>
                                <td className="py-2.5 px-3 text-right font-medium">
                                  {formatCurrency(inv.totalTTC, settings)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                  {formatCurrency(inv.remainingAmount, settings)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <StatusBadge status={inv.status} size="sm" />
                                </td>
                              </tr>
                            ))}
                            {clientInvoices.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-4 text-center text-slate-400">
                                  Aucune facture pour ce client.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-600" />
                        <span>Locations & Réservations ({clientRentals.length})</span>
                      </h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">Réf.</th>
                              <th className="py-2 px-3">Période</th>
                              <th className="py-2 px-3 text-right">Montant Forfait</th>
                              <th className="py-2 px-3 text-center">Caution</th>
                              <th className="py-2 px-3 text-center">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clientRentals.map((res) => (
                              <tr
                                key={res.id}
                                onClick={() => openPreviewDoc('CONTRACT', res)}
                                className="hover:bg-slate-50 cursor-pointer"
                              >
                                <td className="py-2.5 px-3 font-bold text-slate-900">{res.reference}</td>
                                <td className="py-2.5 px-3">
                                  {formatDate(res.startDate)} → {formatDate(res.endDate)} ({res.totalDays}j)
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold">
                                  {formatCurrency(res.totalEstimatedAmount, settings)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <StatusBadge status={res.depositStatus} size="sm" />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <StatusBadge status={res.status} size="sm" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
};
