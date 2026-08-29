-- ====================================================================
-- SCRIPT DE ACELERAÇÃO E OTIMIZAÇÃO TOTAL (100% SEGURO & COMPLETO)
-- Cria tabelas que possam estar faltando e adiciona índices de alta velocidade
-- ====================================================================

-- 1. GARANTIR QUE TODAS AS TABELAS DO SISTEMA EXISTAM (NENHUM ERRO DE TABELA INEXISTENTE)
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    invited_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.trial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'investment', 'cash', 'other')),
    institution TEXT NOT NULL,
    balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(14,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Outros',
    received_at DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Geral',
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    current_bill NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    closing_day INT NOT NULL DEFAULT 1,
    due_day INT NOT NULL DEFAULT 10,
    color TEXT DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credit_card_purchases (
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

CREATE TABLE IF NOT EXISTS public.credit_card_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.credit_card_purchases(id) ON DELETE CASCADE,
    installment_number INT NOT NULL DEFAULT 1,
    total_installments INT NOT NULL DEFAULT 1,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
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

CREATE TABLE IF NOT EXISTS public.loans (
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

CREATE TABLE IF NOT EXISTS public.loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debts (
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

CREATE TABLE IF NOT EXISTS public.goals (
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

CREATE TABLE IF NOT EXISTS public.budgets (
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
    salary_enabled BOOLEAN DEFAULT TRUE,
    loans_enabled BOOLEAN DEFAULT TRUE,
    debts_enabled BOOLEAN DEFAULT TRUE,
    goals_enabled BOOLEAN DEFAULT TRUE,
    daily_summary_enabled BOOLEAN DEFAULT TRUE,
    weekly_summary_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES DE ALTA PERFORMANCE (ACELERAÇÃO DE CONSULTAS E TROCA DE ABAS)
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

-- 3. OTIMIZAR O ANALYZER DO BANCO
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
ANALYZE public.notifications;
ANALYZE public.push_subscriptions;
ANALYZE public.notification_logs;
ANALYZE public.notification_settings;

-- 4. ATRIBUIR ROLE DE SUPERADMINISTRADOR PARA kalebsantos2801@gmail.com
INSERT INTO public.admin_roles (user_id, email, role, requires_password_change)
SELECT id, email, 'superadmin', false
FROM auth.users
WHERE email = 'kalebsantos2801@gmail.com'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'superadmin', email = 'kalebsantos2801@gmail.com';

