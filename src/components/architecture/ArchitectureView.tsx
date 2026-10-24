import React, { useState } from 'react';
import {
  Code2,
  Database,
  Server,
  Layers,
  Copy,
  Check,
  FileCode,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DJANGO_MODELS' | 'SQL_NEON' | 'REST_ENDPOINTS' | 'NEXTJS_TREE'>('DJANGO_MODELS');
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  const djangoModelsCode = `# backend/autoloc/models.py
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Administrateur'
    MANAGER = 'MANAGER', 'Gestionnaire'
    ACCOUNTANT = 'ACCOUNTANT', 'Comptable'
    EMPLOYEE = 'EMPLOYEE', 'Employé'

class ClientType(models.TextChoices):
    PARTICULIER = 'PARTICULIER', 'Particulier'
    ENTREPRISE = 'ENTREPRISE', 'Entreprise'

class VehicleStatus(models.TextChoices):
    DISPONIBLE = 'DISPONIBLE', 'Disponible'
    LOUE = 'LOUE', 'Loué'
    MAINTENANCE = 'MAINTENANCE', 'En maintenance'
    HORS_SERVICE = 'HORS_SERVICE', 'Hors service'

class Client(models.Model):
    type = models.CharField(max_length=20, choices=ClientType.choices, default=ClientType.PARTICULIER)
    full_name = models.CharField(max_length=200, db_index=True)
    company_name = models.CharField(max_length=200, blank=True, null=True)
    tax_number = models.CharField(max_length=50, blank=True, null=True, help_text="NINEA ou Numéro fiscal")
    rccm = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=30)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, default='Dakar')
    driver_license_number = models.CharField(max_length=50, blank=True, null=True)
    driver_license_expiry = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(blank=True, null=True, db_index=True)

class Vehicle(models.Model):
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    license_plate = models.CharField(max_length=30, unique=True, db_index=True)
    year = models.PositiveIntegerField()
    category = models.CharField(max_length=50) # SUV, BERLINE, etc.
    transmission = models.CharField(max_length=20, default='AUTOMATIQUE')
    fuel = models.CharField(max_length=20, default='DIESEL')
    current_mileage = models.PositiveIntegerField(default=0)
    daily_rate = models.DecimalField(max_digits=12, decimal_places=0) # FCFA
    weekly_rate = models.DecimalField(max_digits=12, decimal_places=0)
    monthly_rate = models.DecimalField(max_digits=12, decimal_places=0)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=0, default=200000)
    status = models.CharField(max_length=20, choices=VehicleStatus.choices, default=VehicleStatus.DISPONIBLE)
    insurance_expiry = models.DateField()
    insurance_company = models.CharField(max_length=100)
    technical_inspection_expiry = models.DateField()
    last_oil_change_mileage = models.PositiveIntegerField(default=0)
    next_oil_change_mileage = models.PositiveIntegerField(default=10000)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

class Reservation(models.Model):
    reference = models.CharField(max_length=50, unique=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='reservations')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='reservations')
    start_date = models.DateField()
    start_time = models.TimeField(default='09:00')
    end_date = models.DateField()
    end_time = models.TimeField(default='18:00')
    pickup_location = models.CharField(max_length=200, default='Agence Centrale')
    return_location = models.CharField(max_length=200, default='Agence Centrale')
    total_days = models.PositiveIntegerField(default=1)
    base_amount = models.DecimalField(max_digits=12, decimal_places=0)
    total_estimated_amount = models.DecimalField(max_digits=12, decimal_places=0)
    deposit_required = models.DecimalField(max_digits=12, decimal_places=0)
    deposit_status = models.CharField(max_length=30, default='NON_VERSEE')
    status = models.CharField(max_length=30, default='CONFIRMEE')
    start_mileage = models.PositiveIntegerField(blank=True, null=True)
    return_mileage = models.PositiveIntegerField(blank=True, null=True)
    contract_signed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    def clean(self):
        # Règle métier : date retour >= date départ
        if self.end_date < self.start_date:
            raise ValidationError("La date de retour ne peut pas précéder la date de départ.")
        # Règle métier : interdiction de chevauchement de dates
        overlaps = Reservation.objects.filter(
            vehicle=self.vehicle,
            deleted_at__isnull=True,
            start_date__lte=self.end_date,
            end_date__gte=self.start_date
        ).exclude(id=self.id).exclude(status__in=['ANNULEE', 'TERMINEE'])
        if overlaps.exists():
            raise ValidationError("Ce véhicule est déjà réservé sur cet intervalle de dates.")

class Invoice(models.Model):
    number = models.CharField(max_length=50, unique=True, db_index=True)
    reservation = models.OneToOneField(Reservation, on_delete=models.SET_NULL, null=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='invoices')
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    subtotal_ht = models.DecimalField(max_digits=12, decimal_places=0)
    total_discount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_tax = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_ttc = models.DecimalField(max_digits=12, decimal_places=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=0)
    status = models.CharField(max_length=30, default='EMISE') # BROUILLON, EMISE, PARTIELLE, PAYEE, EN_RETARD, ANNULEE
    cancellation_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    def delete(self, *args, **kwargs):
        # Règle métier stricte
        if self.paid_amount > 0:
            raise ValidationError("Une facture ayant reçu un paiement ne peut être supprimée.")
        super().delete(*args, **kwargs)

class Payment(models.Model):
    receipt_number = models.CharField(max_length=50, unique=True, db_index=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, null=True, blank=True, related_name='payments')
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    payment_method = models.CharField(max_length=30) # ESPECES, MOBILE_MONEY, VIREMENT_BANCAIRE, etc.
    payment_type = models.CharField(max_length=30, default='FACTURE')
    reference_number = models.CharField(max_length=100, blank=True)
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

class Expense(models.Model):
    reference = models.CharField(max_length=50, unique=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    category = models.CharField(max_length=50) # CARBURANT, ENTRETIEN, etc.
    description = models.CharField(max_length=255)
    amount_ht = models.DecimalField(max_digits=12, decimal_places=0)
    tax_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18.0)
    amount_tax = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    amount_ttc = models.DecimalField(max_digits=12, decimal_places=0)
    date = models.DateField(default=timezone.now)
    vendor_name = models.CharField(max_length=150)
    is_deductible_tax = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
`;

  const sqlPostgresCode = `-- PostgreSQL / Neon Schema
-- Database: autoloc_production

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL DEFAULT 'PARTICULIER',
    full_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    tax_number VARCHAR(50), -- NINEA
    rccm VARCHAR(50),
    email VARCHAR(150),
    phone VARCHAR(30) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100) DEFAULT 'Dakar',
    driver_license_number VARCHAR(50),
    driver_license_expiry DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_clients_search ON clients (full_name, tax_number, phone);

-- 2. Table Véhicules
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    license_plate VARCHAR(30) UNIQUE NOT NULL,
    year INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    transmission VARCHAR(20) DEFAULT 'AUTOMATIQUE',
    fuel VARCHAR(20) DEFAULT 'DIESEL',
    current_mileage INT DEFAULT 0,
    daily_rate NUMERIC(12, 0) NOT NULL,
    weekly_rate NUMERIC(12, 0) NOT NULL,
    monthly_rate NUMERIC(12, 0) NOT NULL,
    deposit_amount NUMERIC(12, 0) DEFAULT 200000,
    status VARCHAR(30) DEFAULT 'DISPONIBLE',
    insurance_expiry DATE NOT NULL,
    insurance_company VARCHAR(100) NOT NULL,
    technical_inspection_expiry DATE NOT NULL,
    last_oil_change_mileage INT DEFAULT 0,
    next_oil_change_mileage INT DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_vehicles_status ON vehicles (status);

-- 3. Table Réservations & Contrats
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    start_time TIME DEFAULT '09:00',
    end_date DATE NOT NULL,
    end_time TIME DEFAULT '18:00',
    pickup_location VARCHAR(200) DEFAULT 'Agence Centrale',
    return_location VARCHAR(200) DEFAULT 'Agence Centrale',
    total_days INT NOT NULL DEFAULT 1,
    base_amount NUMERIC(12, 0) NOT NULL,
    total_estimated_amount NUMERIC(12, 0) NOT NULL,
    deposit_required NUMERIC(12, 0) NOT NULL,
    deposit_status VARCHAR(30) DEFAULT 'NON_VERSEE',
    status VARCHAR(30) DEFAULT 'CONFIRMEE',
    start_mileage INT,
    return_mileage INT,
    contract_signed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

-- 4. Table Factures
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(50) UNIQUE NOT NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal_ht NUMERIC(12, 0) NOT NULL,
    total_discount NUMERIC(12, 0) DEFAULT 0,
    total_tax NUMERIC(12, 0) DEFAULT 0,
    total_ttc NUMERIC(12, 0) NOT NULL,
    paid_amount NUMERIC(12, 0) DEFAULT 0,
    remaining_amount NUMERIC(12, 0) NOT NULL,
    status VARCHAR(30) DEFAULT 'EMISE',
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_paid_lte_total CHECK (paid_amount <= total_ttc)
);
CREATE INDEX idx_invoices_status ON invoices (status, due_date);

-- 5. Table Paiements & Encaissements
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 0) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_type VARCHAR(30) DEFAULT 'FACTURE',
    reference_number VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 6. Table Dépenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount_ht NUMERIC(12, 0) NOT NULL,
    tax_rate_percent NUMERIC(5, 2) DEFAULT 18.0,
    amount_tax NUMERIC(12, 0) DEFAULT 0,
    amount_ttc NUMERIC(12, 0) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_name VARCHAR(150) NOT NULL,
    is_deductible_tax BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
`;

  const nextJsTree = `autoloc-prestige/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx       # KPI, graphiques, trésorerie
│   │   ├── clients/page.tsx         # Gestion clients Particuliers & Entreprises
│   │   ├── vehicules/page.tsx       # Flotte, tarifs, alertes vidange/assurance
│   │   ├── reservations/page.tsx    # Réservations, contrats, anti-chevauchement
│   │   ├── factures/page.tsx        # Facturation TVA 18%, duplication, PDF
│   │   ├── paiements/page.tsx       # Règlements Wave, virements, reçus
│   │   ├── depenses/page.tsx        # Charges flotte & frais d'exploitation
│   │   ├── comptabilite/page.tsx    # Trésorerie, résultat, solde TVA
│   │   ├── rapports/page.tsx        # Rentabilité par véhicule & balance âgée
│   │   ├── parametres/page.tsx      # NINEA, devise, utilisateurs & audit log
│   │   └── layout.tsx               # Sidebar fixe, navigation, header
│   ├── api/                         # Proxy Next.js vers API Django
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/                      # Sidebar, Header
│   ├── common/                      # Modal, StatusBadge, Toast
│   ├── documents/                   # Facture PDF, Reçu de paiement, Contrat
│   └── forms/                       # Zod validation schemas
├── lib/
│   ├── api-client.ts                # Axios configuré avec token JWT Supabase
│   ├── formatters.ts                # Calculs TVA, devises FCFA, dates
│   └── supabase.ts                  # Client Supabase Auth
└── types/                           # Interfaces TypeScript
`;

  const restEndpoints = [
    { method: 'GET / POST', path: '/api/v1/clients/', desc: 'Liste filtrée et création de client (Zod / Serializer)' },
    { method: 'GET / PUT / DELETE', path: '/api/v1/clients/{id}/', desc: 'Détail, mise à jour et suppression logique (deleted_at)' },
    { method: 'GET / POST', path: '/api/v1/vehicles/', desc: 'Parc automobile avec filtres statut & alertes révision' },
    { method: 'GET / POST', path: '/api/v1/reservations/', desc: 'Vérification calendrier (chevauchements) et réservation' },
    { method: 'POST', path: '/api/v1/reservations/{id}/convert-contract/', desc: 'Transformation en contrat actif & génération facture' },
    { method: 'POST', path: '/api/v1/reservations/{id}/complete/', desc: 'Clôture restitution : kilométrage retour et carburant' },
    { method: 'GET / POST', path: '/api/v1/invoices/', desc: 'Facturation conforme avec calcul TVA 18% et échéances' },
    { method: 'POST', path: '/api/v1/invoices/{id}/cancel/', desc: 'Annulation avec motif obligatoire (non supprimable si payée)' },
    { method: 'GET / POST', path: '/api/v1/payments/', desc: 'Enregistrement règlement partiel/solde et émission reçu PDF' },
    { method: 'GET / POST', path: '/api/v1/expenses/', desc: 'Imputation dépense par véhicule ou générale d’exploitation' },
    { method: 'GET', path: '/api/v1/accounting/journal/', desc: 'Journal général de trésorerie (recettes/dépenses/TVA)' },
    { method: 'GET', path: '/api/v1/reports/vehicle-roi/', desc: 'Rentabilité nette calculée par véhicule de la flotte' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-blue-600 text-white">
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Livrables Techniques & Architecture Backend</h2>
            <p className="text-xs text-slate-300">
              Spécifications complètes Django REST Framework, base Neon PostgreSQL, arborescence Next.js et API REST
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('DJANGO_MODELS')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'DJANGO_MODELS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Server className="h-4 w-4" />
          <span>Modèles Django (models.py)</span>
        </button>

        <button
          onClick={() => setActiveTab('SQL_NEON')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'SQL_NEON'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Schéma SQL (PostgreSQL / Neon)</span>
        </button>

        <button
          onClick={() => setActiveTab('REST_ENDPOINTS')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'REST_ENDPOINTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Endpoints REST & Permissions</span>
        </button>

        <button
          onClick={() => setActiveTab('NEXTJS_TREE')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'NEXTJS_TREE'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCode className="h-4 w-4" />
          <span>Arborescence Next.js (App Router)</span>
        </button>
      </div>

      {/* TAB 1: DJANGO */}
      {activeTab === 'DJANGO_MODELS' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-md overflow-hidden relative">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
            <span className="text-xs font-mono text-emerald-400 font-bold">backend/autoloc/models.py</span>
            <button
              onClick={() => copyCode('DJANGO', djangoModelsCode)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded"
            >
              {copied === 'DJANGO' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied === 'DJANGO' ? 'Copié !' : 'Copier le code'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[600px]">
            {djangoModelsCode}
          </pre>
        </div>
      )}

      {/* TAB 2: SQL NEON */}
      {activeTab === 'SQL_NEON' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-md overflow-hidden relative">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
            <span className="text-xs font-mono text-blue-400 font-bold">database/schema.sql (Neon PostgreSQL DDL)</span>
            <button
              onClick={() => copyCode('SQL', sqlPostgresCode)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded"
            >
              {copied === 'SQL' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied === 'SQL' ? 'Copié !' : 'Copier le script SQL'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[600px]">
            {sqlPostgresCode}
          </pre>
        </div>
      )}

      {/* TAB 3: REST ENDPOINTS */}
      {activeTab === 'REST_ENDPOINTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Spécification des Endpoints de l’API REST Django
            </h3>
            <span className="text-xs text-slate-400">Authentification Bearer JWT (Supabase Auth)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Méthode</th>
                  <th className="py-3 px-4">Route Endpoint</th>
                  <th className="py-3 px-4">Description & Règle Métier Appliquée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restEndpoints.map((ep, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{ep.method}</td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-semibold">{ep.path}</td>
                    <td className="py-3 px-4 text-slate-700">{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: NEXTJS TREE */}
      {activeTab === 'NEXTJS_TREE' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-md overflow-hidden relative">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
            <span className="text-xs font-mono text-amber-400 font-bold">Structure Arborescence Next.js 15 (App Router)</span>
            <button
              onClick={() => copyCode('TREE', nextJsTree)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded"
            >
              {copied === 'TREE' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied === 'TREE' ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {nextJsTree}
          </pre>
        </div>
      )}
    </div>
  );
};
