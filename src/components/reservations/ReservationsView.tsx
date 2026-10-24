import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CalendarCheck2,
  Search,
  Plus,
  Car,
  User,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  XCircle,
  Download,
  Key,
  Shield,
  Layers
} from 'lucide-react';
import { Reservation, ReservationOption, ReservationStatus } from '../../types';
import { formatCurrency, formatDate, calculateDaysBetween, exportToCSV } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

const AVAILABLE_OPTIONS: { name: string; unitPrice: number; chargeType: 'PAR_JOUR' | 'FIXE' }[] = [
  { name: 'Chauffeur VIP dédié', unitPrice: 15000, chargeType: 'PAR_JOUR' },
  { name: 'Assurance Rachat de Franchise', unitPrice: 10000, chargeType: 'PAR_JOUR' },
  { name: 'Siège bébé confort ISOFIX', unitPrice: 3000, chargeType: 'PAR_JOUR' },
  { name: 'Boîtier Wi-Fi 4G Haut Débit', unitPrice: 3000, chargeType: 'PAR_JOUR' },
  { name: 'Plein de carburant au départ', unitPrice: 45000, chargeType: 'FIXE' },
  { name: 'Livraison / Restitution à domicile', unitPrice: 15000, chargeType: 'FIXE' },
];

export const ReservationsView: React.FC = () => {
  const {
    reservations,
    addReservation,
    updateReservation,
    cancelReservation,
    completeReservation,
    deleteReservation,
    generateInvoiceFromReservation,
    clients,
    vehicles,
    settings,
    openPreviewDoc,
    checkVehicleAvailability,
    currentUser,
    getNextDocumentNumber,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReservationStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [targetReservationToClose, setTargetReservationToClose] = useState<Reservation | null>(null);

  // Return checkout form state
  const [returnKm, setReturnKm] = useState<number>(0);
  const [returnFuel, setReturnFuel] = useState<string>('100%');

  // New reservation form state
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    clientId: '',
    vehicleId: '',
    startDate: today,
    startTime: '09:00',
    endDate: nextWeek,
    endTime: '18:00',
    pickupLocation: 'Agence Centrale Dakar',
    returnLocation: 'Agence Centrale Dakar',
    depositStatus: 'NON_VERSEE' as 'NON_VERSEE' | 'VERSEE',
    discountAmount: 0,
    selectedOptions: [] as ReservationOption[],
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  const activeReservations = useMemo(() => {
    return reservations.filter((r) => !r.deletedAt);
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    return activeReservations.filter((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      const vehicle = vehicles.find((v) => v.id === r.vehicleId);

      const matchSearch =
        r.reference.toLowerCase().includes(search.toLowerCase()) ||
        (client && client.fullName.toLowerCase().includes(search.toLowerCase())) ||
        (vehicle && `${vehicle.brand} ${vehicle.model} ${vehicle.licensePlate}`.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [activeReservations, search, statusFilter, clients, vehicles]);

  // Compute calculated amounts dynamically for modal
  const selectedVehicleObj = vehicles.find((v) => v.id === formData.vehicleId);
  const calculatedDays = calculateDaysBetween(formData.startDate, formData.endDate);

  const baseCalculatedAmount = useMemo(() => {
    if (!selectedVehicleObj) return 0;
    // Applied logic: if >= 30 days -> monthly prorata, if >= 7 days -> weekly prorata, else daily
    if (calculatedDays >= 30) {
      return Math.round((selectedVehicleObj.monthlyRate / 30) * calculatedDays);
    } else if (calculatedDays >= 7) {
      return Math.round((selectedVehicleObj.weeklyRate / 7) * calculatedDays);
    } else {
      return selectedVehicleObj.dailyRate * calculatedDays;
    }
  }, [selectedVehicleObj, calculatedDays]);

  const totalOptionsCalculated = useMemo(() => {
    return formData.selectedOptions.reduce((acc, opt) => acc + opt.totalPrice, 0);
  }, [formData.selectedOptions]);

  const totalEstimatedCalculated = Math.max(
    0,
    baseCalculatedAmount + totalOptionsCalculated - formData.discountAmount
  );

  const handleOpenAdd = () => {
    setFormError(null);
    setFormData({
      clientId: clients[0]?.id || '',
      vehicleId: vehicles.find((v) => v.status === 'DISPONIBLE')?.id || vehicles[0]?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endTime: '18:00',
      pickupLocation: 'Agence Centrale Dakar',
      returnLocation: 'Agence Centrale Dakar',
      depositStatus: 'NON_VERSEE',
      discountAmount: 0,
      selectedOptions: [],
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleToggleOption = (opt: typeof AVAILABLE_OPTIONS[0]) => {
    const existing = formData.selectedOptions.find((o) => o.name === opt.name);
    if (existing) {
      setFormData({
        ...formData,
        selectedOptions: formData.selectedOptions.filter((o) => o.name !== opt.name),
      });
    } else {
      const quantity = opt.chargeType === 'PAR_JOUR' ? calculatedDays : 1;
      const totalPrice = opt.unitPrice * quantity;
      setFormData({
        ...formData,
        selectedOptions: [
          ...formData.selectedOptions,
          {
            id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: opt.name,
            unitPrice: opt.unitPrice,
            quantity,
            totalPrice,
            chargeType: opt.chargeType,
          },
        ],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.clientId || !formData.vehicleId) {
      setFormError('Veuillez sélectionner un client et un véhicule.');
      return;
    }

    if (formData.endDate < formData.startDate) {
      setFormError('La date de retour ne peut pas être antérieure à la date de départ.');
      return;
    }

    // Availability validation check
    const availability = checkVehicleAvailability(formData.vehicleId, formData.startDate, formData.endDate);
    if (!availability.available) {
      setFormError(
        `Ce véhicule est déjà réservé du ${availability.conflictWith?.startDate} au ${availability.conflictWith?.endDate} (Réf: ${availability.conflictWith?.reference}).`
      );
      return;
    }

    const targetVehicle = vehicles.find((v) => v.id === formData.vehicleId);
    let nextRef: string;
    try {
      nextRef = await getNextDocumentNumber('reservation');
    } catch {
      setFormError('Impossible de générer la référence de réservation. Réessayez.');
      return;
    }

    const res = addReservation({
      reference: nextRef,
      clientId: formData.clientId,
      vehicleId: formData.vehicleId,
      startDate: formData.startDate,
      startTime: formData.startTime,
      endDate: formData.endDate,
      endTime: formData.endTime,
      pickupLocation: formData.pickupLocation,
      returnLocation: formData.returnLocation,
      rateTypeApplied: calculatedDays >= 30 ? 'MENSUEL' : calculatedDays >= 7 ? 'HEBDOMADAIRE' : 'JOURNALIER',
      baseRate: targetVehicle?.dailyRate || 0,
      totalDays: calculatedDays,
      options: formData.selectedOptions,
      totalOptionsAmount: totalOptionsCalculated,
      baseAmount: baseCalculatedAmount,
      discountAmount: formData.discountAmount,
      totalEstimatedAmount: totalEstimatedCalculated,
      depositRequired: targetVehicle?.depositAmount || 200000,
      depositStatus: formData.depositStatus,
      startMileage: targetVehicle?.currentMileage,
      fuelLevelStart: '100%',
      status: 'CONFIRMEE',
      contractSigned: false,
      notes: formData.notes,
      createdById: currentUser.id,
    });

    if (res.success) {
      setIsModalOpen(false);
    } else if (res.error) {
      setFormError(res.error);
    }
  };

  const handleStartRental = (res: Reservation) => {
    updateReservation(res.id, {
      status: 'ACTIVE',
      contractSigned: true,
    });
  };

  const handleOpenCloseModal = (res: Reservation) => {
    const v = vehicles.find((veh) => veh.id === res.vehicleId);
    setTargetReservationToClose(res);
    setReturnKm((res.startMileage || v?.currentMileage || 0) + 150);
    setReturnFuel('100%');
    setIsCloseModalOpen(true);
  };

  const handleConfirmClose = () => {
    if (!targetReservationToClose) return;
    completeReservation(targetReservationToClose.id, returnKm, returnFuel);
    setIsCloseModalOpen(false);
    setTargetReservationToClose(null);
  };

  const handleExportCSV = () => {
    const rows = filteredReservations.map((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      const vehicle = vehicles.find((v) => v.id === r.vehicleId);
      return {
        Référence: r.reference,
        Client: client?.fullName || '-',
        Véhicule: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : '-',
        Départ: `${r.startDate} ${r.startTime}`,
        Retour: `${r.endDate} ${r.endTime}`,
        Jours: r.totalDays,
        'Montant Total (FCFA)': r.totalEstimatedAmount,
        Caution: `${r.depositRequired} (${r.depositStatus})`,
        Statut: r.status,
      };
    });
    exportToCSV(`reservations_elite_cars_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher référence, client, véhicule..."
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
            <option value="ALL">Tous les statuts ({activeReservations.length})</option>
            <option value="ACTIVE">En cours (Actives)</option>
            <option value="CONFIRMEE">Confirmées</option>
            <option value="TERMINEE">Terminées</option>
            <option value="EN_ATTENTE">En attente</option>
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
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nouvelle Réservation</span>
          </button>
        </div>
      </div>

      {/* Table of reservations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Réf. Contrat</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Véhicule</th>
                <th className="py-3 px-4">Période & Lieux</th>
                <th className="py-3 px-4 text-right">Montant Estimé</th>
                <th className="py-3 px-4 text-center">Caution</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReservations.map((res) => {
                const client = clients.find((c) => c.id === res.clientId);
                const vehicle = vehicles.find((v) => v.id === res.vehicleId);

                return (
                  <tr key={res.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div>
                        <span
                          onClick={() => openPreviewDoc('CONTRACT', res)}
                          className="font-bold text-blue-600 text-sm hover:underline cursor-pointer"
                        >
                          {res.reference}
                        </span>
                        <p className="text-[10px] text-slate-400">{formatDate(res.createdAt)}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{client?.fullName || 'Client'}</p>
                      <p className="text-[11px] text-slate-500">{client?.phone}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-semibold text-slate-800">
                            {vehicle?.brand} {vehicle?.model}
                          </p>
                          <p className="font-mono text-[10px] text-slate-500 font-bold">{vehicle?.licensePlate}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-900">
                          {formatDate(res.startDate)} → {formatDate(res.endDate)}{' '}
                          <span className="font-bold text-blue-700">({res.totalDays}j)</span>
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          Prise : {res.pickupLocation}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(res.totalEstimatedAmount, settings)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={res.depositStatus} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={res.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Imprimer / Visualiser Contrat */}
                        <button
                          onClick={() => openPreviewDoc('CONTRACT', res)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          title="Imprimer le Contrat Officiel"
                        >
                          <FileText className="h-4 w-4" />
                        </button>

                        {/* Fast Action: Générer la facture */}
                        {!res.invoiceId && res.status !== 'ANNULEE' && (
                          <button
                            onClick={() => generateInvoiceFromReservation(res.id)}
                            className="px-2 py-1 rounded bg-slate-900 text-white font-semibold text-[10px] hover:bg-slate-800 shadow-xs"
                            title="Créer la facture en 1 clic"
                          >
                            + Facture
                          </button>
                        )}

                        {/* Convertir en départ actif */}
                        {res.status === 'CONFIRMEE' && (
                          <button
                            onClick={() => handleStartRental(res)}
                            className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold text-[10px] hover:bg-emerald-700 shadow-xs"
                            title="Remettre les clés & Démarrer la location"
                          >
                            Démarrer
                          </button>
                        )}

                        {/* Clôturer / Restituer */}
                        {res.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleOpenCloseModal(res)}
                            className="px-2 py-1 rounded bg-amber-600 text-white font-semibold text-[10px] hover:bg-amber-700 shadow-xs"
                            title="Restitution & Contrôle Kilométrage"
                          >
                            Clôturer
                          </button>
                        )}

                        {/* Annuler */}
                        {res.status !== 'TERMINEE' && res.status !== 'ANNULEE' && (
                          <button
                            onClick={() => {
                              const reason = prompt('Motif d’annulation de la réservation :');
                              if (reason) cancelReservation(res.id, reason);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                            title="Annuler la réservation"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredReservations.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune réservation trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Reservation with automatic conflict checking and option calculator */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouvelle Réservation & Contrat de Location"
        subtitle="Vérification instantanée de disponibilité et calcul dynamique"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Locataire *</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Sélectionner un client...</option>
                {clients
                  .filter((c) => !c.deletedAt)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.type}) - {c.phone}
                    </option>
                  ))}
              </select>
            </div>

            {/* Vehicle selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Véhicule Attribué *</label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Sélectionner un véhicule...</option>
                {vehicles
                  .filter((v) => !v.deletedAt)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.licensePlate}) - {formatCurrency(v.dailyRate, settings)}/j - [{v.status}]
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Dates & Hours */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date Départ *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Heure Départ</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date Retour Prévue *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Heure Retour</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu de prise en charge</label>
              <input
                type="text"
                value={formData.pickupLocation}
                onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                placeholder="Ex: Agence Centrale ou Aéroport AIBD"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu de restitution</label>
              <input
                type="text"
                value={formData.returnLocation}
                onChange={(e) => setFormData({ ...formData, returnLocation: e.target.value })}
                placeholder="Ex: Agence Centrale ou Siège client"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {/* Options Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Options & Services Complémentaires
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {AVAILABLE_OPTIONS.map((opt) => {
                const isSelected = formData.selectedOptions.some((o) => o.name === opt.name);
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => handleToggleOption(opt)}
                    className={`p-3 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p>{opt.name}</p>
                      <p className="text-[11px] text-slate-400 font-normal">
                        +{formatCurrency(opt.unitPrice, settings)} {opt.chargeType === 'PAR_JOUR' ? '/ jour' : 'forfait'}
                      </p>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Financial summary banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white grid grid-cols-3 gap-4 text-xs items-center">
            <div>
              <p className="text-slate-400">Durée calculée :</p>
              <p className="text-base font-bold text-white">{calculatedDays} jour(s)</p>
              <p className="text-[11px] text-slate-400">
                Base location : {formatCurrency(baseCalculatedAmount, settings)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Caution exigée :</p>
              <p className="text-base font-bold text-amber-400">
                {formatCurrency(selectedVehicleObj?.depositAmount || 200000, settings)}
              </p>
              <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.depositStatus === 'VERSEE'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      depositStatus: e.target.checked ? 'VERSEE' : 'NON_VERSEE',
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="text-[11px] text-slate-300">Caution déjà reçue</span>
              </label>
            </div>
            <div className="text-right">
              <p className="text-slate-400 uppercase text-[10px] font-bold">Total Devis Estimé</p>
              <p className="text-xl font-black text-emerald-400">
                {formatCurrency(totalEstimatedCalculated, settings)}
              </p>
            </div>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Enregistrer la Réservation
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Reservation (Restitution) */}
      {targetReservationToClose && (
        <Modal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          title={`Clôture de la Location : ${targetReservationToClose.reference}`}
          subtitle="Enregistrement du kilométrage de retour et vérification de la caution"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kilométrage de restitution (km) *
              </label>
              <input
                type="number"
                value={returnKm}
                onChange={(e) => setReturnKm(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Kilométrage de départ enregistré : {targetReservationToClose.startMileage || 0} km
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Niveau de carburant retour
              </label>
              <select
                value={returnFuel}
                onChange={(e) => setReturnFuel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="100%">Plein (100%) - Conforme</option>
                <option value="3/4">3/4 de réservoir</option>
                <option value="1/2">1/2 de réservoir</option>
                <option value="1/4">1/4 - À facturer</option>
              </select>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold">Caution de {formatCurrency(targetReservationToClose.depositRequired, settings)}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Vérifiez l’état carrosserie avant restitution définitive de la caution au locataire.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirmer la Clôture & Libérer le véhicule
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
