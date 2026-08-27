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
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
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
    WHERE user_id = auth.uid() AND role = 'superadmin'
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
-- 13. POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ====================================================================

-- PROFILES
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_superadmin());

-- FAMILIES
CREATE POLICY "families_all_policy" ON public.families FOR ALL USING (true);

-- FAMILY_MEMBERS
CREATE POLICY "family_members_all_policy" ON public.family_members FOR ALL USING (true);

-- TRIAL_PERIODS
CREATE POLICY "trial_periods_all_policy" ON public.trial_periods FOR ALL USING (true);

-- RELEASE_REQUESTS
CREATE POLICY "release_requests_all_policy" ON public.release_requests FOR ALL USING (true);

-- ADMIN_ROLES
CREATE POLICY "admin_roles_all_policy" ON public.admin_roles FOR ALL USING (true);

-- ADMIN_LOGS
CREATE POLICY "admin_logs_all_policy" ON public.admin_logs FOR ALL USING (true);

-- DADOS FINANCEIROS
CREATE POLICY "accounts_all_policy" ON public.accounts FOR ALL USING (true);
CREATE POLICY "transactions_all_policy" ON public.transactions FOR ALL USING (true);
CREATE POLICY "income_all_policy" ON public.income FOR ALL USING (true);
CREATE POLICY "expenses_all_policy" ON public.expenses FOR ALL USING (true);
CREATE POLICY "credit_cards_all_policy" ON public.credit_cards FOR ALL USING (true);
CREATE POLICY "credit_card_purchases_all_policy" ON public.credit_card_purchases FOR ALL USING (true);
CREATE POLICY "credit_card_installments_all_policy" ON public.credit_card_installments FOR ALL USING (true);
CREATE POLICY "invoices_all_policy" ON public.invoices FOR ALL USING (true);
CREATE POLICY "loans_all_policy" ON public.loans FOR ALL USING (true);
CREATE POLICY "loan_installments_all_policy" ON public.loan_installments FOR ALL USING (true);
CREATE POLICY "debts_all_policy" ON public.debts FOR ALL USING (true);
CREATE POLICY "goals_all_policy" ON public.goals FOR ALL USING (true);
CREATE POLICY "budgets_all_policy" ON public.budgets FOR ALL USING (true);
CREATE POLICY "notifications_all_policy" ON public.notifications FOR ALL USING (true);
CREATE POLICY "push_subscriptions_all_policy" ON public.push_subscriptions FOR ALL USING (true);
CREATE POLICY "notification_logs_all_policy" ON public.notification_logs FOR ALL USING (true);
CREATE POLICY "notification_settings_all_policy" ON public.notification_settings FOR ALL USING (true);
