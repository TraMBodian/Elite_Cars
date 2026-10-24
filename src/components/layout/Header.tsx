import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CalendarPlus,
  FilePlus,
  CreditCard,
  PlusCircle,
  RotateCcw,
  Bell,
  Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { canUseQuickAction } from '../../utils/permissions';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, setQuickModal, resetDemoData, isCloudMode, currentUser, invoices, vehicles } = useApp();
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Check overdue and urgent fleet items
  const overdueInvoices = invoices.filter((i) => !i.deletedAt && i.status === 'EN_RETARD');
  const now = new Date().toISOString().split('T')[0];
  const urgentVehicles = vehicles.filter(
    (v) => !v.deletedAt && (v.insuranceExpiry <= now || v.technicalInspectionExpiry <= now)
  );

  const totalAlerts = overdueInvoices.length + urgentVehicles.length;

  const getPageInfo = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: 'Tableau de bord',
          subtitle: 'Indicateurs clés, trésorerie et pilotage de la flotte',
        };
      case 'clients':
        return {
          title: 'Gestion des Clients',
          subtitle: 'Particuliers et Entreprises (NINEA, historique des locations)',
        };
      case 'vehicules':
        return {
          title: 'Parc Automobile & Flotte',
          subtitle: 'Disponibilités, tarifs, entretiens, vidanges et assurances',
        };
      case 'reservations':
        return {
          title: 'Réservations & Contrats',
          subtitle: 'Locations en cours, options avec chauffeur, cautions et kilométrages',
        };
      case 'factures':
        return {
          title: 'Facturation & Créances',
          subtitle: 'Émission de factures conformes, TVA 18%, acomptes et relances',
        };
      case 'paiements':
        return {
          title: 'Paiements & Encaissements',
          subtitle: 'Espèces, Wave / Orange Money, virements bancaires et reçus PDF',
        };
      case 'depenses':
        return {
          title: 'Dépenses & Charges',
          subtitle: 'Carburant, entretiens, loyers, salaires et TVA déductible',
        };
      case 'comptabilite':
        return {
          title: 'Comptabilité Simplifiée',
          subtitle: 'Trésorerie nette, compte de résultat (P&L), TVA et journal financier',
        };
      case 'rapports':
        return {
          title: 'Rapports Financiers & Exports',
          subtitle: 'Rentabilité par véhicule, balance âgée et export CSV',
        };
      case 'parametres':
        return {
          title: 'Paramètres & Société',
          subtitle: 'Identité entreprise, NINEA, taux de TVA, devise et utilisateurs',
        };
      case 'architecture':
        return {
          title: 'Architecture Backend Django & Neon PostgreSQL',
          subtitle: 'Spécifications complètes, modèles Django, migrations & schéma SQL',
        };
      default:
        return { title: 'Elite Cars', subtitle: 'Gestion de flotte & finances' };
    }
  };

  const pageInfo = getPageInfo(activeTab);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Title & Subtitle */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{pageInfo.title}</h2>
            <p className="text-xs text-slate-500 hidden sm:block">{pageInfo.subtitle}</p>
          </div>
        </div>

        {/* Quick Action Buttons & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Action: New Reservation */}
          {canUseQuickAction(currentUser.role, 'RESERVATION') && <button
            onClick={() => setQuickModal('RESERVATION')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            title="Créer une réservation"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">+ Réservation</span>
          </button>}

          {/* Quick Action: New Invoice */}
          {canUseQuickAction(currentUser.role, 'INVOICE') && <button
            onClick={() => {
              setActiveTab('factures');
              setQuickModal('INVOICE');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            title="Créer une facture"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">+ Facture</span>
          </button>}

          {/* Quick Action: New Payment */}
          {canUseQuickAction(currentUser.role, 'PAYMENT') && <button
            onClick={() => setQuickModal('PAYMENT')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
            title="Enregistrer un paiement"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">+ Paiement</span>
          </button>}

          {/* Quick Action: New Expense */}
          {canUseQuickAction(currentUser.role, 'EXPENSE') && <button
            onClick={() => setQuickModal('EXPENSE')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
            title="Ajouter une dépense"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">+ Dépense</span>
          </button>}

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
              title="Notifications & Alertes"
            >
              <Bell className="h-4 w-4" />
              {totalAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Dropdown notifications */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Alertes & Rappels ({totalAlerts})
                  </h4>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Fermer
                  </button>
                </div>

                <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto">
                  {overdueInvoices.length > 0 &&
                    overdueInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800"
                      >
                        <p className="font-semibold">Facture en retard : {inv.number}</p>
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          Reste à payer : {inv.remainingAmount.toLocaleString('fr-FR')} FCFA (Échéance : {inv.dueDate})
                        </p>
                      </div>
                    ))}

                  {urgentVehicles.length > 0 &&
                    urgentVehicles.map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800"
                      >
                        <p className="font-semibold">Document expiré : {v.brand} {v.model}</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Immatriculation : {v.licensePlate} (Visite / Assurance à renouveler)
                        </p>
                      </div>
                    ))}

                  {totalAlerts === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">
                      Toutes les alertes sont à jour. Aucun retard ni document expiré !
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Data button */}
          {!isCloudMode && (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Réinitialiser les données de démo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Confirmation Modal for Reset */}
      <Modal
        isOpen={!isCloudMode && showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        title="Réinitialiser les données de démonstration ?"
        subtitle="Cette action remettra la flotte, les factures, clients et paiements dans leur état initial."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Voulez-vous restaurer les enregistrements de test ? Vos modifications locales seront remplacées.
          </p>
          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={() => setShowConfirmReset(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                resetDemoData();
                setShowConfirmReset(false);
              }}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
