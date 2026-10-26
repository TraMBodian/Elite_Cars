import React, { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppProvider, AppInitialData } from '../../context/AppContext';
import { initialCompanySettings } from '../../data/mockData';
import { CompanySettings, User, UserRole } from '../../types';
import {
  hasInvalidSupabaseUrl,
  hasPartialSupabaseConfig,
  isSupabaseConfigured,
  supabase,
} from '../../lib/supabase';

interface MembershipRow {
  company_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
}

interface CloudBootstrap {
  companyId: string;
  initialData: AppInitialData;
}

const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const companyDefaults: CompanySettings = {
  ...initialCompanySettings,
  name: 'Elite Cars',
  legalForm: '',
  ninea: '',
  rccm: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'Sénégal',
  bankName: '',
  bankAccountIban: '',
  bankAccountRib: '',
  waveNumber: '',
  orangeMoneyNumber: '',
  logoText: 'ELITE CARS',
  invoicePrefix: 'FAC-',
  footerNotice: '',
};

const toUser = (membership: MembershipRow, authUserId?: string): User => ({
  id: authUserId ?? membership.email,
  name: membership.name,
  email: membership.email,
  phone: membership.phone ?? undefined,
  role: membership.role,
  active: membership.active,
  createdAt: membership.created_at,
});

const loadCompanyData = async (session: Session): Promise<CloudBootstrap> => {
  if (!supabase) throw new Error('La connexion Supabase n’est pas configurée.');

  const { data: memberships, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id, name, email, phone, role, active, created_at')
    .eq('user_id', session.user.id)
    .eq('active', true);

  if (membershipError) throw membershipError;
  if (!memberships?.length) {
    throw new Error('Ce compte n’est pas encore associé à Elite Cars. Contactez l’administrateur.');
  }
  if (memberships.length !== 1) {
    throw new Error('Ce compte est associé à plusieurs entreprises. Contactez l’administrateur.');
  }

  const membership = memberships[0] as MembershipRow;
  const [{ data: company, error: companyError }, { data: records, error: recordsError }, { data: staff, error: staffError }] =
    await Promise.all([
      supabase.from('companies').select('name').eq('id', membership.company_id).single(),
      supabase
        .from('business_records')
        .select('entity_type, id, payload')
        .eq('company_id', membership.company_id),
      supabase
        .from('company_members')
        .select('company_id, name, email, phone, role, active, created_at, user_id')
        .eq('company_id', membership.company_id)
        .eq('active', true),
    ]);

  if (companyError) throw companyError;
  if (recordsError) throw recordsError;
  if (staffError) throw staffError;

  const rows = records ?? [];
  const getCollection = <T,>(entityType: string): T[] =>
    rows.filter((row) => row.entity_type === entityType).map((row) => row.payload as T);
  const savedSettings = rows.find(
    (row) => row.entity_type === 'settings' && row.id === 'company-settings'
  )?.payload as Partial<CompanySettings> | undefined;

  const users: User[] = (staff ?? []).map((row) =>
    toUser(row as MembershipRow, row.user_id)
  );
  const currentUser = users.find((user) => user.id === session.user.id);
  if (!currentUser) {
    throw new Error('Le profil de cet utilisateur est incomplet. Contactez l’administrateur.');
  }

  return {
    companyId: membership.company_id,
    initialData: {
      currentUser,
      users,
      settings: { ...companyDefaults, ...savedSettings, name: savedSettings?.name ?? company.name },
      clients: getCollection<AppInitialData['clients'][number]>('clients'),
      vehicles: getCollection<AppInitialData['vehicles'][number]>('vehicles'),
      reservations: getCollection<AppInitialData['reservations'][number]>('reservations'),
      invoices: getCollection<AppInitialData['invoices'][number]>('invoices'),
      payments: getCollection<AppInitialData['payments'][number]>('payments'),
      expenses: getCollection<AppInitialData['expenses'][number]>('expenses'),
      auditLogs: getCollection<AppInitialData['auditLogs'][number]>('audit_logs'),
    },
  };
};

const AuthenticationGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [cloudBootstrap, setCloudBootstrap] = useState<CloudBootstrap | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError('');
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const resetIdleTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void supabase!.auth.signOut().then(({ error }) => {
          if (error) {
            setCloudBootstrap(null);
            setAuthError(`Déconnexion automatique impossible : ${error.message}`);
            return;
          }
          setAuthMessage('Votre session a été fermée après 15 minutes sans activité.');
        }).catch((error: unknown) => {
          setCloudBootstrap(null);
          setAuthError(
            `Déconnexion automatique impossible : ${
              error instanceof Error ? error.message : 'une erreur inattendue est survenue.'
            }`,
          );
        });
      }, SESSION_IDLE_TIMEOUT_MS);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointermove',
      'keydown',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimeout, { passive: true });
    });
    resetIdleTimeout();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimeout);
      });
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session || !supabase) {
      setCloudBootstrap(null);
      setLoadingCompany(false);
      return;
    }

    let active = true;
    setLoadingCompany(true);
    setAuthError('');

    void loadCompanyData(session)
      .then((bootstrap) => {
        if (active) setCloudBootstrap(bootstrap);
      })
      .catch((error: unknown) => {
        if (active) {
          setCloudBootstrap(null);
          setAuthError(error instanceof Error ? error.message : 'Impossible de charger les données de l’entreprise.');
        }
      })
      .finally(() => {
        if (active) setLoadingCompany(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setAuthError('');
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setAuthError(error.message);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(`Déconnexion impossible : ${error.message}`);
  };

  if (!isSupabaseConfigured) {
    if (hasPartialSupabaseConfig || !import.meta.env.DEV) {
      return (
        <SetupMessage>
          {hasInvalidSupabaseUrl
            ? 'La configuration Supabase est invalide : vérifiez VITE_SUPABASE_URL dans les variables d’environnement Vercel. Elle doit commencer par https:// et correspondre à l’URL de votre projet Supabase.'
            : 'Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer les comptes et les données partagées.'}
        </SetupMessage>
      );
    }

    return (
      <AppProvider>
        {children}
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 shadow">
          Mode démonstration — données locales non partagées
        </div>
      </AppProvider>
    );
  }

  if (checkingSession || loadingCompany) {
    return <SetupMessage>Connexion à l’espace Elite Cars…</SetupMessage>;
  }

  if (session && cloudBootstrap) {
    return (
      <AppProvider
        key={session.user.id}
        companyId={cloudBootstrap.companyId}
        initialData={cloudBootstrap.initialData}
      >
        {children}
      </AppProvider>
    );
  }

  if (session && authError) {
    return (
      <SetupMessage>
        <p>{authError}</p>
        <button onClick={handleSignOut} className="mt-4 font-semibold text-blue-700 hover:underline">
          Se déconnecter
        </button>
      </SetupMessage>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSignIn} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 p-2">
            <img src="/elite-cars-logo.webp" alt="Elite Cars" className="h-auto w-36" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Elite Cars</h1>
            <p className="text-sm text-slate-500">Connexion à votre espace de gestion</p>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="login-email">
          Adresse e-mail
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="login-password">
          Mot de passe
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {authMessage && <p role="status" className="mb-4 text-sm text-slate-600">{authMessage}</p>}
        {authError && <p role="alert" className="mb-4 text-sm text-red-700">{authError}</p>}
        <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Se connecter
        </button>
      </form>
    </div>
  );
};

const SetupMessage: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-sm text-slate-700">
    <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
  </div>
);

export default AuthenticationGate;
