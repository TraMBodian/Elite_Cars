import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Car,
  CalendarCheck2,
  FileText,
  CreditCard,
  Receipt,
  Calculator,
  BarChart3,
  Settings,
  Code2,
  ShieldCheck,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { UserRole } from '../../types';
import { canAccessTab } from '../../utils/permissions';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    setCurrentUser,
    isCloudMode,
    signOut,
    users,
    invoices,
    vehicles,
    reservations
  } = useApp();

  // Badge calculations
  const overdueInvoicesCount = invoices.filter(
    (i) => !i.deletedAt && i.status === 'EN_RETARD'
  ).length;

  const activeRentalsCount = reservations.filter(
    (r) => !r.deletedAt && r.status === 'ACTIVE'
  ).length;

  const expiredVehiclesCount = vehicles.filter((v) => {
    if (v.deletedAt) return false;
    const now = new Date().toISOString().split('T')[0];
    return v.insuranceExpiry < now || v.technicalInspectionExpiry < now;
  }).length;

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    {
      id: 'vehicules',
      label: 'Véhicules & Flotte',
      icon: Car,
      badge: expiredVehiclesCount > 0 ? `${expiredVehiclesCount} alertes` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'reservations',
      label: 'Réservations & Contrats',
      icon: CalendarCheck2,
      badge: activeRentalsCount > 0 ? `${activeRentalsCount}` : undefined,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'factures',
      label: 'Facturation',
      icon: FileText,
      badge: overdueInvoicesCount > 0 ? `${overdueInvoicesCount} en retard` : undefined,
      badgeColor: 'bg-rose-600 text-white animate-pulse',
    },
    { id: 'paiements', label: 'Paiements & Reçus', icon: CreditCard },
    { id: 'depenses', label: 'Dépenses & Charges', icon: Receipt },
    { id: 'comptabilite', label: 'Comptabilité', icon: Calculator },
    { id: 'rapports', label: 'Rapports & Stats', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
    { id: 'architecture', label: 'API & Django / SQL', icon: Code2, highlight: true },
  ];

  const handleRoleChange = (role: UserRole) => {
    const matchingUser = users.find((u) => u.role === role) || currentUser;
    setCurrentUser(matchingUser);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'MANAGER':
        return 'Gestionnaire';
      case 'ACCOUNTANT':
        return 'Comptable';
      case 'EMPLOYEE':
        return 'Employé';
      default:
        return role;
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="rounded-lg bg-slate-800 px-2 py-2">
          <img
            src="/elite-cars-logo.webp"
            alt="Elite Cars"
            className="h-auto max-h-12 w-full object-contain"
          />
        </div>
        <p className="mt-2 truncate text-center text-[11px] text-slate-400">Flotte & Comptabilité</p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Modules de gestion
        </div>

        {navItems.filter((item) => canAccessTab(currentUser.role, item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : item.highlight
                  ? 'text-emerald-400 hover:bg-slate-800/80 hover:text-emerald-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role Switcher & User Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">Rôle actif & Session</span>
          </div>

          {isCloudMode ? (
            <p className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300">
              {getRoleLabel(currentUser.role)}
            </p>
          ) : (
            <select
              value={currentUser.role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
                <option value="ADMIN">Administrateur (Tous droits)</option>
                <option value="MANAGER">Gestionnaire (Opérations)</option>
                <option value="ACCOUNTANT">Comptable (Finances)</option>
                <option value="EMPLOYEE">Employé (Locations)</option>
            </select>
          )}

          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-700/50">
            <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-blue-400 truncate">{getRoleLabel(currentUser.role)}</p>
            </div>
          </div>
          {isCloudMode && (
            <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
