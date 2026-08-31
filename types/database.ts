export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type UserStatus = 'trial' | 'active' | 'expired' | 'blocked';
export type AdminRoleType = 'superadmin' | 'admin' | 'support' | 'user';
export type ReleaseRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string; // References auth.users(id)
  full_name: string;
  email: string;
  avatar_url?: string | null;
  family_id: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  member_type: string;
  permission: UserRole;
  created_at: string;
  profile?: Profile;
}

export interface TrialPeriod {
  id: string;
  user_id: string;
  family_id: string;
  trial_started_at: string;
  trial_expires_at: string;
  status: UserStatus;
  is_blocked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminRole {
  id: string;
  user_id: string;
  email: string;
  role: AdminRoleType;
  requires_password_change?: boolean;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string | null;
  admin_email?: string | null;
  action: string;
  target_user_id?: string | null;
  target_family_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export type AuditLog = AdminLog;

export interface ReleaseRequest {
  id: string;
  family_id?: string | null;
  user_id: string;
  user_email: string;
  user_name?: string;
  reason: string;
  payment_proof_url?: string | null;
  status: ReleaseRequestStatus;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
}

// Financial entities (per module specified in prompt)
export interface Account {
  id: string;
  family_id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'cash' | 'other';
  balance: number;
  color?: string;
  institution?: string;
  is_salary_account?: boolean;
  salary_amount?: number;
  salary_day?: number;
  auto_credit_salary?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  user_id: string;
  account_id?: string | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  description: string;
  date: string;
  status: 'completed' | 'pending';
  created_at: string;
}

export interface Income {
  id: string;
  family_id: string;
  user_id: string;
  account_id?: string | null;
  description: string;
  amount: number;
  category: string;
  received_at: string;
  is_recurring: boolean;
  status: 'received' | 'expected';
  created_at: string;
}

export interface Expense {
  id: string;
  family_id: string;
  user_id: string;
  account_id?: string | null;
  description: string;
  amount: number;
  category: string;
  due_date: string;
  is_recurring: boolean;
  status: 'paid' | 'pending';
  created_at: string;
}

export interface CreditCard {
  id: string;
  family_id: string;
  user_id: string;
  name: string;
  last_digits?: string;
  credit_limit: number;
  current_bill: number;
  closing_day: number;
  due_day: number;
  color?: string;
  created_at: string;
}

export interface CreditCardPurchase {
  id: string;
  family_id: string;
  card_id: string;
  description: string;
  amount: number;
  category: string;
  purchase_date: string;
  total_installments: number;
  created_at: string;
}

export interface CreditCardInstallment {
  id: string;
  purchase_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string;
  is_paid: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  card_id: string;
  family_id: string;
  month: number;
  year: number;
  total_amount: number;
  status: 'open' | 'closed' | 'paid';
  due_date: string;
  created_at: string;
}

export interface Loan {
  id: string;
  family_id: string;
  user_id: string;
  title: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  total_installments: number;
  paid_installments: number;
  lender: string;
  start_date: string;
  created_at: string;
}

export interface LoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  is_paid: boolean;
  created_at: string;
}

export interface Debt {
  id: string;
  family_id: string;
  user_id: string;
  creditor: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'renegotiating' | 'settled';
  created_at: string;
}

export interface Goal {
  id: string;
  family_id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
  created_at: string;
}

export interface Budget {
  id: string;
  family_id: string;
  category: string;
  allocated_amount: number;
  month: number;
  year: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  family_id?: string;
  title: string;
  message: string;
  type?: string;
  reference_id?: string;
  target_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  family_id?: string | null;
  device_type: string;
  push_token?: string | null;
  endpoint?: string | null;
  subscription_data: Record<string, unknown> | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  family_id?: string | null;
  type: string;
  reference_id: string;
  title: string;
  message: string;
  sent_at: string;
  read_at?: string | null;
  status: 'sent' | 'failed' | 'read';
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  family_id?: string | null;
  bills_enabled: boolean;
  cards_enabled: boolean;
  invoices_enabled: boolean;
  installments_enabled: boolean;
  loans_enabled: boolean;
  budget_enabled: boolean;
  goals_enabled: boolean;
  trial_enabled: boolean;
  advance_days: number; // 3, 1, or 0
  quiet_hours_start: string; // e.g., '21:00'
  quiet_hours_end: string; // e.g., '08:00'
  created_at: string;
  updated_at: string;
}
