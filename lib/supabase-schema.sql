-- ====================================================================
-- SCHEMA COMPLETO E DEFINITIVO DO BANCO DE DADOS SUPABASE (PostgreSQL)
-- ====================================================================

-- 1. HABILITAR EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. LIMPAR TABELAS ANTIGAS PARA EVITAR CONFLITOS DE COLUNAS
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.loan_installments CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.credit_card_installments CASCADE;
DROP TABLE IF EXISTS public.credit_card_purchases CASCADE;
DROP TABLE IF EXISTS public.credit_cards CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.income CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.release_requests CASCADE;
DROP TABLE IF EXISTS public.admin_logs CASCADE;
DROP TABLE IF EXISTS public.admin_roles CASCADE;
DROP TABLE IF EXISTS public.trial_periods CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;

-- 3. TABELA DE FAMÍLIAS
CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE MEMBROS DA FAMÍLIA
CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_type TEXT DEFAULT 'Titular',
    permission TEXT NOT NULL DEFAULT 'owner' CHECK (permission IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- 6. TABELA DE PERÍODOS DE TESTE (TRIAL 7 DIAS)
CREATE TABLE public.trial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'blocked')),
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    payment_proof_url TEXT,
    payment_status TEXT DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE ROLES ADMINISTRATIVAS (SUPERADMIN)
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'admin', 'support', 'user')),
    requires_password_change BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE LOGS ADMINISTRATIVOS
CREATE TABLE public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT,
    action TEXT NOT NULL,
    target_user_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA DE SOLICITAÇÕES DE LIBERAÇÃO DE ACESSO
CREATE TABLE public.release_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_name TEXT DEFAULT 'Usuário',
    reason TEXT NOT NULL,
    payment_proof_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELAS DO MÓDULO FINANCEIRO
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'checking' CHECK (type IN ('checking', 'savings', 'investment', 'cash', 'other')),
    balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    color TEXT DEFAULT '#3b82f6',
    institution TEXT DEFAULT 'Banco',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    category TEXT NOT NULL DEFAULT 'Outros',
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    category TEXT NOT NULL DEFAULT 'Salário',
    received_at DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'expected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    category TEXT NOT NULL DEFAULT 'Alimentação',
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    last_digits TEXT,
    credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    current_bill NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    closing_day INT NOT NULL DEFAULT 1,
    due_day INT NOT NULL DEFAULT 10,
    color TEXT DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.credit_card_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    category TEXT NOT NULL DEFAULT 'Geral',
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_installments INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.credit_card_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.credit_card_purchases(id) ON DELETE CASCADE,
    installment_number INT NOT NULL DEFAULT 1,
    total_installments INT NOT NULL DEFAULT 1,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    month INT NOT NULL,
    year INT NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    interest_rate NUMERIC(6,2) DEFAULT 0.00,
    total_installments INT NOT NULL DEFAULT 1,
    paid_installments INT NOT NULL DEFAULT 0,
    lender TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creditor TEXT NOT NULL,
    description TEXT NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'renegotiating', 'settled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    current_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    target_date DATE NOT NULL,
    category TEXT DEFAULT 'Sonhos',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    allocated_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    month INT NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    reference_id TEXT,
    target_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.1 PUSH SUBSCRIPTIONS & LOGS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    device_type TEXT NOT NULL DEFAULT 'Web',
    push_token TEXT,
    endpoint TEXT,
    subscription_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'sent'
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    bills_enabled BOOLEAN DEFAULT TRUE,
    cards_enabled BOOLEAN DEFAULT TRUE,
    invoices_enabled BOOLEAN DEFAULT TRUE,
    installments_enabled BOOLEAN DEFAULT TRUE,
    loans_enabled BOOLEAN DEFAULT TRUE,
    budget_enabled BOOLEAN DEFAULT TRUE,
    goals_enabled BOOLEAN DEFAULT TRUE,
    trial_enabled BOOLEAN DEFAULT TRUE,
    advance_days INT DEFAULT 3,
    quiet_hours_start TEXT DEFAULT '21:00',
    quiet_hours_end TEXT DEFAULT '08:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 11. FUNÇÕES AUXILIARES DE SEGURANÇA E RLS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid() AND role = 'superadmin' AND lower(email) = 'kalebsantos2801@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_family_id()
RETURNS UUID AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 12. HABILITAR ROW LEVEL SECURITY (RLS)
-- ====================================================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 13. POLÍTICAS DE RLS (ROW LEVEL SECURITY - ISOLAMENTO TOTAL DE DADOS)
-- ====================================================================

-- PROFILES: Usuário vê e edita seu próprio perfil; Superadmin tem acesso total
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_superadmin());
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid() OR public.is_superadmin());
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_superadmin());

-- FAMILIES: Usuário só acessa a própria família
CREATE POLICY "families_all_policy" ON public.families FOR ALL USING (id = public.get_user_family_id() OR public.is_superadmin());

-- FAMILY_MEMBERS: Membro só acessa membros da sua família
CREATE POLICY "family_members_all_policy" ON public.family_members FOR ALL USING (family_id = public.get_user_family_id() OR user_id = auth.uid() OR public.is_superadmin());

-- TRIAL_PERIODS: Apenas dados do próprio usuário/família
CREATE POLICY "trial_periods_all_policy" ON public.trial_periods FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id() OR public.is_superadmin());

-- RELEASE_REQUESTS: Usuário vê seus próprios pedidos; Superadmin gerencia todos
CREATE POLICY "release_requests_all_policy" ON public.release_requests FOR ALL USING (user_id = auth.uid() OR public.is_superadmin());

-- ADMIN_ROLES & LOGS: Restrito a superadministradores
CREATE POLICY "admin_roles_all_policy" ON public.admin_roles FOR ALL USING (user_id = auth.uid() OR public.is_superadmin());
CREATE POLICY "admin_logs_all_policy" ON public.admin_logs FOR ALL USING (public.is_superadmin());

-- DADOS FINANCEIROS PRIVADOS (ISOLAMENTO COMPLETO POR USUÁRIO / FAMÍLIA)
CREATE POLICY "accounts_all_policy" ON public.accounts FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "transactions_all_policy" ON public.transactions FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "income_all_policy" ON public.income FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "expenses_all_policy" ON public.expenses FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "credit_cards_all_policy" ON public.credit_cards FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "credit_card_purchases_all_policy" ON public.credit_card_purchases FOR ALL USING (family_id = public.get_user_family_id());
CREATE POLICY "credit_card_installments_all_policy" ON public.credit_card_installments FOR ALL USING (purchase_id IN (SELECT id FROM public.credit_card_purchases WHERE family_id = public.get_user_family_id()));
CREATE POLICY "invoices_all_policy" ON public.invoices FOR ALL USING (family_id = public.get_user_family_id());
CREATE POLICY "loans_all_policy" ON public.loans FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "loan_installments_all_policy" ON public.loan_installments FOR ALL USING (loan_id IN (SELECT id FROM public.loans WHERE user_id = auth.uid() OR family_id = public.get_user_family_id()));
CREATE POLICY "debts_all_policy" ON public.debts FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "goals_all_policy" ON public.goals FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "budgets_all_policy" ON public.budgets FOR ALL USING (user_id = auth.uid() OR family_id = public.get_user_family_id());
CREATE POLICY "notifications_all_policy" ON public.notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "push_subscriptions_all_policy" ON public.push_subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "notification_logs_all_policy" ON public.notification_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "notification_settings_all_policy" ON public.notification_settings FOR ALL USING (user_id = auth.uid());

-- ====================================================================
-- 14. ÍNDICES DE ALTA PERFORMANCE (ACELERAÇÃO DE TROCA DE ABAS E QUERIES)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON public.profiles (family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_family_members_family_user ON public.family_members (family_id, user_id);
CREATE INDEX IF NOT EXISTS idx_trial_periods_user_id ON public.trial_periods (user_id);
CREATE INDEX IF NOT EXISTS idx_trial_periods_family_id ON public.trial_periods (family_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_email ON public.admin_roles (user_id, email);

CREATE INDEX IF NOT EXISTS idx_accounts_family_id ON public.accounts (family_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts (type);

CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON public.transactions (family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON public.transactions (type, status);

CREATE INDEX IF NOT EXISTS idx_income_family_received ON public.income (family_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_income_user_received ON public.income (user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_income_account ON public.income (account_id);
CREATE INDEX IF NOT EXISTS idx_income_status ON public.income (status);

CREATE INDEX IF NOT EXISTS idx_expenses_family_due ON public.expenses (family_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_due ON public.expenses (user_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON public.expenses (account_id);

CREATE INDEX IF NOT EXISTS idx_credit_cards_family ON public.credit_cards (family_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON public.credit_cards (user_id);

CREATE INDEX IF NOT EXISTS idx_cc_purchases_card ON public.credit_card_purchases (card_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_cc_purchases_family ON public.credit_card_purchases (family_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_cc_installments_purchase ON public.credit_card_installments (purchase_id);
CREATE INDEX IF NOT EXISTS idx_cc_installments_due ON public.credit_card_installments (due_date, is_paid);

CREATE INDEX IF NOT EXISTS idx_invoices_card_period ON public.invoices (card_id, year, month);
CREATE INDEX IF NOT EXISTS idx_invoices_family_period ON public.invoices (family_id, year, month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

CREATE INDEX IF NOT EXISTS idx_loans_family ON public.loans (family_id);
CREATE INDEX IF NOT EXISTS idx_loans_user ON public.loans (user_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_loan ON public.loan_installments (loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_due ON public.loan_installments (due_date, is_paid);

CREATE INDEX IF NOT EXISTS idx_debts_family_due ON public.debts (family_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_debts_user_due ON public.debts (user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts (status);

CREATE INDEX IF NOT EXISTS idx_goals_family ON public.goals (family_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals (user_id);

CREATE INDEX IF NOT EXISTS idx_budgets_family_period ON public.budgets (family_id, year, month);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_family ON public.notifications (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_active ON public.push_subscriptions (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notif_logs_user_sent ON public.notification_logs (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_settings_user ON public.notification_settings (user_id);

ANALYZE public.families;
ANALYZE public.profiles;
ANALYZE public.family_members;
ANALYZE public.accounts;
ANALYZE public.transactions;
ANALYZE public.income;
ANALYZE public.expenses;
ANALYZE public.credit_cards;
ANALYZE public.credit_card_purchases;
ANALYZE public.credit_card_installments;
ANALYZE public.invoices;
ANALYZE public.loans;
ANALYZE public.loan_installments;
ANALYZE public.debts;
ANALYZE public.goals;
ANALYZE public.budgets;
-- ====================================================================
-- 15. ATRIBUIÇÃO DE SUPERADMINISTRADOR (kalebsantos2801@gmail.com)
-- ====================================================================
INSERT INTO public.admin_roles (user_id, email, role, requires_password_change)
SELECT id, email, 'superadmin', false
FROM auth.users
WHERE email = 'kalebsantos2801@gmail.com'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'superadmin', email = 'kalebsantos2801@gmail.com';

-- ====================================================================
-- 16. CONFIGURAÇÃO DE STORAGE (BUCKETS E RLS)
-- ====================================================================

-- Cria o bucket 'payment-proofs' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Habilita RLS na tabela de objetos do storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir visualização pública dos comprovantes
CREATE POLICY "Comprovantes públicos" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-proofs');

-- Política para permitir upload apenas por usuários autenticados
CREATE POLICY "Upload por usuários autenticados" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir atualização pelos próprios donos
CREATE POLICY "Atualização pelo próprio dono" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid() = owner
);

-- ====================================================================
-- 17. MIGRAÇÕES SEGURAS PARA BANCOS EXISTENTES
-- ====================================================================
ALTER TABLE public.release_requests ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;
ALTER TABLE public.release_requests ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'Usuário';
ALTER TABLE public.release_requests ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE public.release_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.release_requests ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.trial_periods ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.trial_periods ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE public.trial_periods ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none';



