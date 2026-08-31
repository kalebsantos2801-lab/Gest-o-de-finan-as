'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Landmark, 
  CreditCard, 
  Target, 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Calendar, 
  Bell, 
  Settings, 
  Crown, 
  DollarSign, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PiggyBank, 
  Home, 
  Utensils, 
  Car, 
  Heart, 
  Gamepad2, 
  MoreHorizontal, 
  Shield, 
  Plane, 
  Tv, 
  Zap, 
  Wifi, 
  Lightbulb, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  Info, 
  Plus, 
  Minus, 
  RefreshCw, 
  ChevronRight,
  Sparkles,
  Search,
  X,
  Wallet,
  Coins
} from 'lucide-react';
import { Account, Income, Expense, Goal, CreditCard as CreditCardType, Debt } from '@/types/database';
import { extractMonthAndYear, safeNumber } from '@/lib/dateUtils';
import { AppHeader } from '@/components/layout/AppHeader';

const categoryIconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  'Moradia': { icon: Home, color: '#3b82f6', bg: 'bg-blue-500/20 text-blue-400' },
  'Alimentação': { icon: Utensils, color: '#10b981', bg: 'bg-emerald-500/20 text-emerald-400' },
  'Transporte': { icon: Car, color: '#06b6d4', bg: 'bg-cyan-500/20 text-cyan-400' },
  'Saúde': { icon: Heart, color: '#f97316', bg: 'bg-orange-500/20 text-orange-400' },
  'Lazer': { icon: Gamepad2, color: '#a855f7', bg: 'bg-purple-500/20 text-purple-400' },
  'Educação': { icon: Target, color: '#ec4899', bg: 'bg-pink-500/20 text-pink-400' },
  'Dívidas': { icon: AlertCircle, color: '#ef4444', bg: 'bg-rose-500/20 text-rose-400' },
  'Outros': { icon: MoreHorizontal, color: '#6366f1', bg: 'bg-indigo-500/20 text-indigo-400' },
};

interface FinHouseDashboardProps {
  accounts: Account[];
  incomes: Income[];
  expenses: Expense[];
  goals: Goal[];
  cards: CreditCardType[];
  debts: Debt[];
  loading: boolean;
  onRefresh: () => void;
}

export function FinHouseDashboard({
  accounts,
  incomes,
  expenses,
  goals,
  cards,
  debts,
  loading,
  onRefresh
}: FinHouseDashboardProps) {
  const { profile, family, user, serverTime, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Modals state
  const [activeModal, setActiveModal] = useState<'income' | 'expense' | 'transfer' | 'goal' | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ month: string; income: number; expense: number } | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Form states for quick modals
  const [amountInput, setAmountInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Salário');
  const [expenseCategoryInput, setExpenseCategoryInput] = useState('Moradia');
  const [submitting, setSubmitting] = useState(false);

  // User display name
  const userName = profile?.full_name?.split(' ')[0] || 'Kaka';

  // Format date: "Sexta, 29 de Agosto de 2025"
  const formattedDate = useMemo(() => {
    const d = serverTime || new Date();
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('pt-BR', { month: 'long' });
    const year = d.getFullYear();
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalizedWeekday}, ${day} de ${capitalizedMonth} de ${year}`;
  }, [serverTime]);

  // Aggregate monthly values
  const currentMonth = useMemo(() => (serverTime ? serverTime.getMonth() : new Date().getMonth()), [serverTime]);
  const currentYear = useMemo(() => (serverTime ? serverTime.getFullYear() : new Date().getFullYear()), [serverTime]);

  // Previous month for comparison
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthIncomes = useMemo(() => {
    return incomes.filter(i => {
      const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
      if (!parsed) return true;
      return parsed.month === currentMonth && parsed.year === currentYear;
    });
  }, [incomes, currentMonth, currentYear]);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => {
      const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
      if (!parsed) return true;
      return parsed.month === currentMonth && parsed.year === currentYear;
    });
  }, [expenses, currentMonth, currentYear]);

  const prevMonthIncomes = useMemo(() => {
    return incomes.filter(i => {
      const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
      if (!parsed) return false;
      return parsed.month === prevMonth && parsed.year === prevYear;
    });
  }, [incomes, prevMonth, prevYear]);

  const prevMonthExpenses = useMemo(() => {
    return expenses.filter(e => {
      const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
      if (!parsed) return false;
      return parsed.month === prevMonth && parsed.year === prevYear;
    });
  }, [expenses, prevMonth, prevYear]);

  // Calculate Real Registered KPIs
  const realTotalBalance = accounts.reduce((acc, curr) => acc + safeNumber(curr.balance), 0);
  const realTotalIncome = currentMonthIncomes.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);
  const realTotalExpense = currentMonthExpenses.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);

  const prevIncomeTotal = prevMonthIncomes.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);
  const prevExpenseTotal = prevMonthExpenses.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);

  const incomeChangePct = prevIncomeTotal > 0 ? ((realTotalIncome - prevIncomeTotal) / prevIncomeTotal) * 100 : null;
  const expenseChangePct = prevExpenseTotal > 0 ? ((realTotalExpense - prevExpenseTotal) / prevExpenseTotal) * 100 : null;

  const displayTotalBalance = realTotalBalance;
  const displayTotalIncome = realTotalIncome;
  const displayTotalExpense = realTotalExpense;
  const displaySavings = displayTotalIncome - displayTotalExpense;
  const displaySavingsRate = displayTotalIncome > 0 ? (displaySavings / displayTotalIncome) * 100 : 0;

  // Real Investment Accounts balance
  const investmentAccounts = useMemo(() => {
    return accounts.filter(a => a.type === 'investment' || a.name?.toLowerCase().includes('invest') || a.name?.toLowerCase().includes('corretora'));
  }, [accounts]);

  const realInvestmentBalance = useMemo(() => {
    return investmentAccounts.reduce((acc, curr) => acc + safeNumber(curr.balance), 0);
  }, [investmentAccounts]);

  // Dynamic Month names for timeline (last 6-8 months up to current month)
  const monthlyTimelineData = useMemo(() => {
    const monthShorts = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result: { label: string; key: number; year: number; inc: number; exp: number }[] = [];

    // Last 6 months up to current month
    for (let offset = 5; offset >= 0; offset--) {
      let m = currentMonth - offset;
      let y = currentYear;
      if (m < 0) {
        m += 12;
        y -= 1;
      }

      const mIncs = incomes.filter(i => {
        const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
        return parsed && parsed.month === m && parsed.year === y;
      });

      const mExps = expenses.filter(e => {
        const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
        return parsed && parsed.month === m && parsed.year === y;
      });

      const sumInc = mIncs.reduce((s, i) => s + safeNumber(i.amount), 0);
      const sumExp = mExps.reduce((s, e) => s + safeNumber(e.amount), 0);

      result.push({
        label: monthShorts[m],
        key: m,
        year: y,
        inc: sumInc,
        exp: sumExp
      });
    }

    return result;
  }, [incomes, expenses, currentMonth, currentYear]);

  // Max value for timeline dynamic scale
  const timelineMaxVal = useMemo(() => {
    const maxData = Math.max(
      ...monthlyTimelineData.map(d => Math.max(d.inc, d.exp)),
      displayTotalIncome,
      displayTotalExpense,
      100
    );
    // Round up to nice number
    if (maxData <= 1000) return 1000;
    if (maxData <= 5000) return 5000;
    if (maxData <= 10000) return 10000;
    return Math.ceil(maxData / 5000) * 5000;
  }, [monthlyTimelineData, displayTotalIncome, displayTotalExpense]);

  // Categories Breakdown Data (Real data registered by user)
  const categoriesData = useMemo(() => {
    const targetExpenses = currentMonthExpenses;
    
    const catMap: Record<string, number> = {};
    targetExpenses.forEach(exp => {
      const cat = exp.category || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + safeNumber(exp.amount);
    });

    // Include debts (Dívidas)
    debts.forEach(d => {
      if (d.status !== 'settled') {
        const remaining = safeNumber(d.total_amount) - safeNumber(d.paid_amount);
        if (remaining > 0) {
          catMap['Dívidas'] = (catMap['Dívidas'] || 0) + remaining;
        }
      }
    });

    if (Object.keys(catMap).length === 0) return [];

    const totalReal = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
    const colorPalette = ['#3b82f6', '#10b981', '#06b6d4', '#f97316', '#a855f7', '#ec4899', '#6366f1', '#eab308', '#ef4444'];

    return Object.entries(catMap).map(([name, amt], idx) => {
      const mapped = categoryIconMap[name] || {
        icon: MoreHorizontal,
        color: colorPalette[idx % colorPalette.length],
        bg: 'bg-slate-500/20 text-slate-300'
      };
      const pct = Math.round((amt / totalReal) * 100);

      return {
        name,
        icon: mapped.icon,
        color: mapped.color,
        bg: mapped.bg,
        amount: amt,
        percentage: pct
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [currentMonthExpenses, debts]);

  // Real upcoming bills (from expenses with due_date in future or pending)
  const realUpcomingBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingExpenses = expenses
      .filter(e => {
        if (!e.due_date) return false;
        const d = new Date(e.due_date);
        return d >= today || e.status === 'pending';
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 4);

    return pendingExpenses.map(e => {
      const d = new Date(e.due_date!);
      const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let dueText = '';
      if (diffDays === 0) dueText = 'Vence hoje';
      else if (diffDays === 1) dueText = 'Vence amanhã';
      else if (diffDays > 1) dueText = `Vence em ${diffDays} dias`;
      else dueText = `Venceu há ${Math.abs(diffDays)} dias`;

      const mapped = categoryIconMap[e.category || 'Outros'] || { icon: ArrowUpRight, color: '#f43f5e', bg: 'bg-rose-950 text-rose-400' };

      return {
        id: e.id,
        name: e.description || e.category || 'Conta',
        icon: mapped.icon,
        iconBg: mapped.bg,
        dueText,
        amount: Number(e.amount || 0)
      };
    });
  }, [expenses]);

  // Real Investments mini-bars (from last 6 months savings or investments)
  const investmentBars = useMemo(() => {
    return monthlyTimelineData.map(d => {
      const net = Math.max(0, d.inc - d.exp);
      const height = timelineMaxVal > 0 ? Math.min(100, Math.max(15, Math.round((net / timelineMaxVal) * 100))) : 20;
      return {
        month: d.label,
        height: net > 0 ? height : 8
      };
    });
  }, [monthlyTimelineData, timelineMaxVal]);

  // Fast Transaction Handlers
  const handleQuickAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || !user?.id) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(amountInput.replace(/\./g, '').replace(',', '.'));
      await supabase.from('income').insert({
        user_id: user.id,
        family_id: profile?.family_id,
        amount: amt,
        description: descInput || 'Salário / Renda',
        category: categoryInput,
        received_at: new Date().toISOString()
      });
      setActiveModal(null);
      setAmountInput('');
      setDescInput('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || !user?.id) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(amountInput.replace(/\./g, '').replace(',', '.'));
      await supabase.from('expenses').insert({
        user_id: user.id,
        family_id: profile?.family_id,
        amount: amt,
        description: descInput || 'Despesa Geral',
        category: expenseCategoryInput,
        due_date: new Date().toISOString(),
        status: 'paid'
      });
      setActiveModal(null);
      setAmountInput('');
      setDescInput('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Nav Items definition for Sidebar
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
    { label: 'Transações', href: '/entradas', icon: ArrowLeftRight, active: false },
    { label: 'Contas', href: '/contas', icon: Landmark, active: false },
    { label: 'Cartões', href: '/cartoes', icon: CreditCard, active: false },
    { label: 'Metas', href: '/metas', icon: Target, active: false },
    { label: 'Investimentos', href: '/carteira', icon: BarChart3, active: false },
    { label: 'Relatórios', href: '/relatorios', icon: PieChart, active: false },
    { label: 'Planejamento', href: '/metas', icon: Calendar, active: false },
    { label: 'Alertas', href: '/notificacoes', icon: Bell, active: false, badge: '3' },
    { label: 'Configurações', href: '/configuracoes', icon: Settings, active: false },
  ];

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white font-sans">
      {/* Top Unified Navigation with Tabs & 3-Dots Menu */}
      <AppHeader />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
        {/* TOP GREETING & STATUS BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Olá, {userName}! <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              Aqui está o resumo da sua vida financeira.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Date Pill */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0e142d] border border-[#1b2447] text-xs font-semibold text-slate-300 shadow-sm">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{formattedDate}</span>
            </div>

            {/* Notification Bell */}
            <Link
              href="/notificacoes"
              className="relative p-2.5 rounded-2xl bg-[#0e142d] hover:bg-[#151c3d] border border-[#1b2447] text-slate-300 hover:text-white transition"
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                3
              </span>
            </Link>

            {/* Quick Refresh */}
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-2xl bg-[#0e142d] hover:bg-[#151c3d] border border-[#1b2447] text-slate-300 hover:text-white transition"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* ROW 1: TOP 4 METRIC KPI CARDS */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4.5">
          {/* Card 1: Saldo Total */}
          <div className="rounded-3xl bg-[#0e142e] border border-[#1b244d] p-5 space-y-3 shadow-xl hover:border-blue-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">Saldo Total</span>
                <div className={`text-2xl sm:text-3xl font-black font-sans tracking-tight transition-colors ${
                  displayTotalBalance >= 0 ? 'text-white group-hover:text-emerald-300' : 'text-rose-400 group-hover:text-rose-300'
                }`}>
                  R$ {displayTotalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <DollarSign className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 pt-1">
              <Landmark className="w-3.5 h-3.5 text-blue-400" />
              <span>{accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}</span>
            </div>
          </div>

          {/* Card 2: Receitas (Mês) */}
          <div className="rounded-3xl bg-[#0e142e] border border-[#1b244d] p-5 space-y-3 shadow-xl hover:border-emerald-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">Receitas (Mês)</span>
                <div className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight group-hover:text-emerald-300 transition-colors">
                  R$ {displayTotalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-inner">
                <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 pt-1">
              {incomeChangePct !== null ? (
                <>
                  <ArrowUpRight className={`w-3.5 h-3.5 ${incomeChangePct < 0 ? 'rotate-90 text-rose-400' : ''}`} />
                  <span>{incomeChangePct >= 0 ? '+' : ''}{incomeChangePct.toFixed(1)}% vs mês anterior</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentMonthIncomes.length} {currentMonthIncomes.length === 1 ? 'receita este mês' : 'receitas este mês'}</span>
                </>
              )}
            </div>
          </div>

          {/* Card 3: Despesas (Mês) */}
          <div className="rounded-3xl bg-[#0e142e] border border-[#1b244d] p-5 space-y-3 shadow-xl hover:border-rose-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">Despesas (Mês)</span>
                <div className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight group-hover:text-rose-300 transition-colors">
                  R$ {displayTotalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-rose-950/60 text-rose-400 flex items-center justify-center border border-rose-500/40 shadow-inner">
                <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 pt-1">
              {expenseChangePct !== null ? (
                <>
                  <ArrowUpRight className={`w-3.5 h-3.5 ${expenseChangePct < 0 ? 'rotate-90 text-emerald-400' : ''}`} />
                  <span>{expenseChangePct >= 0 ? '+' : ''}{expenseChangePct.toFixed(1)}% vs mês anterior</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{currentMonthExpenses.length} {currentMonthExpenses.length === 1 ? 'despesa este mês' : 'despesas este mês'}</span>
                </>
              )}
            </div>
          </div>

          {/* Card 4: Economia (Mês) */}
          <div className="rounded-3xl bg-[#0e142e] border border-[#1b244d] p-5 space-y-3 shadow-xl hover:border-purple-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">Economia (Mês)</span>
                <div className={`text-2xl sm:text-3xl font-black font-sans tracking-tight transition-colors ${
                  displaySavings >= 0 ? 'text-white group-hover:text-purple-300' : 'text-rose-400 group-hover:text-rose-300'
                }`}>
                  R$ {displaySavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-purple-950/60 text-purple-400 flex items-center justify-center border border-purple-500/40 shadow-inner">
                <PiggyBank className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 pt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{displaySavingsRate.toFixed(1)}% da sua renda</span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* ROW 2: MIDDLE ANALYTICAL GRID */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 1. Gastos por Categoria (Donut Chart - 7 Cols on xl) */}
          <div className="lg:col-span-12 xl:col-span-7 rounded-3xl bg-[#0e142e] border border-[#1b244d] p-6 space-y-5 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Gastos por Categoria</h3>
                <p className="text-xs text-slate-400">Visualize para onde seu dinheiro está indo</p>
              </div>
            </div>

            {categoriesData.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl bg-[#121833]/60 border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Nenhum gasto registrado</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                    Cadastre suas despesas para visualizar os gráficos de distribuição por categoria.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal('expense')}
                  className="mt-1 px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Despesa</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                {/* Donut Chart SVG */}
                <div className="sm:col-span-6 flex items-center justify-center relative">
                  <div className="w-44 h-44 relative flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                      {(() => {
                        const radius = 60;
                        const circumference = 2 * Math.PI * radius;
                        let accumulatedOffset = 0;

                        return categoriesData.map((cat, i) => {
                          const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -accumulatedOffset;
                          accumulatedOffset += (cat.percentage / 100) * circumference;

                          return (
                            <circle
                              key={i}
                              cx="80"
                              cy="80"
                              r={radius}
                              fill="transparent"
                              stroke={cat.color}
                              strokeWidth="20"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                              onMouseEnter={() => setHoveredCategory(cat.name)}
                              onMouseLeave={() => setHoveredCategory(null)}
                            />
                          );
                        });
                      })()}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-black text-white font-mono">
                        R$ {displayTotalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">Total Despesas</span>
                    </div>
                  </div>
                </div>

                {/* Categories Legend List */}
                <div className="sm:col-span-6 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {categoriesData.map((cat) => {
                    const Icon = cat.icon;
                    const isHovered = hoveredCategory === cat.name;

                    return (
                      <div
                        key={cat.name}
                        onMouseEnter={() => setHoveredCategory(cat.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`flex items-center justify-between p-1.5 rounded-xl transition cursor-pointer ${
                          isHovered ? 'bg-[#192247] scale-[1.02]' : 'hover:bg-[#121833]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg ${cat.bg}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 block truncate">{cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              R$ {cat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-extrabold text-slate-300 font-mono pl-1">
                          {cat.percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[#1b2447] flex items-center justify-between text-xs">
              <span className="text-slate-400">Total de Categorias: <strong>{categoriesData.length}</strong></span>
              <Link href="/despesas" className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                <span>Ver todas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 2. Metas Financeiras (5 Cols on xl) */}
          <div className="lg:col-span-12 xl:col-span-5 rounded-3xl bg-[#0e142e] border border-[#1b244d] p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Metas Financeiras</h3>
                  <p className="text-xs text-slate-400">
                    {goals.filter(g => Number(g.current_amount || 0) > 0).length} de {goals.length} metas em andamento
                  </p>
                </div>
              </div>
            </div>

            {/* Goals list */}
            {goals.length === 0 ? (
              <div className="py-8 px-3 rounded-2xl bg-[#121833]/60 border border-white/5 flex flex-col items-center justify-center text-center space-y-2.5">
                <Target className="w-8 h-8 text-purple-400/80" />
                <p className="text-xs text-slate-300 font-semibold">Nenhuma meta cadastrada</p>
                <p className="text-[11px] text-slate-400">
                  Defina objetivos de curto e longo prazo para organizar suas economias.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                {goals.map((g) => {
                  const currentAmt = Number(g.current_amount || 0);
                  const targetAmt = Number(g.target_amount || 1);
                  const progress = Math.min(100, Math.round((currentAmt / targetAmt) * 100));

                  return (
                    <div key={g.id} className="space-y-1.5 group">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#192247] text-purple-400 group-hover:text-purple-300 transition">
                            <Target className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-white group-hover:text-blue-300 transition truncate max-w-[140px]">{g.title}</span>
                        </div>
                        <span className="font-extrabold text-slate-300 font-mono">{progress}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#1b2447] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 to-indigo-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>R$ {currentAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>R$ {targetAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              href="/metas"
              className="w-full py-2.5 rounded-2xl bg-[#151c3d] hover:bg-[#1d2754] text-blue-400 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#222d5c]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gerenciar Metas</span>
            </Link>
          </div>
        </section>

        {/* ========================================================= */}
        {/* ROW 3: LOWER DETAILED WIDGETS */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
          {/* 1. Contas a Pagar (3 Cols) */}
          <div className="xl:col-span-3 rounded-3xl bg-[#0e142e] border border-[#1b244d] p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Contas a Pagar</h3>
                  <p className="text-[11px] text-slate-400">Próximos vencimentos</p>
                </div>
              </div>

              <Link
                href="/despesas"
                className="px-2.5 py-1 rounded-xl bg-[#192247] hover:bg-[#202c5c] text-slate-300 text-xs font-bold transition"
              >
                Ver todas
              </Link>
            </div>

            {/* List of upcoming bills */}
            {realUpcomingBills.length === 0 ? (
              <div className="py-8 px-3 rounded-2xl bg-[#121833]/60 border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                <p className="text-xs text-slate-300 font-bold">Nenhuma conta pendente</p>
                <p className="text-[11px] text-slate-400">
                  Todas as suas contas e despesas estão em dia!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {realUpcomingBills.map((bill) => {
                  const Icon = bill.icon;
                  return (
                    <div key={bill.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#121833] border border-[#1d2547] hover:border-blue-500/30 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bill.iconBg}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate max-w-[130px]">{bill.name}</h4>
                          <p className="text-[10px] text-slate-400">{bill.dueText}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black font-mono text-rose-400 shrink-0">
                        R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Investimentos (3 Cols) */}
          <div className="xl:col-span-3 rounded-3xl bg-[#0e142e] border border-[#1b244d] p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Investimentos</h3>
                <p className="text-[11px] text-slate-400">Seu patrimônio crescendo</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-black text-white font-mono">
                R$ {realInvestmentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                <span>{investmentAccounts.length} {investmentAccounts.length === 1 ? 'conta de investimento' : 'contas de investimento'}</span>
              </div>
            </div>

            {/* Mini Bar Chart */}
            <div className="flex items-end justify-between gap-2 h-24 pt-4 border-t border-[#1b2447]">
              {investmentBars.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-[#1b2447] rounded-lg h-16 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-blue-500 hover:bg-blue-400 transition-all rounded-t-md"
                      style={{ height: `${bar.height}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Fluxo de Caixa (3 Cols) */}
          <div className="xl:col-span-3 rounded-3xl bg-[#0e142e] border border-[#1b244d] p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Fluxo de Caixa</h3>
                <p className="text-[11px] text-slate-400">Entradas e saídas do mês</p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {/* Entradas bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Entradas</span>
                  <span className="text-white font-mono">R$ {displayTotalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-[#1b2447] rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full shadow-sm transition-all"
                    style={{ width: displayTotalIncome > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>

              {/* Saídas bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Saídas</span>
                  <span className="text-white font-mono">R$ {displayTotalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-[#1b2447] rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full shadow-sm transition-all"
                    style={{ width: `${displayTotalIncome > 0 ? Math.min(100, Math.round((displayTotalExpense / displayTotalIncome) * 100)) : (displayTotalExpense > 0 ? 100 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Saldo summary */}
              <div className="p-3 rounded-2xl bg-[#121833] border border-[#1d2547] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Saldo Líquido</span>
                <span className={`text-sm font-black font-mono ${displaySavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {displaySavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Alertas e Insights (3 Cols) */}
          <div className="xl:col-span-3 rounded-3xl bg-[#0e142e] border border-[#1b244d] p-6 space-y-3.5 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white">Alertas e Insights</h3>
            </div>

            {/* Dynamic Insights 1 */}
            <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
              displaySavings >= 0 
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
            }`}>
              {displaySavings >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold">
                  {displaySavings >= 0 ? 'Balanço Positivo' : 'Atenção ao Orçamento'}
                </h5>
                <p className="text-[11px] text-slate-300">
                  {displaySavings >= 0 
                    ? `Você economizou ${displaySavingsRate.toFixed(1)}% da sua renda este mês.`
                    : `Despesas superaram as receitas em R$ ${Math.abs(displaySavings).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`}
                </p>
              </div>
            </div>

            {/* Dynamic Insights 2: Maior Categoria */}
            <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-blue-300">
                  {categoriesData.length > 0 ? 'Maior Categoria' : 'Sem despesas registradas'}
                </h5>
                <p className="text-[11px] text-slate-300">
                  {categoriesData.length > 0 
                    ? `${categoriesData[0].name} concentra ${categoriesData[0].percentage}% dos gastos (R$ ${categoriesData[0].amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
                    : 'Cadastre suas receitas e despesas para gerar insights automáticos.'}
                </p>
              </div>
            </div>

            {/* Dynamic Insights 3: Metas ou Vencimentos */}
            <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-2.5">
              <Target className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-purple-300">
                  {goals.length > 0 ? 'Meta em Destaque' : 'Metas e Planejamento'}
                </h5>
                <p className="text-[11px] text-slate-300">
                  {goals.length > 0 
                    ? `${goals[0].title}: ${Math.min(100, Math.round((Number(goals[0].current_amount || 0) / Number(goals[0].target_amount || 1)) * 100))}% concluída.`
                    : 'Crie metas financeiras para planejar suas conquistas e reservas.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* ROW 4: AÇÕES RÁPIDAS (BOTTOM ACTION BAR) */}
        {/* ========================================================= */}
        <section className="space-y-3 pt-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Ações Rápidas
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* + Nova Receita */}
            <button
              id="quick-action-income"
              onClick={() => setActiveModal('income')}
              className="py-3 px-4 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Nova Receita</span>
            </button>

            {/* - Nova Despesa */}
            <button
              id="quick-action-expense"
              onClick={() => setActiveModal('expense')}
              className="py-3 px-4 rounded-2xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Minus className="w-4 h-4 text-rose-400" />
              <span>Nova Despesa</span>
            </button>

            {/* ⇄ Transferência */}
            <button
              id="quick-action-transfer"
              onClick={() => setActiveModal('transfer')}
              className="py-3 px-4 rounded-2xl bg-blue-950/70 hover:bg-blue-900/80 border border-blue-500/40 text-blue-300 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-950/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-blue-400" />
              <span>Transferência</span>
            </button>

            {/* 🎯 Nova Meta */}
            <Link
              href="/metas"
              id="quick-action-goal"
              className="py-3 px-4 rounded-2xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-950/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Target className="w-4 h-4 text-purple-400" />
              <span>Nova Meta</span>
            </Link>

            {/* 📊 Gerar Relatório */}
            <Link
              href="/relatorios"
              id="quick-action-report"
              className="col-span-2 sm:col-span-1 py-3 px-4 rounded-2xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Gerar Relatório</span>
            </Link>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* QUICK MODALS: ADD INCOME / EXPENSE / TRANSFER */}
      {/* ========================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0e142e] border border-[#1b244d] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                activeModal === 'income' ? 'bg-emerald-500/20 text-emerald-400' :
                activeModal === 'expense' ? 'bg-rose-500/20 text-rose-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {activeModal === 'income' ? <ArrowDownLeft className="w-6 h-6" /> :
                 activeModal === 'expense' ? <ArrowUpRight className="w-6 h-6" /> :
                 <ArrowLeftRight className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {activeModal === 'income' ? 'Nova Receita / Salário' :
                   activeModal === 'expense' ? 'Nova Despesa' :
                   'Transferência entre Contas'}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeModal === 'income' ? 'Adicione salários, rendas ou pró-labore' :
                   activeModal === 'expense' ? 'Registre contas fixas, faturas ou despesas' :
                   'Transfira saldo entre suas contas cadastradas'}
                </p>
              </div>
            </div>

            {/* Quick Form */}
            <form onSubmit={activeModal === 'income' ? handleQuickAddIncome : handleQuickAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Valor (R$)</label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#151c3d] border border-[#222d5c] text-white text-lg font-black font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Descrição</label>
                <input
                  type="text"
                  placeholder={activeModal === 'income' ? 'Ex: Salário Mensal' : 'Ex: Supermercado, Aluguel'}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#151c3d] border border-[#222d5c] text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {activeModal === 'income' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Categoria</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#151c3d] border border-[#222d5c] text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Salário">Salário Fixo</option>
                    <option value="Freelance">Freelance / Extras</option>
                    <option value="Investimentos">Rendimento de Investimento</option>
                    <option value="Outros">Outras Receitas</option>
                  </select>
                </div>
              )}

              {activeModal === 'expense' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Categoria</label>
                  <select
                    value={expenseCategoryInput}
                    onChange={(e) => setExpenseCategoryInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#151c3d] border border-[#222d5c] text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Moradia">Moradia / Aluguel</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-lg flex items-center gap-2 ${
                    activeModal === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {submitting ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
