import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Car,
  Search,
  Plus,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Fuel,
  Gauge,
  Edit,
  Trash2,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { Vehicle, VehicleStatus, VehicleCategory, FuelType, TransmissionType } from '../../types';
import { formatCurrency, formatDate, exportToCSV, isDateExpiredOrSoon } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

export const VehiclesView: React.FC = () => {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle, reservations, expenses, settings, openPreviewDoc } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VehicleStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | VehicleCategory>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    licensePlate: '',
    year: 2024,
    category: 'SUV' as VehicleCategory,
    transmission: 'AUTOMATIQUE' as TransmissionType,
    fuel: 'DIESEL' as FuelType,
    seats: 5,
    currentMileage: 25000,
    dailyRate: 45000,
    weeklyRate: 280000,
    monthlyRate: 950000,
    depositAmount: 200000,
    status: 'DISPONIBLE' as VehicleStatus,
    color: 'Noir',
    insuranceExpiry: '2027-01-01',
    insuranceCompany: 'AXA Assurances',
    technicalInspectionExpiry: '2026-12-31',
    lastOilChangeMileage: 20000,
    nextOilChangeMileage: 30000,
    notes: '',
  });

  const activeVehicles = useMemo(() => {
    return vehicles.filter((v) => !v.deletedAt);
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return activeVehicles.filter((v) => {
      const matchSearch =
        v.brand.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase()) ||
        v.licensePlate.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchCategory = categoryFilter === 'ALL' || v.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [activeVehicles, search, statusFilter, categoryFilter]);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      brand: '',
      model: '',
      licensePlate: '',
      year: new Date().getFullYear(),
      category: 'BERLINE',
      transmission: 'AUTOMATIQUE',
      fuel: 'ESSENCE',
      seats: 5,
      currentMileage: 10000,
      dailyRate: 40000,
      weeklyRate: 240000,
      monthlyRate: 850000,
      depositAmount: 150000,
      status: 'DISPONIBLE',
      color: 'Gris',
      insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      insuranceCompany: 'Sunu Assurances',
      technicalInspectionExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lastOilChangeMileage: 10000,
      nextOilChangeMileage: 20000,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      brand: v.brand,
      model: v.model,
      licensePlate: v.licensePlate,
      year: v.year,
      category: v.category,
      transmission: v.transmission,
      fuel: v.fuel,
      seats: v.seats,
      currentMileage: v.currentMileage,
      dailyRate: v.dailyRate,
      weeklyRate: v.weeklyRate,
      monthlyRate: v.monthlyRate,
      depositAmount: v.depositAmount,
      status: v.status,
      color: v.color || '',
      insuranceExpiry: v.insuranceExpiry,
      insuranceCompany: v.insuranceCompany,
      technicalInspectionExpiry: v.technicalInspectionExpiry,
      lastOilChangeMileage: v.lastOilChangeMileage,
      nextOilChangeMileage: v.nextOilChangeMileage,
      notes: v.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand.trim() || !formData.model.trim() || !formData.licensePlate.trim()) return;

    if (editingVehicle) {
      updateVehicle(editingVehicle.id, formData);
    } else {
      addVehicle(formData);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const rows = filteredVehicles.map((v) => ({
      Marque: v.brand,
      Modèle: v.model,
      Immatriculation: v.licensePlate,
      Catégorie: v.category,
      Statut: v.status,
      Kilométrage: v.currentMileage,
      'Tarif Jour (FCFA)': v.dailyRate,
      'Tarif Semaine (FCFA)': v.weeklyRate,
      'Tarif Mois (FCFA)': v.monthlyRate,
      'Caution (FCFA)': v.depositAmount,
      'Assurance Expiration': v.insuranceExpiry,
      'Visite Technique Expiration': v.technicalInspectionExpiry,
      'Prochaine Vidange (km)': v.nextOilChangeMileage,
    }));
    exportToCSV(`flotte_vehicules_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher marque, immatriculation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
          >
            <option value="ALL">Tous les statuts ({activeVehicles.length})</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="LOUE">Actuellement loués</option>
            <option value="MAINTENANCE">En maintenance</option>
            <option value="HORS_SERVICE">Hors service</option>
          </select>

          {/* Category selector */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
          >
            <option value="ALL">Toutes catégories</option>
            <option value="SUV">SUV</option>
            <option value="BERLINE">Berline</option>
            <option value="CITADINE">Citadine</option>
            <option value="PICKUP">Pick-up</option>
            <option value="UTILITAIRE">Utilitaire</option>
            <option value="LUXE">Luxe</option>
          </select>

          {/* Grid / Table toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-md ${viewMode === 'GRID' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400'}`}
              title="Vue Grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-md ${viewMode === 'TABLE' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400'}`}
              title="Vue Tableau"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter Véhicule</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => {
            const insAlert = isDateExpiredOrSoon(v.insuranceExpiry, 15);
            const techAlert = isDateExpiredOrSoon(v.technicalInspectionExpiry, 15);
            const oilDue = v.currentMileage >= v.nextOilChangeMileage - 1000;

            return (
              <div
                key={v.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                {/* Image & Badges */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={
                      v.imageUrl ||
                      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={`${v.brand} ${v.model}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-md shadow-xs">
                    {v.licensePlate}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-bold text-slate-900 text-base">{v.brand} {v.model}</h3>
                      <span className="text-xs text-slate-400 font-medium">{v.year}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5 text-slate-400" />
                        {v.currentMileage.toLocaleString('fr-FR')} km
                      </span>
                      <span>•</span>
                      <span>{v.transmission}</span>
                      <span>•</span>
                      <span>{v.fuel}</span>
                    </div>

                    {/* Rates block */}
                    <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Tarif / Jour</p>
                        <p className="text-sm font-bold text-blue-700">
                          {formatCurrency(v.dailyRate, settings)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Caution</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatCurrency(v.depositAmount, settings)}
                        </p>
                      </div>
                    </div>

                    {/* Administrative & Technical Alerts */}
                    <div className="mt-3 space-y-1">
                      {insAlert.expired ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Assurance EXPIRÉE ({v.insuranceCompany})</span>
                        </div>
                      ) : insAlert.soon ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Assurance expire dans {insAlert.daysRemaining}j</span>
                        </div>
                      ) : null}

                      {techAlert.expired ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Visite Technique EXPIRÉE !</span>
                        </div>
                      ) : null}

                      {oilDue && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          <Wrench className="h-3 w-3 shrink-0" />
                          <span>Vidange imminente ({v.nextOilChangeMileage} km)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedVehicle(v)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Fiche & Entretien</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                        title="Modifier"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Retirer le véhicule ${v.brand} ${v.model} (${v.licensePlate}) ?`)) {
                            deleteVehicle(v.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Véhicule</th>
                  <th className="py-3 px-4">Immatriculation</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Kilométrage</th>
                  <th className="py-3 px-4">Tarif Jour</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Contrôle / Assurance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <Car className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 cursor-pointer hover:text-blue-600"
                             onClick={() => setSelectedVehicle(v)}>
                            {v.brand} {v.model}
                          </p>
                          <p className="text-[10px] text-slate-400">{v.year} • {v.fuel}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {v.licensePlate}
                    </td>

                    <td className="py-3.5 px-4 font-medium">{v.category}</td>

                    <td className="py-3.5 px-4">{v.currentMileage.toLocaleString('fr-FR')} km</td>

                    <td className="py-3.5 px-4 font-bold text-blue-700">
                      {formatCurrency(v.dailyRate, settings)}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={v.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[11px] space-y-0.5">
                        <p>Assur. : {formatDate(v.insuranceExpiry)}</p>
                        <p>Visite : {formatDate(v.technicalInspectionExpiry)}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedVehicle(v)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer ${v.brand} ${v.model} ?`)) {
                              deleteVehicle(v.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Vehicle */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVehicle ? 'Modifier le Véhicule' : 'Ajouter un Véhicule'}
        subtitle="Caractéristiques techniques, tarifs de location et suivi réglementaire"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marque *</label>
              <input
                type="text"
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Ex: Toyota"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modèle *</label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: Prado TX-L"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Immatriculation *</label>
              <input
                type="text"
                required
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                placeholder="DK-0000-AA"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="SUV">SUV</option>
                <option value="BERLINE">Berline</option>
                <option value="CITADINE">Citadine</option>
                <option value="PICKUP">Pick-up</option>
                <option value="UTILITAIRE">Utilitaire</option>
                <option value="LUXE">Luxe</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Boîte</label>
              <select
                value={formData.transmission}
                onChange={(e) => setFormData({ ...formData, transmission: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="AUTOMATIQUE">Automatique</option>
                <option value="MANUELLE">Manuelle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Carburant</label>
              <select
                value={formData.fuel}
                onChange={(e) => setFormData({ ...formData, fuel: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="DIESEL">Diesel</option>
                <option value="ESSENCE">Essence</option>
                <option value="HYBRIDE">Hybride</option>
                <option value="ELECTRIQUE">Électrique</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Statut initial</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              >
                <option value="DISPONIBLE">Disponible</option>
                <option value="LOUE">Loué</option>
                <option value="MAINTENANCE">En maintenance</option>
                <option value="HORS_SERVICE">Hors service</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Tarif / Jour (FCFA) *</label>
              <input
                type="number"
                required
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Tarif Semaine</label>
              <input
                type="number"
                value={formData.weeklyRate}
                onChange={(e) => setFormData({ ...formData, weeklyRate: Number(e.target.value) })}
                className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Tarif Mois</label>
              <input
                type="number"
                value={formData.monthlyRate}
                onChange={(e) => setFormData({ ...formData, monthlyRate: Number(e.target.value) })}
                className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Caution (FCFA)</label>
              <input
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fin Assurance</label>
              <input
                type="date"
                required
                value={formData.insuranceExpiry}
                onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cie d'Assurance</label>
              <input
                type="text"
                value={formData.insuranceCompany}
                onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                placeholder="AXA, Sunu..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fin Visite Technique</label>
              <input
                type="date"
                required
                value={formData.technicalInspectionExpiry}
                onChange={(e) => setFormData({ ...formData, technicalInspectionExpiry: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kilométrage actuel (km)</label>
              <input
                type="number"
                value={formData.currentMileage}
                onChange={(e) => setFormData({ ...formData, currentMileage: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prochaine Vidange (km)</label>
              <input
                type="number"
                value={formData.nextOilChangeMileage}
                onChange={(e) => setFormData({ ...formData, nextOilChangeMileage: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
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
              {editingVehicle ? 'Enregistrer les modifications' : 'Ajouter le véhicule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detailed Vehicle History & Costs */}
      {selectedVehicle && (
        <Modal
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          title={`Fiche Véhicule : ${selectedVehicle.brand} ${selectedVehicle.model}`}
          subtitle={`Immatriculation : ${selectedVehicle.licensePlate} | Statut : ${selectedVehicle.status}`}
          maxWidth="4xl"
        >
          {(() => {
            const vehicleRentals = reservations.filter(
              (r) => r.vehicleId === selectedVehicle.id && !r.deletedAt
            );
            const vehicleExpenses = expenses.filter(
              (e) => e.vehicleId === selectedVehicle.id && !e.deletedAt
            );

            const totalEarned = vehicleRentals.reduce(
              (acc, r) => acc + r.totalEstimatedAmount,
              0
            );
            const totalCosts = vehicleExpenses.reduce((acc, e) => acc + e.amountTTC, 0);
            const netProfit = totalEarned - totalCosts;

            return (
              <div className="space-y-6">
                {/* Financial KPI of vehicle */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-800 font-semibold uppercase">Revenus Générés</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {formatCurrency(totalEarned, settings)}
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5">{vehicleRentals.length} locations réalisées</p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-800 font-semibold uppercase">Coûts & Entretiens</p>
                    <p className="text-xl font-bold text-amber-900 mt-1">
                      {formatCurrency(totalCosts, settings)}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">{vehicleExpenses.length} dépenses imputées</p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-emerald-800 font-semibold uppercase">Marge Nette Véhicule</p>
                    <p className="text-xl font-bold text-emerald-800 mt-1">
                      {formatCurrency(netProfit, settings)}
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">Rentabilité directe</p>
                  </div>
                </div>

                {/* Technical Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-500 font-medium">Assurance :</p>
                    <p className="font-bold text-slate-800">{selectedVehicle.insuranceCompany}</p>
                    <p className="text-[11px] text-slate-600">Expire le {formatDate(selectedVehicle.insuranceExpiry)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Visite Technique :</p>
                    <p className="font-bold text-slate-800">Contrôle périodique</p>
                    <p className="text-[11px] text-slate-600">Expire le {formatDate(selectedVehicle.technicalInspectionExpiry)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Vidange :</p>
                    <p className="font-bold text-slate-800">Dernière : {selectedVehicle.lastOilChangeMileage} km</p>
                    <p className="text-[11px] text-blue-700 font-medium">Prochaine : {selectedVehicle.nextOilChangeMileage} km</p>
                  </div>
                </div>

                {/* History of rentals */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Historique des Locations</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Réf. Contrat</th>
                          <th className="py-2 px-3">Période</th>
                          <th className="py-2 px-3 text-right">Montant</th>
                          <th className="py-2 px-3 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vehicleRentals.map((r) => (
                          <tr
                            key={r.id}
                            onClick={() => openPreviewDoc('CONTRACT', r)}
                            className="hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="py-2 px-3 font-bold text-blue-600">{r.reference}</td>
                            <td className="py-2 px-3">
                              {formatDate(r.startDate)} → {formatDate(r.endDate)} ({r.totalDays}j)
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {formatCurrency(r.totalEstimatedAmount, settings)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <StatusBadge status={r.status} size="sm" />
                            </td>
                          </tr>
                        ))}
                        {vehicleRentals.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400">
                              Aucune location enregistrée pour ce véhicule.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
