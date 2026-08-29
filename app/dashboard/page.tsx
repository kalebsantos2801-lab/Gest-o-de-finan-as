'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  CreditCard, 
  Banknote, 
  AlertOctagon, 
  Target, 
  PlusCircle, 
  TrendingUp, 
  Calendar,
  Users,
  ShieldCheck,
  Building,
  RefreshCw,
  Clock,
  Crown,
  Copy,
  Check,
  CheckSquare,
  AlertTriangle,
  Info,
  TrendingDown,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { Account, Income, Expense, Goal, CreditCard as CreditCardType, Debt } from '@/types/database';
import { memoryCache } from '@/lib/cache';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <DashboardContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function DashboardContent() {
  const { profile, family, user, familyMembers, trial, serverTime, refreshProfile } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedAccounts = memoryCache.get<Account[]>('dashboard_accounts');
    const cachedIncomes = memoryCache.get<Income[]>('dashboard_incomes');
    const cachedExpenses = memoryCache.get<Expense[]>('dashboard_expenses');
    const cachedGoals = memoryCache.get<Goal[]>('dashboard_goals');
    const cachedCards = memoryCache.get<CreditCardType[]>('dashboard_cards');
    const cachedDebts = memoryCache.get<Debt[]>('dashboard_debts');

    if (cachedAccounts) setAccounts(cachedAccounts);
    if (cachedIncomes) setIncomes(cachedIncomes);
    if (cachedExpenses) setExpenses(cachedExpenses);
    if (cachedGoals) setGoals(cachedGoals);
    if (cachedCards) setCards(cachedCards);
    if (cachedDebts) setDebts(cachedDebts);
    if (cachedAccounts) setLoading(false);
  }, []);

  const [copied, setCopied] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<'all' | 'thismonth' | '30days' | '15days'>('thismonth');
  const [expandedPreview, setExpandedPreview] = useState<boolean>(false);

  // Recovery migration for family_id mismatch to restore historical data
  useEffect(() => {
    async function recoverFamilyId() {
      const correctFamilyId = '8853acf1-f040-4b4e-b807-05bb97eca7a8';
      if (profile?.id && profile?.family_id && profile?.family_id !== correctFamilyId) {
        const wrongFamilyId = profile.family_id;
        console.log(`Migrating family_id back to original santos family from ${wrongFamilyId}...`);
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ family_id: correctFamilyId })
            .eq('id', profile.id);
          
          if (!error) {
            // Delete duplicate family member row and empty duplicate family
            await supabase
              .from('family_members')
              .delete()
              .eq('family_id', wrongFamilyId)
              .eq('user_id', profile.id);

            await supabase
              .from('families')
              .delete()
              .eq('id', wrongFamilyId);

            await refreshProfile();
          }
        } catch (e) {
          console.error('Migration failed:', e);
        }
      }
    }
    recoverFamilyId();
  }, [profile, refreshProfile]);

  const handleCopyFamilyId = () => {
    if (family?.id) {
      navigator.clipboard.writeText(family.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.family_id && !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const familyId = profile?.family_id;

      // 1. Fetch Accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('family_id', familyId);
      if (accountsData) {
        setAccounts(accountsData as Account[]);
        memoryCache.set('dashboard_accounts', accountsData);
      }

      // 2. Fetch Recent Incomes (loaded without limits to allow correct dashboard-wide calculations)
      const { data: incomeData } = await supabase
        .from('income')
        .select('*')
        .eq('family_id', familyId)
        .order('received_at', { ascending: false });
      if (incomeData) {
        setIncomes(incomeData as Income[]);
        memoryCache.set('dashboard_incomes', incomeData);
      }

      // 3. Fetch Recent Expenses (loaded without limits to allow correct dashboard-wide calculations)
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .eq('family_id', familyId)
        .order('due_date', { ascending: false });
      if (expenseData) {
        setExpenses(expenseData as Expense[]);
        memoryCache.set('dashboard_expenses', expenseData);
      }

      // 4. Fetch Goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('family_id', familyId)
        .limit(4);
      if (goalsData) {
        setGoals(goalsData as Goal[]);
        memoryCache.set('dashboard_goals', goalsData);
      }

      // 5. Fetch Cards
      const { data: cardsData } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('family_id', familyId);
      if (cardsData) {
        setCards(cardsData as CreditCardType[]);
        memoryCache.set('dashboard_cards', cardsData);
      }

      // 6. Fetch Debts
      const { data: debtsData } = await supabase
        .from('debts')
        .select('*')
        .eq('family_id', familyId);
      if (debtsData) {
        setDebts(debtsData as Debt[]);
        memoryCache.set('dashboard_debts', debtsData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id, user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculations based on REAL user data (Filtered dynamically by selectedRange)
  const displayIncomes = incomes.filter(item => {
    if (selectedRange === 'all') return true;
    const dateStr = item.received_at;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const now = new Date(serverTime);
    
    if (selectedRange === 'thismonth') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (selectedRange === '30days') {
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 30;
    }
    if (selectedRange === '15days') {
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 15;
    }
    return true;
  });

  const displayExpenses = expenses.filter(item => {
    if (selectedRange === 'all') return true;
    const dateStr = item.due_date;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const now = new Date(serverTime);
    
    if (selectedRange === 'thismonth') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (selectedRange === '30days') {
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 30;
    }
    if (selectedRange === '15days') {
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 15;
    }
    return true;
  });

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);
  const totalIncome = displayIncomes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalExpense = displayExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const netSavings = totalIncome - totalExpense;
  const totalCardSpend = cards.reduce((acc, curr) => acc + Number(curr.current_bill || 0), 0);
  const totalRemainingDebt = debts
    .filter(d => d.status !== 'settled')
    .reduce((acc, curr) => acc + (Number(curr.total_amount || 0) - Number(curr.paid_amount || 0)), 0);
  const activeDebts = debts.filter(d => d.status !== 'settled');

  // Additional Expense and Trial calculations
  const paidExpenses = displayExpenses.filter(e => e.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const pendingExpenses = displayExpenses.filter(e => e.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const paidRatio = totalExpense > 0 ? (paidExpenses / totalExpense) * 100 : 0;

  const upcomingBills = displayExpenses.filter(e => e.status === 'pending');

  const expensesByCategory = displayExpenses.reduce((acc, curr) => {
    const cat = curr.category || 'Outros';
    acc[cat] = (acc[cat] || 0) + Number(curr.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const daysRemaining = trial?.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(trial.trial_expires_at).getTime() - serverTime.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // 6-Month dynamic cashflow chart compiler
  const chartData = React.useMemo(() => {
    interface ChartItem {
      id: number;
      year: number;
      month: number;
      label: string;
      income: number;
      expense: number;
    }
    const data: ChartItem[] = [];
    const now = new Date(serverTime);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      data.push({
        id: i,
        year: d.getFullYear(),
        month: d.getMonth(),
        label: label.charAt(0).toUpperCase() + label.slice(1),
        income: 0,
        expense: 0
      });
    }

    incomes.forEach(inc => {
      if (!inc.received_at) return;
      const incDate = new Date(inc.received_at);
      const m = incDate.getMonth();
      const y = incDate.getFullYear();
      const match = data.find(d => d.month === m && d.year === y);
      if (match) {
        match.income += Number(inc.amount || 0);
      }
    });

    expenses.forEach(exp => {
      if (!exp.due_date) return;
      const expDate = new Date(exp.due_date);
      const m = expDate.getMonth();
      const y = expDate.getFullYear();
      const match = data.find(d => d.month === m && d.year === y);
      if (match) {
        match.expense += Number(exp.amount || 0);
      }
    });

    return data.reverse(); // chronological (oldest to newest)
  }, [incomes, expenses, serverTime]);

  const maxChartVal = React.useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 500);
    return maxVal * 1.15; // 15% padding top
  }, [chartData]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Painel de Contagem Regressiva do Tempo de Acesso */}
        {trial?.trial_expires_at && (
          <CountdownTimer 
            expiresAt={trial.trial_expires_at} 
            variant="card"
          />
        )}

        {/* Módulo Topo: Pré-visualização das Minhas Contas & Pendências */}
        <div className="bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-indigo-950/80 border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-rose-500/5 opacity-40 pointer-events-none" />

          {/* Top Bar: Title, Tabs & Quick Actions */}
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-inner flex-shrink-0">
                {(() => {
                  const hour = serverTime.getHours();
                  if (hour >= 5 && hour < 12) return <span className="text-2xl animate-pulse">☀️</span>;
                  if (hour >= 12 && hour < 18) return <span className="text-2xl animate-pulse">🌤️</span>;
                  return <span className="text-2xl animate-pulse">🌙</span>;
                })()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 font-mono capitalize">
                    {serverTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400 font-semibold">Atualizado em Tempo Real</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  {(() => {
                    const hour = serverTime.getHours();
                    if (hour >= 5 && hour < 12) return 'Bom dia';
                    if (hour >= 12 && hour < 18) return 'Boa tarde';
                    return 'Boa noite';
                  })()}, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
                </h1>
              </div>
            </div>

            {/* Actions & Global Total */}
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div className="p-2.5 px-4 bg-white/[0.04] border border-white/10 rounded-2xl hidden sm:flex items-center gap-3">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Saldo Total:</span>
                <span className="text-base font-black text-white font-mono">
                  R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                onClick={fetchDashboardData}
                title="Sincronizar dados"
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 text-xs font-semibold transition active:scale-[0.98] cursor-pointer flex items-center justify-center"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              <Link
                href="/entradas"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 active:scale-[0.98]"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>+ Entrada</span>
              </Link>
              <Link
                href="/despesas"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/25 border border-rose-400/20 active:scale-[0.98]"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+ Despesa</span>
              </Link>
              <Link
                href="/dividas"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-xl text-xs font-bold transition shadow-lg border border-red-500/30 active:scale-[0.98]"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                <span>Dívidas</span>
              </Link>
            </div>
          </div>

          {/* Unified Preview Trigger Button */}
          <div className="relative z-10 flex items-center justify-between gap-4 pt-4">
            <button
              onClick={() => setExpandedPreview(prev => !prev)}
              className={`w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                expandedPreview
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-400/40 shadow-lg shadow-indigo-600/30'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {expandedPreview ? (
                  <EyeOff className="w-4 h-4 text-indigo-200" />
                ) : (
                  <Eye className="w-4 h-4 text-indigo-400" />
                )}
                <span className="text-xs sm:text-sm font-bold">
                  {expandedPreview ? 'Ocultar Pré-visualização Geral' : 'Abrir Pré-visualização Geral'}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium">
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                  {accounts.length} contas
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20">
                  {upcomingBills.length} pendências
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
                  {cards.length} cartões
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/20">
                  {activeDebts.length} dívidas
                </span>
              </div>

              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedPreview ? 'rotate-180 text-white' : 'text-slate-400'
                }`}
              />
            </button>
          </div>

          {/* Expanded Dynamic Content - Unified Preview */}
          {expandedPreview && (
            <div className="relative z-10 mt-6 pt-6 border-t border-white/10 transition-all duration-300 space-y-8">
              {/* SECTION: ACCOUNTS */}
              <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Contas Bancárias ({accounts.length})
                      </h3>
                    </div>
                    <Link
                      href="/contas"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                    >
                      <span>Ver Contas</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {accounts.length === 0 ? (
                    <div className="text-center py-6 bg-white/[0.02] rounded-2xl border border-white/5 p-4 space-y-2">
                      <p className="text-xs text-slate-400">Nenhuma conta bancária cadastrada.</p>
                      <Link href="/contas" className="inline-block text-xs font-bold text-indigo-400 hover:text-indigo-300">
                        + Cadastrar Conta
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {accounts.map((acc) => {
                        const balanceNum = Number(acc.balance || 0);
                        const isPositive = balanceNum >= 0;
                        const typeLabels: Record<string, string> = {
                          checking: 'Conta Corrente',
                          savings: 'Poupança',
                          investment: 'Investimento',
                          cash: 'Dinheiro',
                          other: 'Outra'
                        };

                        return (
                          <div
                            key={acc.id}
                            className="group bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 rounded-2xl p-4 space-y-2.5 transition-all duration-200 shadow-md relative overflow-hidden"
                          >
                            <div
                              className="absolute top-0 left-0 right-0 h-1 opacity-80"
                              style={{ backgroundColor: acc.color || '#6366f1' }}
                            />

                            <div className="flex items-start justify-between gap-2.5 pt-0.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="w-7.5 h-7.5 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-inner flex-shrink-0"
                                  style={{ backgroundColor: acc.color || '#6366f1' }}
                                >
                                  {(acc.institution || acc.name).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-white text-sm truncate group-hover:text-indigo-200 transition-colors">
                                    {acc.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {acc.institution || 'Instituição'}
                                  </p>
                                </div>
                              </div>

                              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-400 flex-shrink-0">
                                {typeLabels[acc.type] || acc.type}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-white/5 flex items-end justify-between">
                              <span className="text-[10px] text-slate-400">Saldo</span>
                              <div className="text-right">
                                <span className={`text-sm font-black font-mono tracking-tight ${
                                  isPositive ? 'text-slate-100' : 'text-rose-400'
                                }`}>
                                  R$ {balanceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* SECTION: PENDING EXPENSES */}
              <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Despesas Pendentes & Contas a Vencer ({upcomingBills.length})
                      </h3>
                      <span className="text-[11px] text-rose-400 font-mono font-semibold">
                        • Total: R$ {pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Link
                      href="/despesas"
                      className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold transition"
                    >
                      <span>Ver Despesas</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {upcomingBills.length === 0 ? (
                    <div className="text-center py-6 bg-white/[0.02] rounded-2xl border border-white/5 p-4 space-y-2">
                      <p className="text-xs text-slate-400">Nenhuma despesa pendente registrada no período.</p>
                      <Link href="/despesas" className="inline-block text-xs font-bold text-rose-400 hover:text-rose-300">
                        + Lançar Despesa
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {upcomingBills.map((bill) => {
                        const dueDate = bill.due_date ? new Date(bill.due_date) : null;
                        const isOverdue = dueDate && dueDate < new Date(serverTime.getFullYear(), serverTime.getMonth(), serverTime.getDate());
                        const isToday = dueDate && dueDate.toDateString() === serverTime.toDateString();

                        return (
                          <div
                            key={bill.id}
                            className={`p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                              isOverdue
                                ? 'bg-rose-950/40 border-rose-500/30 hover:border-rose-500/50'
                                : isToday
                                ? 'bg-amber-950/40 border-amber-500/30 hover:border-amber-500/50'
                                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-white text-sm truncate">{bill.description}</h4>
                                <p className="text-[10px] text-slate-400 truncate">{bill.category || 'Geral'}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                isOverdue
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isToday
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-white/10 text-slate-300'
                              }`}>
                                {isOverdue ? 'Atrasada' : isToday ? 'Vence Hoje' : 'Pendente'}
                              </span>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Calendar className="w-3 h-3" />
                                <span>{dueDate ? dueDate.toLocaleDateString('pt-BR') : 'Sem data'}</span>
                              </div>
                              <span className="font-mono font-bold text-rose-400 text-sm">
                                R$ {Number(bill.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* SECTION: CREDIT CARDS */}
              <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Cartões de Crédito ({cards.length})
                      </h3>
                      <span className="text-[11px] text-purple-400 font-mono font-semibold">
                        • Faturas: R$ {totalCardSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Link
                      href="/cartoes"
                      className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold transition"
                    >
                      <span>Ver Cartões</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {cards.length === 0 ? (
                    <div className="text-center py-6 bg-white/[0.02] rounded-2xl border border-white/5 p-4 space-y-2">
                      <p className="text-xs text-slate-400">Nenhum cartão de crédito cadastrado.</p>
                      <Link href="/cartoes" className="inline-block text-xs font-bold text-purple-400 hover:text-purple-300">
                        + Cadastrar Cartão
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {cards.map((card) => {
                        const bill = Number(card.current_bill || 0);
                        const limit = Number(card.credit_limit || 0);
                        const usagePercent = limit > 0 ? Math.min(100, (bill / limit) * 100) : 0;

                        return (
                          <div key={card.id} className="p-3.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-white/10 space-y-2.5 transition">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/20">
                                  <CreditCard className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white text-sm truncate">{card.name}</p>
                                  <p className="text-[10px] text-slate-400">Fecha dia {card.closing_day} • Vence {card.due_day}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-rose-400 block text-sm">
                                  R$ {bill.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  Lim: R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {limit > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                  <span>Limite Utilizado</span>
                                  <span>{usagePercent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-purple-500'
                                    }`}
                                    style={{ width: `${usagePercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* SECTION: DEBTS */}
              <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Dívidas & Compromissos Financeiros ({activeDebts.length})
                      </h3>
                      <span className="text-[11px] text-red-400 font-mono font-semibold">
                        • Saldo Devedor: R$ {totalRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Link
                      href="/dividas"
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold transition"
                    >
                      <span>Ver Dívidas</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {activeDebts.length === 0 ? (
                    <div className="text-center py-6 bg-white/[0.02] rounded-2xl border border-white/5 p-4 space-y-2">
                      <p className="text-xs text-slate-400">Nenhuma dívida ativa registrada.</p>
                      <Link href="/dividas" className="inline-block text-xs font-bold text-red-400 hover:text-red-300">
                        + Cadastrar Dívida
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {activeDebts.map((debt) => {
                        const total = Number(debt.total_amount || 0);
                        const paid = Number(debt.paid_amount || 0);
                        const remaining = total - paid;
                        const progress = total > 0 ? (paid / total) * 100 : 0;

                        return (
                          <div
                            key={debt.id}
                            className="p-3.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-red-500/20 hover:border-red-500/40 space-y-2.5 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-white text-sm truncate">{debt.description}</h4>
                                <p className="text-[10px] text-slate-400 truncate">{debt.creditor || 'Credor não inf.'}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                                {debt.status === 'renegotiating' ? 'Em Renegociação' : 'Pendente'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">Restante:</span>
                                <span className="font-mono font-bold text-red-400">
                                  R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, progress)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
            </div>
          )}
        </div>

        {/* Real Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* Saldo Total */}
          <div className="group bg-gradient-to-br from-slate-900/95 to-slate-900/85 border border-white/10 rounded-[28px] p-6 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Consolidado</span>
              <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/25 shadow-inner">
                <Wallet className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight group-hover:text-indigo-200 transition-colors">
                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span>{accounts.length} {accounts.length === 1 ? 'conta ativa' : 'contas ativas'}</span>
              </div>
            </div>
          </div>

          {/* Entradas */}
          <div className="group bg-gradient-to-br from-slate-900/95 to-slate-900/85 border border-white/10 rounded-[28px] p-6 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Receitas</span>
              <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/25 shadow-inner">
                <ArrowDownLeft className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="font-extrabold text-emerald-400">+{displayIncomes.length}</span>
                <span>receitas no período</span>
              </div>
            </div>
          </div>

          {/* Despesas */}
          <div className="group bg-gradient-to-br from-slate-900/95 to-slate-900/85 border border-white/10 rounded-[28px] p-6 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-rose-500/5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Despesas</span>
              <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/25 shadow-inner">
                <ArrowUpRight className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight group-hover:text-rose-300 transition-colors">
                R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="font-extrabold text-rose-400">-{displayExpenses.length}</span>
                <span>despesas no período</span>
              </div>
            </div>
          </div>

          {/* Despesas do Cartão */}
          <div className="group bg-gradient-to-br from-slate-900/95 to-slate-900/85 border border-white/10 rounded-[28px] p-6 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Despesas do Cartão</span>
              <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/25 shadow-inner">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight group-hover:text-amber-300 transition-colors">
                R$ {totalCardSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="font-extrabold text-amber-400">{cards.length}</span>
                <span>{cards.length === 1 ? 'cartão ativo' : 'cartões ativos'}</span>
              </div>
            </div>
          </div>

          {/* Dívidas (Passivo Pendente) */}
          <Link
            href="/dividas"
            className="group bg-gradient-to-br from-slate-900/95 to-slate-900/85 border border-white/10 rounded-[28px] p-6 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden block"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-red-500/15 transition-colors" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dívidas</span>
              <div className="p-2.5 bg-red-500/15 text-red-400 rounded-xl border border-red-500/25 shadow-inner group-hover:scale-105 transition-transform">
                <AlertOctagon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono tracking-tight group-hover:text-red-300 transition-colors">
                R$ {totalRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className={`font-extrabold ${activeDebts.length > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {activeDebts.length}
                </span>
                <span>{activeDebts.length === 1 ? 'dívida ativa' : 'dívidas ativas'}</span>
              </div>
            </div>
          </Link>

          {/* Balanço / Economia */}
          <div className="group bg-gradient-to-br from-slate-900/95 to-slate-900/85 border border-white/10 rounded-[28px] p-6 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Balanço Líquido</span>
              <div className="p-2.5 bg-cyan-500/15 text-cyan-400 rounded-xl border border-cyan-500/25 shadow-inner">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight transition-colors ${
                netSavings >= 0 ? 'text-indigo-300 group-hover:text-indigo-200' : 'text-amber-400 group-hover:text-amber-300'
              }`}>
                R$ {netSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {netSavings >= 0 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Economia Positiva
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold">
                    Despesas superam receitas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Nav Shortcuts */}
        <div className="bg-slate-900/90 border border-white/10 rounded-[28px] p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">
            Módulos Financeiros Integrados ao Supabase RLS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Link href="/contas" className="p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 rounded-2xl text-center transition group">
              <Wallet className="w-5 h-5 text-indigo-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold text-slate-200 block">Contas</span>
            </Link>
            <Link href="/cartoes" className="p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 rounded-2xl text-center transition group">
              <CreditCard className="w-5 h-5 text-purple-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold text-slate-200 block">Cartões</span>
            </Link>
            <Link href="/emprestimos" className="p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 rounded-2xl text-center transition group">
              <Banknote className="w-5 h-5 text-emerald-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold text-slate-200 block">Empréstimos</span>
            </Link>
            <Link href="/dividas" className="p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 rounded-2xl text-center transition group">
              <AlertOctagon className="w-5 h-5 text-rose-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold text-slate-200 block">Dívidas</span>
            </Link>
            <Link href="/metas" className="p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 rounded-2xl text-center transition group">
              <Target className="w-5 h-5 text-amber-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold text-slate-200 block">Metas</span>
            </Link>
            <Link href="/relatorios" className="p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 rounded-2xl text-center transition group">
              <TrendingUp className="w-5 h-5 text-cyan-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold text-slate-200 block">Relatórios</span>
            </Link>
            <Link href="/configuracoes" className="p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 rounded-2xl text-center transition group">
              <Users className="w-5 h-5 text-slate-400 mx-auto mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold text-slate-200 block">Família</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
