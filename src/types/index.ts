export type UserRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
  phone?: string;
  createdAt: string;
}

export type ClientType = 'PARTICULIER' | 'ENTREPRISE';

export interface Client {
  id: string;
  type: ClientType;
  fullName: string;
  companyName?: string;
  taxNumber?: string; // NINEA / Numéro Fiscal / SIRET
  rccm?: string; // Registre de commerce
  email: string;
  phone: string;
  address: string;
  city: string;
  driverLicenseNumber?: string;
  driverLicenseExpiry?: string;
  notes?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export type VehicleStatus = 'DISPONIBLE' | 'LOUE' | 'MAINTENANCE' | 'HORS_SERVICE';
export type FuelType = 'ESSENCE' | 'DIESEL' | 'HYBRIDE' | 'ELECTRIQUE';
export type TransmissionType = 'AUTOMATIQUE' | 'MANUELLE';
export type VehicleCategory = 'CITADINE' | 'BERLINE' | 'SUV' | 'UTILITAIRE' | 'PICKUP' | 'LUXE';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  licensePlate: string; // Ex: DK-8932-AZ
  year: number;
  category: VehicleCategory;
  transmission: TransmissionType;
  fuel: FuelType;
  seats: number;
  currentMileage: number; // km
  dailyRate: number; // FCFA/jour
  weeklyRate: number; // FCFA/semaine
  monthlyRate: number; // FCFA/mois
  depositAmount: number; // Caution requise
  status: VehicleStatus;
  color?: string;
  imageUrl?: string;
  
  // Suivi technique & administratif
  insuranceExpiry: string; // Date fin assurance
  insuranceCompany: string;
  technicalInspectionExpiry: string; // Date visite technique
  lastOilChangeMileage: number;
  nextOilChangeMileage: number;
  nextOilChangeDate?: string;
  
  notes?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export type ReservationStatus = 
  | 'EN_ATTENTE' 
  | 'CONFIRMEE' 
  | 'ACTIVE' 
  | 'TERMINEE' 
  | 'ANNULEE' 
  | 'EN_RETARD';

export interface ReservationOption {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  chargeType: 'PAR_JOUR' | 'FIXE';
}

export interface Reservation {
  id: string;
  reference: string; // Ex: RES-2026-0042
  clientId: string;
  vehicleId: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  pickupLocation: string;
  returnLocation: string;
  rateTypeApplied: 'JOURNALIER' | 'HEBDOMADAIRE' | 'MENSUEL' | 'PERSONNALISE';
  baseRate: number;
  totalDays: number;
  options: ReservationOption[];
  totalOptionsAmount: number;
  baseAmount: number;
  discountAmount: number;
  totalEstimatedAmount: number;
  
  // Caution & Kilométrage
  depositRequired: number;
  depositStatus: 'NON_VERSEE' | 'VERSEE' | 'RESTITUEE' | 'RETENUE_PARTIELLE';
  depositReturnedAmount?: number;
  
  startMileage?: number;
  returnMileage?: number;
  fuelLevelStart?: string; // Ex: "100%", "3/4"
  fuelLevelReturn?: string;
  
  status: ReservationStatus;
  notes?: string;
  cancellationReason?: string;
  contractSigned: boolean;
  invoiceId?: string; // ID de la facture générée
  createdById: string;
  createdAt: string;
  deletedAt?: string | null;
}

export type InvoiceStatus = 
  | 'BROUILLON' 
  | 'EMISE' 
  | 'PARTIELLEMENT_PAYEE' 
  | 'PAYEE' 
  | 'EN_RETARD' 
  | 'ANNULEE';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRatePercent: number; // Ex: 18 pour 18% TVA
  totalHT: number;
  totalTax: number;
  totalTTC: number;
}

export interface Invoice {
  id: string;
  number: string; // Ex: FAC-2026-0001
  reservationId?: string;
  clientId: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  subtotalHT: number;
  totalDiscount: number;
  totalTax: number;
  totalTTC: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  termsAndConditions?: string;
  notes?: string;
  cancellationReason?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type PaymentMethod = 
  | 'ESPECES' 
  | 'MOBILE_MONEY' // Wave, Orange Money, Free Money
  | 'VIREMENT_BANCAIRE' 
  | 'CARTE_BANCAIRE' 
  | 'CHEQUE';

export type PaymentType = 'FACTURE' | 'CAUTION_ENTREE' | 'RESTITUTION_CAUTION' | 'ENCAISSEMENT_DIRECT';

export interface Payment {
  id: string;
  receiptNumber: string; // Ex: REC-2026-0001
  invoiceId?: string;
  reservationId?: string;
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  referenceNumber?: string; // Numéro transaction Wave/Orange ou chèque/virement
  date: string;
  notes?: string;
  recordedById: string;
  createdAt: string;
  deletedAt?: string | null;
}

export type ExpenseCategory = 
  | 'CARBURANT' 
  | 'ENTRETIEN' 
  | 'REPARATION' 
  | 'ASSURANCE' 
  | 'AMENDE' 
  | 'SALAIRE' 
  | 'LOYER' 
  | 'TAXE' 
  | 'MARKETING' 
  | 'DIVERS';

export interface Expense {
  id: string;
  reference: string; // Ex: DEP-2026-0001
  vehicleId?: string; // Associé à un véhicule ou charge générale
  category: ExpenseCategory;
  description: string;
  amountHT: number;
  taxRatePercent: number; // TVA déductible
  amountTax: number;
  amountTTC: number;
  date: string;
  paymentMethod: PaymentMethod;
  vendorName: string;
  receiptAttachmentName?: string;
  isDeductibleTax: boolean;
  recordedById: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface CompanySettings {
  name: string;
  legalForm: string; // SARL, SAS, SUARL
  ninea: string;
  rccm: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  currency: string; // 'FCFA', 'EUR', 'USD'
  currencySymbol: string;
  defaultTaxRatePercent: number; // 18%
  invoicePrefix: string; // 'FAC-'
  invoiceDueDays: number; // 15 jours
  bankName: string;
  bankAccountIban: string;
  bankAccountRib: string;
  waveNumber?: string;
  orangeMoneyNumber?: string;
  logoText?: string;
  footerNotice?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT' | 'INVOICE_GENERATE' | 'STATUS_CHANGE' | 'LOGIN';
  entityType: 'CLIENT' | 'VEHICULE' | 'RESERVATION' | 'FACTURE' | 'PAIEMENT' | 'DEPENSE' | 'PARAMETRES';
  entityId: string;
  details: string;
  timestamp: string;
}
