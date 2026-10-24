import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  History,
  RotateCcw,
  Check,
  Save,
  Plus,
  UserX,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { UserRole } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    users,
    addUser,
    updateUser,
    toggleUserActive,
    auditLogs,
    resetDemoData,
    currentUser,
    isCloudMode,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'COMPANY' | 'FINANCE' | 'USERS' | 'AUDIT'>('COMPANY');

  // Company settings form state
  const [companyForm, setCompanyForm] = useState({ ...settings });

  // Add User modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE' as UserRole,
  });

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim()) return;
    addUser({
      ...newUserData,
      active: true,
    });
    setIsAddUserOpen(false);
    setNewUserData({ name: '', email: '', phone: '', role: 'EMPLOYEE' });
  };

  return (
    <div className="space-y-6">
      {/* Settings Sub-Navigation */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('COMPANY')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'COMPANY'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Profil Société & Coordonnées</span>
        </button>

        <button
          onClick={() => setActiveSubTab('FINANCE')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'FINANCE'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Devise, TVA & Facturation</span>
        </button>

        <button
          onClick={() => setActiveSubTab('USERS')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'USERS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Utilisateurs & Rôles ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'AUDIT'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Journal d’Activité (Audit Log)</span>
        </button>
      </div>

      {/* SUBTAB 1: COMPANY */}
      {activeSubTab === 'COMPANY' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          {isCloudMode && (
            <div role="alert" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
              <strong>Avant toute facturation réelle :</strong> renseignez et faites vérifier les informations légales
              d’Elite Cars (NINEA, RCCM, adresse) ainsi que le taux de TVA applicable par votre comptable.
              Les données de démonstration ne sont pas reprises dans l’espace entreprise.
            </div>
          )}
          <form onSubmit={handleSaveCompany} className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Informations Légales & Fiscales de l'Entreprise
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ces mentions figurent obligatoirement sur l'en-tête de vos factures et contrats de location.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom commercial de l’agence *
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forme Juridique & Capital
                </label>
                <input
                  type="text"
                  value={companyForm.legalForm}
                  onChange={(e) => setCompanyForm({ ...companyForm, legalForm: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numéro d’Identification Fiscale (NINEA) *
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.ninea}
                  onChange={(e) => setCompanyForm({ ...companyForm, ninea: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registre de Commerce et du Crédit Mobilier (RCCM)
                </label>
                <input
                  type="text"
                  value={companyForm.rccm}
                  onChange={(e) => setCompanyForm({ ...companyForm, rccm: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Siège</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ville & Pays</label>
                <input
                  type="text"
                  value={`${companyForm.city}, ${companyForm.country}`}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone de contact</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email officiel</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            {/* Banking details */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Coordonnées de Règlements (Impression sur Facture)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banque Partenaire</label>
                  <input
                    type="text"
                    value={companyForm.bankName}
                    onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IBAN Bancaire</label>
                  <input
                    type="text"
                    value={companyForm.bankAccountIban}
                    onChange={(e) => setCompanyForm({ ...companyForm, bankAccountIban: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro Wave Entreprise</label>
                  <input
                    type="text"
                    value={companyForm.waveNumber || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, waveNumber: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro Orange Money</label>
                  <input
                    type="text"
                    value={companyForm.orangeMoneyNumber || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, orangeMoneyNumber: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Enregistrer les coordonnées</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 2: FINANCE */}
      {activeSubTab === 'FINANCE' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Paramètres Financiers, Devise & Facturation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Réglementation fiscale, devises par défaut et préfixes des documents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Devise Principale</label>
              <select
                value={companyForm.currencySymbol}
                onChange={(e) => {
                  const sym = e.target.value;
                  setCompanyForm({ ...companyForm, currency: sym, currencySymbol: sym });
                  updateSettings({ currency: sym, currencySymbol: sym });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
              >
                <option value="FCFA">FCFA (Franc CFA - XOF)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="USD">USD ($ - Dollar US)</option>
                <option value="CAD">CAD ($ - Dollar Canadien)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Taux de TVA Normal (%)</label>
              <select
                value={companyForm.defaultTaxRatePercent}
                onChange={(e) => {
                  const rate = Number(e.target.value);
                  setCompanyForm({ ...companyForm, defaultTaxRatePercent: rate });
                  updateSettings({ defaultTaxRatePercent: rate });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
              >
                <option value={18}>18% (à valider avec votre comptable)</option>
                <option value={20}>20% (France / Europe)</option>
                <option value={0}>0% (Régime franchise / Exonération)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Préfixe de Facturation</label>
              <input
                type="text"
                value={companyForm.invoicePrefix}
                onChange={(e) => {
                  setCompanyForm({ ...companyForm, invoicePrefix: e.target.value });
                  updateSettings({ invoicePrefix: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-blue-900 space-y-1">
            <p className="font-bold">Règles de Calcul Automatique Actives :</p>
            <p>• Les factures calculent la TVA au taux de {settings.defaultTaxRatePercent}% sur chaque article éligible.</p>
            <p>• Une facture avec reste dû dont la date d’échéance est antérieure à aujourd'hui passe automatiquement en statut « En retard ».</p>
            <p>• La suppression d’une facture ayant déjà fait l’objet d'un encaissement est strictement verrouillée par le système.</p>
          </div>
        </div>
      )}

      {/* SUBTAB 3: USERS & ROLES */}
      {activeSubTab === 'USERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gestion des Collaborateurs & Droits d'Accès
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rôles : Administrateur, Gestionnaire de flotte, Comptable, Employé
              </p>
            </div>

            {isCloudMode ? (
              <p className="max-w-sm text-right text-xs text-amber-800">
                Les invitations se font depuis le tableau de bord Supabase et doivent être associées à Elite Cars.
              </p>
            ) : (
              <button
                onClick={() => setIsAddUserOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter un Utilisateur</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Email & Téléphone</th>
                  <th className="py-3 px-4">Rôle Attribué</th>
                  <th className="py-3 px-4 text-center">Statut du Compte</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p>{u.name}</p>
                          {currentUser.id === u.id && (
                            <span className="text-[10px] text-blue-600 font-bold">(Votre session actuelle)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p>{u.email}</p>
                      <p className="text-[11px] text-slate-400">{u.phone || '-'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                        disabled={isCloudMode || currentUser.role !== 'ADMIN'}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold"
                      >
                        <option value="ADMIN">Administrateur</option>
                        <option value="MANAGER">Gestionnaire</option>
                        <option value="ACCOUNTANT">Comptable</option>
                        <option value="EMPLOYEE">Employé</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!isCloudMode && currentUser.id !== u.id && (
                        <button
                          onClick={() => toggleUserActive(u.id)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded transition ${
                            u.active
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.active ? 'Désactiver' : 'Réactiver'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: AUDIT LOG */}
      {activeSubTab === 'AUDIT' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Journal d’Activité & Traçabilité (Audit Trail)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique chronologique et immuable des actions effectuées par les utilisateurs
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} événements enregistrés</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Horodatage</th>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Détails de l’opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.userName}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({log.userRole})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : log.action === 'PAYMENT'
                            ? 'bg-blue-50 text-blue-700'
                            : log.action === 'DELETE'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-800">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add User */}
      <Modal
        isOpen={isAddUserOpen && !isCloudMode}
        onClose={() => setIsAddUserOpen(false)}
        title="Créer un Nouvel Utilisateur"
        subtitle="Définition du rôle et des privilèges d'accès"
        maxWidth="md"
      >
        <form onSubmit={handleAddUserSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={newUserData.name}
              onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
              placeholder="Ex: Cheikh Diop"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email professionnel *</label>
            <input
              type="email"
              required
              value={newUserData.email}
              onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
              placeholder="nom@elitecars.sn"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={newUserData.phone}
              onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
              placeholder="+221 77 000 00 00"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle attribué *</label>
            <select
              value={newUserData.role}
              onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
            >
              <option value="ADMIN">Administrateur (Tous les droits)</option>
              <option value="MANAGER">Gestionnaire (Réservations & Flotte)</option>
              <option value="ACCOUNTANT">Comptable (Factures, Dépenses & Trésorerie)</option>
              <option value="EMPLOYEE">Employé (Locations courantes)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddUserOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Créer le compte
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
