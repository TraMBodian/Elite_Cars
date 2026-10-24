import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  AuditLog,
  Client,
  CompanySettings,
  Expense,
  Invoice,
  Payment,
  Reservation,
  User,
  UserRole,
  Vehicle
} from '../types';
import {
  initialClients,
  initialCompanySettings,
  initialExpenses,
  initialInvoices,
  initialPayments,
  initialReservations,
  initialUsers,
  initialVehicles,
  initialAuditLogs,
} from '../data/mockData';
import { isDateOverlapping } from '../utils/formatters';
import { createId } from '../utils/ids';
import { supabase } from '../lib/supabase';

export interface AppInitialData {
  currentUser: User;
  users: User[];
  settings: CompanySettings;
  clients: Client[];
  vehicles: Vehicle[];
  reservations: Reservation[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  auditLogs: AuditLog[];
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppContextType {
  isCloudMode: boolean;
  getNextDocumentNumber: (type: 'invoice' | 'receipt' | 'expense' | 'reservation') => Promise<string>;
  signOut: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  toggleUserActive: (id: string) => void;
  
  // Settings
  settings: CompanySettings;
  updateSettings: (newSettings: Partial<CompanySettings>) => void;

  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'deletedAt'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => boolean;
  restoreClient: (id: string) => void;

  // Vehicles
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'deletedAt'>) => Vehicle;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => boolean;
  restoreVehicle: (id: string) => void;

  // Reservations
  reservations: Reservation[];
  addReservation: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'deletedAt'>) => { success: boolean; error?: string; reservation?: Reservation };
  updateReservation: (id: string, updates: Partial<Reservation>) => { success: boolean; error?: string };
  cancelReservation: (id: string, reason: string) => void;
  completeReservation: (id: string, returnMileage: number, fuelLevelReturn: string) => void;
  deleteReservation: (id: string) => void;
  restoreReservation: (id: string) => boolean;
  checkVehicleAvailability: (vehicleId: string, startDate: string, endDate: string, excludeReservationId?: string) => { available: boolean; conflictWith?: Reservation };

  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  cancelInvoice: (id: string, reason: string) => boolean;
  deleteInvoice: (id: string) => { success: boolean; error?: string };
  restoreInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => Promise<Invoice | null>;
  generateInvoiceFromReservation: (reservationId: string) => Promise<Invoice | null>;

  // Payments
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'deletedAt' | 'receiptNumber'> & { receiptNumber?: string }) => Promise<{ success: boolean; error?: string; payment?: Payment }>;
  deletePayment: (id: string) => Promise<void>;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'deletedAt'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => void;

  // Audit Logs
  auditLogs: AuditLog[];
  logAction: (action: AuditLog['action'], entityType: AuditLog['entityType'], entityId: string, details: string) => void;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;

  // Modal helpers for printable documents
  activePreviewDoc: { type: 'INVOICE' | 'RECEIPT' | 'CONTRACT'; data: any } | null;
  openPreviewDoc: (type: 'INVOICE' | 'RECEIPT' | 'CONTRACT', data: any) => void;
  closePreviewDoc: () => void;

  // Quick Action Modal Helper
  quickModal: 'RESERVATION' | 'INVOICE' | 'PAYMENT' | 'EXPENSE' | null;
  setQuickModal: (modal: 'RESERVATION' | 'INVOICE' | 'PAYMENT' | 'EXPENSE' | null) => void;

  // Reset to initial demo data
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{
  children: ReactNode;
  companyId?: string;
  initialData?: AppInitialData;
}> = ({ children, companyId, initialData }) => {
  const isCloudMode = Boolean(companyId && initialData);

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  const signOut = () => {
    if (!isCloudMode || !supabase) return;
    void supabase.auth.signOut().then(({ error }) => {
      if (error) showToast(`Déconnexion impossible : ${error.message}`, 'error');
    });
  };

  const getNextDocumentNumber = async (
    type: 'invoice' | 'receipt' | 'expense' | 'reservation'
  ): Promise<string> => {
    const year = new Date().getFullYear();
    const configuredPrefix =
      type === 'invoice'
        ? settings.invoicePrefix || 'FAC-'
        : type === 'receipt'
          ? 'REC-'
          : type === 'expense'
            ? 'DEP-'
            : 'RES-';
    const prefix = configuredPrefix.includes(String(year))
      ? configuredPrefix
      : `${configuredPrefix}${year}-`;

    if (companyId && supabase) {
      const { data, error } = await supabase.rpc('next_document_number', {
        target_company_id: companyId,
        target_document_type: type,
        target_prefix: prefix,
      });
      if (error) {
        showToast(`Impossible de générer le numéro du document : ${error.message}`, 'error');
        throw error;
      }
      if (typeof data !== 'string') {
        const error = new Error('La base de données a retourné un numéro de document invalide.');
        showToast(error.message, 'error');
        throw error;
      }
      return data;
    }

    const records: string[] =
      type === 'invoice'
        ? invoices.map((record) => record.number)
        : type === 'receipt'
          ? payments.map((record) => record.receiptNumber)
          : type === 'expense'
            ? expenses.map((record) => record.reference)
            : reservations.map((record) => record.reference);
    const maxSequence = records.reduce((max, value) => {
      if (!value.startsWith(prefix)) return max;
      const sequence = Number(value.slice(prefix.length));
      return Number.isInteger(sequence) ? Math.max(max, sequence) : max;
    }, 0);
    return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`;
  };

  // Document Preview Modal (Invoice, Receipt, Contract)
  const [activePreviewDoc, setActivePreviewDoc] = useState<{ type: 'INVOICE' | 'RECEIPT' | 'CONTRACT'; data: any } | null>(null);
  const openPreviewDoc = (type: 'INVOICE' | 'RECEIPT' | 'CONTRACT', data: any) => {
    setActivePreviewDoc({ type, data });
  };
  const closePreviewDoc = () => setActivePreviewDoc(null);

  // Quick modal
  const [quickModal, setQuickModal] = useState<'RESERVATION' | 'INVOICE' | 'PAYMENT' | 'EXPENSE' | null>(null);

  // Users & Active User
  const [users, setUsers] = useState<User[]>(() => {
    if (initialData) return initialData.users;
    const saved = localStorage.getItem('autoloc_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });
  const [currentUser, setCurrentUser] = useState<User>(() => initialData?.currentUser || users[0] || initialUsers[0]);

  // Settings
  const [settings, setSettings] = useState<CompanySettings>(() => {
    if (initialData) return initialData.settings;
    const saved = localStorage.getItem('autoloc_settings');
    return saved ? JSON.parse(saved) : initialCompanySettings;
  });

  // Clients
  const [clients, setClients] = useState<Client[]>(() => {
    if (initialData) return initialData.clients;
    const saved = localStorage.getItem('autoloc_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (initialData) return initialData.vehicles;
    const saved = localStorage.getItem('autoloc_vehicles');
    return saved ? JSON.parse(saved) : initialVehicles;
  });

  // Reservations
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    if (initialData) return initialData.reservations;
    const saved = localStorage.getItem('autoloc_reservations');
    return saved ? JSON.parse(saved) : initialReservations;
  });

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (initialData) return initialData.invoices;
    const saved = localStorage.getItem('autoloc_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  // Payments
  const [payments, setPayments] = useState<Payment[]>(() => {
    if (initialData) return initialData.payments;
    const saved = localStorage.getItem('autoloc_payments');
    return saved ? JSON.parse(saved) : initialPayments;
  });

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (initialData) return initialData.expenses;
    const saved = localStorage.getItem('autoloc_expenses');
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    if (initialData) return initialData.auditLogs;
    const saved = localStorage.getItem('autoloc_audit_logs');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  // Save to localStorage
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_users', JSON.stringify(users));
  }, [users, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_settings', JSON.stringify(settings));
  }, [settings, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_clients', JSON.stringify(clients));
  }, [clients, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_vehicles', JSON.stringify(vehicles));
  }, [vehicles, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_reservations', JSON.stringify(reservations));
  }, [reservations, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_invoices', JSON.stringify(invoices));
  }, [invoices, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_payments', JSON.stringify(payments));
  }, [payments, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_expenses', JSON.stringify(expenses));
  }, [expenses, isCloudMode]);
  useEffect(() => {
    if (isCloudMode) return;
    localStorage.setItem('autoloc_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs, isCloudMode]);

  const lastSyncedRecords = useRef(new Map<string, string>());
  const inFlightWrites = useRef(new Set<string>());
  const hasInitializedSignatures = useRef(false);
  if (initialData && !hasInitializedSignatures.current) {
    const knownRecords: Array<[string, string]> = [];
    for (const [entityType, collection] of [
      ['clients', initialData.clients],
      ['vehicles', initialData.vehicles],
      ['reservations', initialData.reservations],
      ['invoices', initialData.invoices],
      ['payments', initialData.payments],
      ['expenses', initialData.expenses],
      ['audit_logs', initialData.auditLogs],
    ] as const) {
      for (const item of collection) {
        knownRecords.push([`${entityType}:${item.id}`, JSON.stringify(item)]);
      }
    }
    lastSyncedRecords.current = new Map(knownRecords);
    hasInitializedSignatures.current = true;
  }

  useEffect(() => {
    if (!companyId || !initialData || !supabase) return;

    const collections: Array<[string, { id: string; payload: unknown }[]]> = [
      ['settings', [{ id: 'company-settings', payload: settings }]],
      ['clients', clients.map((item) => ({ id: item.id, payload: item }))],
      ['vehicles', vehicles.map((item) => ({ id: item.id, payload: item }))],
      ['reservations', reservations.map((item) => ({ id: item.id, payload: item }))],
      ['invoices', invoices.map((item) => ({ id: item.id, payload: item }))],
      ['expenses', expenses.map((item) => ({ id: item.id, payload: item }))],
      ['audit_logs', auditLogs.map((item) => ({ id: item.id, payload: item }))],
    ];

    for (const [entityType, collection] of collections) {
      if (entityType === 'settings' && currentUser.role !== 'ADMIN') continue;
      for (const item of collection) {
        const key = `${entityType}:${item.id}`;
        const serialized = JSON.stringify(item.payload);
        if (lastSyncedRecords.current.get(key) === serialized) continue;

        lastSyncedRecords.current.set(key, serialized);
        inFlightWrites.current.add(key);
        const pendingWrite = entityType === 'invoices'
          ? supabase.rpc('save_invoice_record', {
              target_company_id: companyId,
              invoice_payload: item.payload,
            })
          : supabase
              .from('business_records')
              .upsert(
                {
                  company_id: companyId,
                  entity_type: entityType,
                  id: item.id,
                  payload: item.payload,
                  updated_by: currentUser.id,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'company_id,entity_type,id' }
              );
        void Promise.resolve(pendingWrite)
          .then(({ error }) => {
            inFlightWrites.current.delete(key);
            if (error) {
              lastSyncedRecords.current.delete(key);
              showToast(`Échec de synchronisation (${entityType}/${item.id}) : ${error.message}`, 'error');
            }
          })
          .catch((error: unknown) => {
            inFlightWrites.current.delete(key);
            lastSyncedRecords.current.delete(key);
            const message = error instanceof Error ? error.message : 'Erreur réseau inconnue';
            showToast(`Échec de synchronisation (${entityType}/${item.id}) : ${message}`, 'error');
          });
      }
    }
  }, [
    companyId,
    initialData,
    settings,
    clients,
    vehicles,
    reservations,
    invoices,
    payments,
    expenses,
    auditLogs,
    currentUser.id,
  ]);

  useEffect(() => {
    if (!companyId || !initialData || !supabase) return;
    const client = supabase;

    const applyRemoteRecords = async () => {
      const { data, error } = await client
        .from('business_records')
        .select('entity_type, id, payload')
        .eq('company_id', companyId);

      if (error) {
        showToast(`Impossible de recevoir les mises à jour : ${error.message}`, 'error');
        return;
      }

      const snapshot = data ?? [];
      const signatures = new Map<string, string>();
      for (const record of snapshot) {
        signatures.set(`${record.entity_type}:${record.id}`, JSON.stringify(record.payload));
      }
      for (const key of inFlightWrites.current) {
        signatures.set(key, lastSyncedRecords.current.get(key) ?? '');
      }
      lastSyncedRecords.current = signatures;

      const getCollection = <T,>(entityType: string): T[] =>
        snapshot
          .filter((record) => record.entity_type === entityType)
          .map((record) => record.payload as T);
      const mergeCollection = <T extends { id: string }>(
        entityType: string,
        remoteRecords: T[],
        localRecords: T[]
      ): T[] => {
        const pendingRecords = localRecords.filter((record) =>
          inFlightWrites.current.has(`${entityType}:${record.id}`)
        );
        const merged = new Map(remoteRecords.map((record) => [record.id, record]));
        for (const record of pendingRecords) merged.set(record.id, record);
        return [...merged.values()];
      };
      const remoteSettings = snapshot.find(
        (record) => record.entity_type === 'settings' && record.id === 'company-settings'
      )?.payload as CompanySettings | undefined;

      if (!inFlightWrites.current.has('settings:company-settings') && remoteSettings) {
        setSettings(remoteSettings);
      }
      setClients((local) => mergeCollection('clients', getCollection<Client>('clients'), local));
      setVehicles((local) => mergeCollection('vehicles', getCollection<Vehicle>('vehicles'), local));
      setReservations((local) => mergeCollection('reservations', getCollection<Reservation>('reservations'), local));
      setInvoices((local) => mergeCollection('invoices', getCollection<Invoice>('invoices'), local));
      setPayments(getCollection<Payment>('payments'));
      setExpenses((local) => mergeCollection('expenses', getCollection<Expense>('expenses'), local));
      setAuditLogs((local) => mergeCollection('audit_logs', getCollection<AuditLog>('audit_logs'), local));
    };

    const channel = client
      .channel(`business-records-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_records',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          void applyRemoteRecords();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          showToast('La synchronisation en temps réel est interrompue. Rechargez la page pour réessayer.', 'warning');
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [companyId, initialData]);

  // Automatic overdue check on invoices
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setInvoices((prevInvoices) => {
      let changed = false;
      const updated = prevInvoices.map((inv) => {
        if (
          inv.status !== 'PAYEE' &&
          inv.status !== 'ANNULEE' &&
          inv.status !== 'BROUILLON' &&
          inv.remainingAmount > 0 &&
          inv.dueDate < today &&
          inv.status !== 'EN_RETARD'
        ) {
          changed = true;
          return { ...inv, status: 'EN_RETARD' as const };
        }
        return inv;
      });
      return changed ? updated : prevInvoices;
    });
  }, []);

  const logAction = (
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: createId('log'),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // User Actions
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (isCloudMode) {
      showToast('Les comptes réels doivent être créés dans Supabase puis associés à Elite Cars.', 'warning');
      return;
    }
    const newUser: User = {
      ...userData,
      id: createId('usr'),
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    logAction('CREATE', 'PARAMETRES', newUser.id, `Nouvel utilisateur créé: ${newUser.name} (${newUser.role})`);
    showToast(`Utilisateur ${newUser.name} ajouté.`);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    if (isCloudMode) {
      showToast('La gestion des rôles en ligne doit être faite par un administrateur.', 'warning');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    if (currentUser.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...updates }));
    }
    logAction('UPDATE', 'PARAMETRES', id, `Mise à jour utilisateur: ${updates.name || id}`);
    showToast('Profil utilisateur mis à jour.');
  };

  const toggleUserActive = (id: string) => {
    if (isCloudMode) {
      showToast('La désactivation des comptes en ligne doit être faite par un administrateur.', 'warning');
      return;
    }
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextActive = !u.active;
          logAction('UPDATE', 'PARAMETRES', id, `Statut utilisateur ${u.name} passé à ${nextActive ? 'Actif' : 'Désactivé'}`);
          return { ...u, active: nextActive };
        }
        return u;
      })
    );
    showToast('Statut utilisateur modifié.');
  };

  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    logAction('UPDATE', 'PARAMETRES', 'settings', 'Modification des paramètres généraux de l’entreprise');
    showToast('Paramètres de l’entreprise enregistrés.');
  };

  // Clients
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'deletedAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: createId('cli'),
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    setClients((prev) => [newClient, ...prev]);
    logAction('CREATE', 'CLIENT', newClient.id, `Création client ${newClient.fullName} (${newClient.type})`);
    showToast(`Client ${newClient.fullName} créé avec succès.`);
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    logAction('UPDATE', 'CLIENT', id, `Modification coordonnées client ID ${id}`);
    showToast('Fiche client mise à jour.');
  };

  const deleteClient = (id: string): boolean => {
    // Check if client has active reservations or unpaid invoices
    const hasActiveRes = reservations.some(
      (r) => r.clientId === id && !r.deletedAt && (r.status === 'ACTIVE' || r.status === 'CONFIRMEE')
    );
    if (hasActiveRes) {
      showToast('Impossible de supprimer ce client : il a des locations en cours.', 'error');
      return false;
    }
    // Logical soft delete
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c)));
    logAction('DELETE', 'CLIENT', id, `Suppression logique du client ID ${id}`);
    showToast('Client supprimé avec succès.');
    return true;
  };

  const restoreClient = (id: string) => {
    const client = clients.find((record) => record.id === id);
    if (!client?.deletedAt) return;
    setClients((prev) => prev.map((record) => record.id === id ? { ...record, deletedAt: null } : record));
    logAction('UPDATE', 'CLIENT', id, `Restauration du client ${client.fullName} depuis les archives`);
    showToast(`Client ${client.fullName} restauré.`);
  };

  // Vehicles
  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'deletedAt'>): Vehicle => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: createId('veh'),
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    logAction('CREATE', 'VEHICULE', newVehicle.id, `Ajout véhicule ${newVehicle.brand} ${newVehicle.model} (${newVehicle.licensePlate})`);
    showToast(`Véhicule ${newVehicle.brand} ${newVehicle.model} ajouté à la flotte.`);
    return newVehicle;
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    logAction('UPDATE', 'VEHICULE', id, `Mise à jour véhicule ID ${id}`);
    showToast('Véhicule mis à jour.');
  };

  const deleteVehicle = (id: string): boolean => {
    const isCurrentlyRented = reservations.some(
      (r) => r.vehicleId === id && !r.deletedAt && (r.status === 'ACTIVE' || r.status === 'CONFIRMEE')
    );
    if (isCurrentlyRented) {
      showToast('Impossible de supprimer un véhicule actuellement loué ou réservé.', 'error');
      return false;
    }
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, deletedAt: new Date().toISOString() } : v)));
    logAction('DELETE', 'VEHICULE', id, `Suppression logique du véhicule ID ${id}`);
    showToast('Véhicule retiré de la flotte.');
    return true;
  };

  const restoreVehicle = (id: string) => {
    const vehicle = vehicles.find((record) => record.id === id);
    if (!vehicle?.deletedAt) return;
    setVehicles((prev) => prev.map((record) => record.id === id ? { ...record, deletedAt: null } : record));
    logAction('UPDATE', 'VEHICULE', id, `Restauration du véhicule ${vehicle.licensePlate} depuis les archives`);
    showToast(`Véhicule ${vehicle.licensePlate} restauré dans la flotte.`);
  };

  // Availability check
  const checkVehicleAvailability = (
    vehicleId: string,
    startDate: string,
    endDate: string,
    excludeReservationId?: string
  ): { available: boolean; conflictWith?: Reservation } => {
    const activeConflicts = reservations.filter((r) => {
      if (r.deletedAt || r.status === 'ANNULEE' || r.status === 'TERMINEE') return false;
      if (excludeReservationId && r.id === excludeReservationId) return false;
      if (r.vehicleId !== vehicleId) return false;
      return isDateOverlapping(startDate, endDate, r.startDate, r.endDate);
    });

    if (activeConflicts.length > 0) {
      return { available: false, conflictWith: activeConflicts[0] };
    }
    return { available: true };
  };

  // Reservations
  const addReservation = (
    resData: Omit<Reservation, 'id' | 'createdAt' | 'deletedAt'>
  ): { success: boolean; error?: string; reservation?: Reservation } => {
    // 1. Validation date retour >= date départ
    if (resData.endDate < resData.startDate) {
      showToast('La date de retour ne peut pas être antérieure à la date de départ.', 'error');
      return { success: false, error: 'Date de retour invalide' };
    }

    // 2. Validation chevauchement de dates
    const availability = checkVehicleAvailability(resData.vehicleId, resData.startDate, resData.endDate);
    if (!availability.available) {
      const conflictMsg = `Ce véhicule est déjà réservé du ${availability.conflictWith?.startDate} au ${availability.conflictWith?.endDate} (Réf: ${availability.conflictWith?.reference}).`;
      showToast(conflictMsg, 'error');
      return { success: false, error: conflictMsg };
    }

    const newRes: Reservation = {
      ...resData,
      id: createId('res'),
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };

    setReservations((prev) => [newRes, ...prev]);

    // If reservation is immediately active, update vehicle status to LOUE
    if (newRes.status === 'ACTIVE') {
      setVehicles((prev) =>
        prev.map((v) => (v.id === newRes.vehicleId ? { ...v, status: 'LOUE' } : v))
      );
    }

    logAction('CREATE', 'RESERVATION', newRes.id, `Nouvelle réservation ${newRes.reference} (Montant: ${newRes.totalEstimatedAmount} FCFA)`);
    showToast(`Réservation ${newRes.reference} enregistrée avec succès.`);
    return { success: true, reservation: newRes };
  };

  const updateReservation = (id: string, updates: Partial<Reservation>): { success: boolean; error?: string } => {
    const existing = reservations.find((r) => r.id === id);
    if (!existing) return { success: false, error: 'Réservation introuvable' };

    const targetVehicle = updates.vehicleId || existing.vehicleId;
    const targetStart = updates.startDate || existing.startDate;
    const targetEnd = updates.endDate || existing.endDate;

    if (targetEnd < targetStart) {
      showToast('La date de retour ne peut pas précéder la date de départ.', 'error');
      return { success: false, error: 'Dates invalides' };
    }

    if (updates.startDate || updates.endDate || updates.vehicleId) {
      const availability = checkVehicleAvailability(targetVehicle, targetStart, targetEnd, id);
      if (!availability.available) {
        showToast(`Conflit de calendrier avec la réservation ${availability.conflictWith?.reference}`, 'error');
        return { success: false, error: 'Période occupée' };
      }
    }

    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    // Synchronize vehicle status if status changed
    if (updates.status === 'ACTIVE') {
      setVehicles((prev) => prev.map((v) => (v.id === targetVehicle ? { ...v, status: 'LOUE' } : v)));
    } else if (updates.status === 'TERMINEE' || updates.status === 'ANNULEE') {
      setVehicles((prev) => prev.map((v) => (v.id === targetVehicle ? { ...v, status: 'DISPONIBLE' } : v)));
    }

    logAction('UPDATE', 'RESERVATION', id, `Mise à jour réservation ${existing.reference}`);
    showToast('Réservation mise à jour.');
    return { success: true };
  };

  const cancelReservation = (id: string, reason: string) => {
    const res = reservations.find((r) => r.id === id);
    if (!res) return;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'ANNULEE',
              cancellationReason: reason,
            }
          : r
      )
    );

    // Free vehicle if it was rented
    setVehicles((prev) =>
      prev.map((v) => (v.id === res.vehicleId ? { ...v, status: 'DISPONIBLE' } : v))
    );

    logAction('STATUS_CHANGE', 'RESERVATION', id, `Annulation réservation ${res.reference}. Motif: ${reason}`);
    showToast(`Réservation ${res.reference} annulée.`);
  };

  const completeReservation = (id: string, returnMileage: number, fuelLevelReturn: string) => {
    const res = reservations.find((r) => r.id === id);
    if (!res) return;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'TERMINEE',
              returnMileage,
              fuelLevelReturn,
            }
          : r
      )
    );

    // Update vehicle: update mileage and set status to DISPONIBLE
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === res.vehicleId
          ? {
              ...v,
              currentMileage: Math.max(v.currentMileage, returnMileage),
              status: 'DISPONIBLE',
            }
          : v
      )
    );

    logAction('STATUS_CHANGE', 'RESERVATION', id, `Clôture location ${res.reference}. Km retour: ${returnMileage} km.`);
    showToast(`Location ${res.reference} clôturée avec succès.`);
  };

  const deleteReservation = (id: string) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r)));
    logAction('DELETE', 'RESERVATION', id, `Suppression logique réservation ${id}`);
    showToast('Réservation supprimée.');
  };

  const restoreReservation = (id: string): boolean => {
    const reservation = reservations.find((record) => record.id === id);
    if (!reservation?.deletedAt) return false;
    if (reservation.status === 'ACTIVE' || reservation.status === 'CONFIRMEE') {
      const availability = checkVehicleAvailability(
        reservation.vehicleId,
        reservation.startDate,
        reservation.endDate,
        reservation.id
      );
      if (!availability.available) {
        showToast(`Restauration impossible : conflit avec la réservation ${availability.conflictWith?.reference}.`, 'error');
        return false;
      }
    }
    setReservations((prev) => prev.map((record) => record.id === id ? { ...record, deletedAt: null } : record));
    if (reservation.status === 'ACTIVE') {
      setVehicles((prev) => prev.map((vehicle) =>
        vehicle.id === reservation.vehicleId ? { ...vehicle, status: 'LOUE' } : vehicle
      ));
    }
    logAction('UPDATE', 'RESERVATION', id, `Restauration de la réservation ${reservation.reference} depuis les archives`);
    showToast(`Réservation ${reservation.reference} restaurée.`);
    return true;
  };

  // Invoices
  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Invoice => {
    const newInv: Invoice = {
      ...invoiceData,
      id: createId('fac'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    setInvoices((prev) => [newInv, ...prev]);

    // If linked to reservation, update reservation's invoiceId
    if (newInv.reservationId) {
      setReservations((prev) =>
        prev.map((r) => (r.id === newInv.reservationId ? { ...r, invoiceId: newInv.id } : r))
      );
    }

    logAction('CREATE', 'FACTURE', newInv.id, `Création facture ${newInv.number} (Total TTC: ${newInv.totalTTC} FCFA)`);
    showToast(`Facture ${newInv.number} générée avec succès.`);
    return newInv;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );
    logAction('UPDATE', 'FACTURE', id, `Modification facture ID ${id}`);
    showToast('Facture mise à jour.');
  };

  const cancelInvoice = (id: string, reason: string): boolean => {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return false;

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              status: 'ANNULEE',
              cancellationReason: reason,
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );

    logAction('STATUS_CHANGE', 'FACTURE', id, `Annulation de la facture ${invoice.number}. Motif: ${reason}`);
    showToast(`Facture ${invoice.number} annulée.`);
    return true;
  };

  // Business Rule: "Une facture ne peut pas être supprimée après avoir reçu un paiement ; elle peut être annulée avec une raison."
  const deleteInvoice = (id: string): { success: boolean; error?: string } => {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return { success: false, error: 'Facture introuvable' };

    const relatedPayments = payments.filter((p) => p.invoiceId === id && !p.deletedAt);
    if (relatedPayments.length > 0 || invoice.paidAmount > 0) {
      const msg = 'Règle stricte : Une facture ayant reçu des règlements ne peut être supprimée. Vous pouvez l’annuler avec un motif.';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }

    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, deletedAt: new Date().toISOString() } : inv)));
    logAction('DELETE', 'FACTURE', id, `Suppression logique facture ${invoice.number}`);
    showToast(`Facture ${invoice.number} supprimée.`);
    return { success: true };
  };

  const restoreInvoice = (id: string) => {
    const invoice = invoices.find((record) => record.id === id);
    if (!invoice?.deletedAt) return;
    setInvoices((prev) => prev.map((record) =>
      record.id === id ? { ...record, deletedAt: null, updatedAt: new Date().toISOString() } : record
    ));
    logAction('UPDATE', 'FACTURE', id, `Restauration de la facture ${invoice.number} depuis les archives`);
    showToast(`Facture ${invoice.number} restaurée.`);
  };

  const duplicateInvoice = async (id: string): Promise<Invoice | null> => {
    const original = invoices.find((inv) => inv.id === id);
    if (!original) throw new Error('Facture introuvable');

    let nextNumber: string;
    try {
      nextNumber = await getNextDocumentNumber('invoice');
    } catch {
      return null;
    }
    const newInv: Invoice = {
      ...original,
      id: createId('fac'),
      number: nextNumber,
      reservationId: undefined, // Duplicated invoice is independent
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + settings.invoiceDueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paidAmount: 0,
      remainingAmount: original.totalTTC,
      status: 'BROUILLON',
      cancellationReason: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    setInvoices((prev) => [newInv, ...prev]);
    logAction('CREATE', 'FACTURE', newInv.id, `Duplication de la facture ${original.number} vers ${newInv.number}`);
    showToast(`Facture dupliquée sous la référence ${newInv.number}.`);
    return newInv;
  };

  const generateInvoiceFromReservation = async (reservationId: string): Promise<Invoice | null> => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return null;
    if (res.totalDays <= 0) {
      showToast('La durée de la réservation doit être supérieure à zéro.', 'error');
      return null;
    }

    const client = clients.find((c) => c.id === res.clientId);
    const vehicle = vehicles.find((v) => v.id === res.vehicleId);

    let nextNumber: string;
    try {
      nextNumber = await getNextDocumentNumber('invoice');
    } catch {
      return null;
    }
    const taxRate = settings.defaultTaxRatePercent ?? 18;

    // Items
    const items = [
      {
        id: createId('item'),
        description: `Location véhicule ${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'Véhicule'} - ${res.totalDays} jour(s)`,
        quantity: res.totalDays,
        unitPrice: Math.round(res.baseAmount / res.totalDays),
        discountPercent: 0,
        taxRatePercent: taxRate,
        totalHT: res.baseAmount,
        totalTax: Math.round((res.baseAmount * taxRate) / 100),
        totalTTC: Math.round(res.baseAmount * (1 + taxRate / 100)),
      },
      ...res.options.map((opt) => ({
        id: createId('item'),
        description: `Option : ${opt.name} (${opt.quantity}x)`,
        quantity: opt.quantity,
        unitPrice: opt.unitPrice,
        discountPercent: 0,
        taxRatePercent: taxRate,
        totalHT: opt.totalPrice,
        totalTax: Math.round((opt.totalPrice * taxRate) / 100),
        totalTTC: Math.round(opt.totalPrice * (1 + taxRate / 100)),
      })),
    ];

    const discountBase = items.reduce((acc, item) => acc + item.totalHT, 0);
    const requestedDiscount = Math.min(discountBase, Math.max(0, res.discountAmount || 0));
    const discountRatio = discountBase > 0 ? requestedDiscount / discountBase : 0;
    const discountedItems = items.map((item) => {
      const discountedHT = Math.max(0, Math.round(item.totalHT * (1 - discountRatio)));
      const tax = Math.round((discountedHT * item.taxRatePercent) / 100);
      return {
        ...item,
        discountPercent: discountRatio * 100,
        totalHT: discountedHT,
        totalTax: tax,
        totalTTC: discountedHT + tax,
      };
    });
    const subtotalHT = discountBase;
    const totalDiscount = discountedItems.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitPrice * item.discountPercent / 100),
      0
    );
    const totalTax = discountedItems.reduce((acc, item) => acc + item.totalTax, 0);
    const totalTTC = discountedItems.reduce((sum, item) => sum + item.totalTTC, 0);

    const newInv: Invoice = {
      id: createId('fac'),
      number: nextNumber,
      reservationId: res.id,
      clientId: res.clientId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + settings.invoiceDueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: discountedItems,
      subtotalHT,
      totalDiscount,
      totalTax,
      totalTTC,
      paidAmount: 0,
      remainingAmount: totalTTC,
      status: 'EMISE',
      termsAndConditions: 'Paiement à réception par virement bancaire ou Mobile Money.',
      notes: `Facturation contrat de location ${res.reference} - Client : ${client?.fullName}`,
      createdById: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    setInvoices((prev) => [newInv, ...prev]);
    setReservations((prev) => prev.map((r) => (r.id === res.id ? { ...r, invoiceId: newInv.id } : r)));

    logAction('INVOICE_GENERATE', 'FACTURE', newInv.id, `Génération automatique facture ${newInv.number} depuis contrat ${res.reference}`);
    showToast(`Facture ${newInv.number} émise pour ${client?.fullName}.`);
    return newInv;
  };

  // Payments
  // Business rule: "Le montant payé ne peut pas dépasser le montant total de la facture."
  const addPayment: AppContextType['addPayment'] = async (paymentData) => {
    if (paymentData.amount <= 0) {
      showToast('Le montant du paiement doit être supérieur à 0.', 'error');
      return { success: false, error: 'Montant invalide' };
    }

    if (paymentData.invoiceId) {
      const invoice = invoices.find((i) => i.id === paymentData.invoiceId);
      if (!invoice) return { success: false, error: 'Facture introuvable' };
      if (invoice.status === 'ANNULEE' || invoice.status === 'BROUILLON' || invoice.deletedAt) {
        return { success: false, error: 'Impossible de régler une facture en brouillon, annulée ou supprimée.' };
      }

      if (paymentData.amount > invoice.remainingAmount) {
        const errorMsg = `Le montant payé (${paymentData.amount.toLocaleString('fr-FR')} FCFA) dépasse le solde restant (${invoice.remainingAmount.toLocaleString('fr-FR')} FCFA).`;
        showToast(errorMsg, 'error');
        return { success: false, error: errorMsg };
      }

    }

    let receiptNumber = paymentData.receiptNumber;
    if (!receiptNumber) {
      try {
        receiptNumber = await getNextDocumentNumber('receipt');
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Numéro de reçu indisponible.' };
      }
    }

    const newPayment: Payment = {
      ...paymentData,
      receiptNumber,
      id: createId('pay'),
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };

    if (companyId && supabase) {
      const { data, error } = await supabase.rpc('record_invoice_payment', {
        target_company_id: companyId,
        payment_payload: newPayment,
      });
      if (error) {
        showToast(`Paiement non enregistré : ${error.message}`, 'error');
        return { success: false, error: error.message };
      }

      const result = data as { payment: Payment; invoice: Invoice | null };
      if (!result?.payment) {
        const message = 'La base de données n’a pas confirmé le paiement.';
        showToast(message, 'error');
        return { success: false, error: message };
      }
      setPayments((prev) => [result.payment, ...prev.filter((payment) => payment.id !== result.payment.id)]);
      if (result.invoice) {
        setInvoices((prev) => prev.map((invoice) => invoice.id === result.invoice?.id ? result.invoice : invoice));
      }
      logAction(
        'PAYMENT',
        'PAIEMENT',
        result.payment.id,
        `Règlement de ${result.payment.amount} FCFA reçu par ${result.payment.paymentMethod} (Reçu ${result.payment.receiptNumber})`
      );
      showToast(`Paiement de ${result.payment.amount.toLocaleString('fr-FR')} FCFA enregistré.`);
      return { success: true, payment: result.payment };
    }

    setPayments((prev) => [newPayment, ...prev]);
    logAction(
      'PAYMENT',
      'PAIEMENT',
      newPayment.id,
      `Règlement de ${newPayment.amount} FCFA reçu par ${newPayment.paymentMethod} (Reçu ${newPayment.receiptNumber})`
    );
    showToast(`Paiement de ${newPayment.amount.toLocaleString('fr-FR')} FCFA enregistré.`);
    return { success: true, payment: newPayment };
  };

  const deletePayment = async (id: string) => {
    const payment = payments.find((p) => p.id === id);
    if (!payment) return;

    if (companyId && supabase) {
      const { data, error } = await supabase.rpc('void_invoice_payment', {
        target_company_id: companyId,
        target_payment_id: id,
      });
      if (error) {
        showToast(`Paiement non annulé : ${error.message}`, 'error');
        return;
      }

      const result = data as { payment: Payment; invoice?: Invoice | null };
      setPayments((prev) => prev.map((record) => record.id === id ? result.payment : record));
      if (result.invoice) {
        setInvoices((prev) => prev.map((invoice) => invoice.id === result.invoice?.id ? result.invoice : invoice));
      }
      logAction('DELETE', 'PAIEMENT', id, `Annulation du reçu de paiement ${payment.receiptNumber}`);
      showToast(`Paiement ${payment.receiptNumber} annulé.`);
      return;
    }

    // If attached to invoice, reverse paidAmount
    if (payment.invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === payment.invoiceId) {
            const newPaid = Math.max(0, inv.paidAmount - payment.amount);
            const newRemaining = inv.totalTTC - newPaid;
            const newStatus =
              newPaid === 0 ? 'EMISE' : newRemaining === 0 ? 'PAYEE' : 'PARTIELLEMENT_PAYEE';
            return {
              ...inv,
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            };
          }
          return inv;
        })
      );
    }

    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p)));
    logAction('DELETE', 'PAIEMENT', id, `Annulation du reçu de paiement ${payment.receiptNumber}`);
    showToast(`Paiement ${payment.receiptNumber} supprimé.`);
  };

  // Expenses
  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt' | 'deletedAt'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: createId('dep'),
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    logAction(
      'CREATE',
      'DEPENSE',
      newExpense.id,
      `Dépense ${newExpense.reference} : ${newExpense.description} (${newExpense.amountTTC} FCFA)`
    );
    showToast(`Dépense de ${newExpense.amountTTC.toLocaleString('fr-FR')} FCFA enregistrée.`);
    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    logAction('UPDATE', 'DEPENSE', id, `Modification dépense ${id}`);
    showToast('Dépense mise à jour.');
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e)));
    logAction('DELETE', 'DEPENSE', id, `Suppression dépense ${id}`);
    showToast('Dépense supprimée.');
  };

  const restoreExpense = (id: string) => {
    const expense = expenses.find((record) => record.id === id);
    if (!expense?.deletedAt) return;
    setExpenses((prev) => prev.map((record) => record.id === id ? { ...record, deletedAt: null } : record));
    logAction('UPDATE', 'DEPENSE', id, `Restauration de la dépense ${expense.reference} depuis les archives`);
    showToast(`Dépense ${expense.reference} restaurée.`);
  };

  // Reset to initial demo data
  const resetDemoData = () => {
    if (isCloudMode) {
      showToast('La réinitialisation des données est désactivée dans l’espace entreprise.', 'error');
      return;
    }
    localStorage.removeItem('autoloc_users');
    localStorage.removeItem('autoloc_settings');
    localStorage.removeItem('autoloc_clients');
    localStorage.removeItem('autoloc_vehicles');
    localStorage.removeItem('autoloc_reservations');
    localStorage.removeItem('autoloc_invoices');
    localStorage.removeItem('autoloc_payments');
    localStorage.removeItem('autoloc_expenses');
    localStorage.removeItem('autoloc_audit_logs');

    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setSettings(initialCompanySettings);
    setClients(initialClients);
    setVehicles(initialVehicles);
    setReservations(initialReservations);
    setInvoices(initialInvoices);
    setPayments(initialPayments);
    setExpenses(initialExpenses);
    setAuditLogs(initialAuditLogs);

    showToast('Données de démonstration réinitialisées avec succès.');
  };

  return (
    <AppContext.Provider
      value={{
        isCloudMode,
        signOut,
        getNextDocumentNumber,
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        users,
        setUsers,
        addUser,
        updateUser,
        toggleUserActive,
        settings,
        updateSettings,
        clients,
        addClient,
        updateClient,
        deleteClient,
        restoreClient,
        vehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        restoreVehicle,
        reservations,
        addReservation,
        updateReservation,
        cancelReservation,
        completeReservation,
        deleteReservation,
        restoreReservation,
        checkVehicleAvailability,
        invoices,
        addInvoice,
        updateInvoice,
        cancelInvoice,
        deleteInvoice,
        restoreInvoice,
        duplicateInvoice,
        generateInvoiceFromReservation,
        payments,
        addPayment,
        deletePayment,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        restoreExpense,
        auditLogs,
        logAction,
        toasts,
        showToast,
        removeToast,
        activePreviewDoc,
        openPreviewDoc,
        closePreviewDoc,
        quickModal,
        setQuickModal,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
