import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeConfig = (st: string) => {
    switch (st.toUpperCase()) {
      // Factures & Paiements
      case 'PAYEE':
      case 'SOLDEE':
        return {
          label: 'Payée',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
          dot: 'bg-emerald-500',
        };
      case 'PARTIELLEMENT_PAYEE':
      case 'PARTIELLE':
        return {
          label: 'Partielle',
          classes: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
          dot: 'bg-amber-500',
        };
      case 'EMISE':
        return {
          label: 'Émise / Impayée',
          classes: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
          dot: 'bg-blue-500',
        };
      case 'BROUILLON':
        return {
          label: 'Brouillon',
          classes: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/10',
          dot: 'bg-slate-400',
        };
      case 'EN_RETARD':
        return {
          label: 'En retard',
          classes: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20 font-semibold',
          dot: 'bg-rose-600 animate-pulse',
        };
      case 'ANNULEE':
        return {
          label: 'Annulée',
          classes: 'bg-slate-100 text-slate-600 border-slate-200 line-through',
          dot: 'bg-slate-400',
        };

      // Véhicules
      case 'DISPONIBLE':
        return {
          label: 'Disponible',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'LOUE':
        return {
          label: 'Loué',
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-600',
        };
      case 'MAINTENANCE':
        return {
          label: 'En maintenance',
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'HORS_SERVICE':
        return {
          label: 'Hors service',
          classes: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
        };

      // Réservations
      case 'CONFIRMEE':
        return {
          label: 'Confirmée',
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
        };
      case 'ACTIVE':
        return {
          label: 'En cours (Active)',
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium',
          dot: 'bg-emerald-500 animate-pulse',
        };
      case 'TERMINEE':
        return {
          label: 'Terminée',
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
      case 'EN_ATTENTE':
        return {
          label: 'En attente',
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-400',
        };

      // Caution
      case 'VERSEE':
        return {
          label: 'Caution Versée',
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'NON_VERSEE':
        return {
          label: 'Caution Non versée',
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'RESTITUEE':
        return {
          label: 'Caution Restituée',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };

      default:
        return {
          label: st,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getBadgeConfig(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} font-medium ${config.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
