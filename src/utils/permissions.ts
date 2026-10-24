import { UserRole } from '../types';

const tabPermissions: Record<UserRole, string[]> = {
  ADMIN: ['dashboard', 'clients', 'vehicules', 'reservations', 'factures', 'paiements', 'depenses', 'comptabilite', 'rapports', 'parametres'],
  MANAGER: ['dashboard', 'clients', 'vehicules', 'reservations'],
  ACCOUNTANT: ['dashboard', 'clients', 'factures', 'paiements', 'depenses', 'comptabilite', 'rapports'],
  EMPLOYEE: ['dashboard', 'clients', 'vehicules', 'reservations'],
};

export const canAccessTab = (role: UserRole, tab: string): boolean =>
  tabPermissions[role].includes(tab);

export const canUseQuickAction = (role: UserRole, action: 'RESERVATION' | 'INVOICE' | 'PAYMENT' | 'EXPENSE'): boolean => {
  if (role === 'ADMIN') return true;
  if (role === 'ACCOUNTANT') return action !== 'RESERVATION';
  return action === 'RESERVATION';
};
