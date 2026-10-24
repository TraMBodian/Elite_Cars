import React from 'react';
import { useApp } from './context/AppContext';
import AuthenticationGate from './components/auth/AuthenticationGate';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { DocumentPreviewModal } from './components/invoices/InvoiceDocument';
import { QuickActionModals } from './components/common/QuickActionModals';

// Feature Views
import { DashboardView } from './components/dashboard/DashboardView';
import { ClientsView } from './components/clients/ClientsView';
import { VehiclesView } from './components/vehicles/VehiclesView';
import { ReservationsView } from './components/reservations/ReservationsView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { PaymentsView } from './components/payments/PaymentsView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { AccountingView } from './components/accounting/AccountingView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { ArchitectureView } from './components/architecture/ArchitectureView';
import { ArchivesView } from './components/archives/ArchivesView';
import { canAccessTab } from './utils/permissions';

const MainContent: React.FC = () => {
  const { activeTab, currentUser, setActiveTab } = useApp();

  React.useEffect(() => {
    if (!canAccessTab(currentUser.role, activeTab)) setActiveTab('dashboard');
  }, [activeTab, currentUser.role, setActiveTab]);

  const renderActiveView = () => {
    if (!canAccessTab(currentUser.role, activeTab)) return <DashboardView />;
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'clients':
        return <ClientsView />;
      case 'vehicules':
        return <VehiclesView />;
      case 'reservations':
        return <ReservationsView />;
      case 'factures':
        return <InvoicesView />;
      case 'paiements':
        return <PaymentsView />;
      case 'depenses':
        return <ExpensesView />;
      case 'comptabilite':
        return <AccountingView />;
      case 'rapports':
        return <ReportsView />;
      case 'archives':
        return <ArchivesView />;
      case 'parametres':
        return <SettingsView />;
      case 'architecture':
        return <ArchitectureView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Top Header */}
        <Header />

        {/* Scrollable Viewport Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderActiveView()}</div>
        </main>
      </div>

      {/* Printable Document Modal (Invoice, Receipt, Contract) */}
      <DocumentPreviewModal />

      {/* Global Quick Action Trigger Modals */}
      <QuickActionModals />

      {/* Floating Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthenticationGate>
      <MainContent />
    </AuthenticationGate>
  );
}
