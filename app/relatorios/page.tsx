'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Income, Expense, Account, Debt, Goal, Loan, FamilyMember } from '@/types/database';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, PieChart as PieChartIcon, Calendar, Loader2, Sparkles, Landmark, Target, AlertOctagon, BarChart3, FileSpreadsheet } from 'lucide-react';
import { FinancialTrajectoryInfographic } from '@/components/reports/FinancialTrajectoryInfographic';
import { FinHouseGraphicPanel } from '@/components/reports/FinHouseGraphicPanel';

import { extractMonthAndYear, safeNumber } from '@/lib/dateUtils';

export default function ReportsPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <ReportsContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function ReportsContent() {
  const { profile, family, user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>(() => memoryCache.get<Income[]>('report_incomes') || []);
  const [expenses, setExpenses] = useState<Expense[]>(() => memoryCache.get<Expense[]>('report_expenses') || []);
  const [accounts, setAccounts] = useState<Account[]>(() => memoryCache.get<Account[]>('report_accounts') || []);
  const [debts, setDebts] = useState<Debt[]>(() => memoryCache.get<Debt[]>('report_debts') || []);
  const [goals, setGoals] = useState<Goal[]>(() => memoryCache.get<Goal[]>('report_goals') || []);
  const [loans, setLoans] = useState<Loan[]>(() => memoryCache.get<Loan[]>('report_loans') || []);
  const [members, setMembers] = useState<FamilyMember[]>(() => memoryCache.get<FamilyMember[]>('report_members') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('report_incomes'));
  const [reportView, setReportView] = useState<'grafico' | 'editorial'>('grafico');

  const loadData = useCallback(async () => {
    const familyId = profile?.family_id;
    const userId = user?.id || profile?.id;

    if (!familyId && !userId) {
      setLoading(false);
      return;
    }
    
    // Only set loading if cache is missing to avoid visual disruption
    const hasCache = memoryCache.get('report_incomes') !== null && memoryCache.get('report_expenses') !== null;
    if (!hasCache) {
      setLoading(true);
    }
    try {
      // Build queries that strictly isolate data by user_id and private family_id
      const incPromise = userId
        ? (familyId 
            ? supabase.from('income').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('income').select('*').eq('user_id', userId))
        : supabase.from('income').select('*').eq('family_id', familyId!);

      const expPromise = userId
        ? (familyId 
            ? supabase.from('expenses').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('expenses').select('*').eq('user_id', userId))
        : supabase.from('expenses').select('*').eq('family_id', familyId!);

      const accPromise = userId
        ? (familyId 
            ? supabase.from('accounts').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('accounts').select('*').eq('user_id', userId))
        : supabase.from('accounts').select('*').eq('family_id', familyId!);

      const dbtPromise = userId
        ? (familyId 
            ? supabase.from('debts').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('debts').select('*').eq('user_id', userId))
        : supabase.from('debts').select('*').eq('family_id', familyId!);

      const glsPromise = userId
        ? (familyId 
            ? supabase.from('goals').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('goals').select('*').eq('user_id', userId))
        : supabase.from('goals').select('*').eq('family_id', familyId!);

      const lnsPromise = userId
        ? (familyId 
            ? supabase.from('loans').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('loans').select('*').eq('user_id', userId))
        : supabase.from('loans').select('*').eq('family_id', familyId!);

      const memsPromise = familyId
        ? supabase.from('family_members').select('*, profile:profiles(*)').eq('family_id', familyId)
        : Promise.resolve({ data: [] });

      const [
        { data: inc },
        { data: exp },
        { data: acc },
        { data: dbt },
        { data: gls },
        { data: lns },
        { data: mems }
      ] = await Promise.all([
        incPromise,
        expPromise,
        accPromise,
        dbtPromise,
        glsPromise,
        lnsPromise,
        memsPromise
      ]);

      if (inc) {
        setIncomes(inc as Income[]);
        memoryCache.set('report_incomes', inc);
      }
      if (exp) {
        setExpenses(exp as Expense[]);
        memoryCache.set('report_expenses', exp);
      }
      if (acc) {
        setAccounts(acc as Account[]);
        memoryCache.set('report_accounts', acc);
      }
      if (dbt) {
        setDebts(dbt as Debt[]);
        memoryCache.set('report_debts', dbt);
      }
      if (gls) {
        setGoals(gls as Goal[]);
        memoryCache.set('report_goals', gls);
      }
      if (lns) {
        setLoans(lns as Loan[]);
        memoryCache.set('report_loans', lns);
      }
      if (mems) {
        setMembers(mems as FamilyMember[]);
        memoryCache.set('report_members', mems);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id, profile?.id, user?.id]);

  useEffect(() => {
    const hasCache = memoryCache.get('report_incomes');
    if (hasCache) {
      // Defer background revalidation by 400ms to allow route transitions to complete with 0% CPU thread blocking
      const timer = setTimeout(() => {
        loadData();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      loadData();
    }
  }, [loadData]);

  const totalIncome = incomes.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);
  const balance = totalIncome - totalExpense;
  const totalInAccounts = accounts.reduce((acc, curr) => acc + safeNumber(curr.balance), 0);

  // Group expenses by category for selected month
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const now = new Date();
  const [catMonth, setCatMonth] = useState<number>(now.getMonth());
  const [catYear, setCatYear] = useState<number>(now.getFullYear());

  const handlePrevCatMonth = () => {
    if (catMonth === 0) {
      setCatMonth(11);
      setCatYear(prev => prev - 1);
    } else {
      setCatMonth(prev => prev - 1);
    }
  };

  const handleNextCatMonth = () => {
    if (catMonth === 11) {
      setCatMonth(0);
      setCatYear(prev => prev + 1);
    } else {
      setCatMonth(prev => prev + 1);
    }
  };

  const selectedCatMonthExpenses = expenses.filter(e => {
    const targetVal = catYear * 12 + catMonth;
    const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
    if (!parsed) return true;
    const itemVal = parsed.year * 12 + parsed.month;
    if (e.is_recurring) {
      return itemVal <= targetVal;
    }
    return parsed.month === catMonth && parsed.year === catYear;
  });

  const selectedCatTotalExpense = selectedCatMonthExpenses.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);

  const expensesByCategory: Record<string, number> = {};
  selectedCatMonthExpenses.forEach((e) => {
    const cat = e.category || 'Outros';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + safeNumber(e.amount);
  });

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Header */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              Relatórios e Painel Gráfico Financeiro
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gráficos de evolução histórica, distribuição de categorias, metas e projeções
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
            {/* View switcher */}
            <div className="flex items-center p-1 rounded-2xl bg-[#0e142e] border border-white/10 text-xs font-bold">
              <button
                onClick={() => setReportView('grafico')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  reportView === 'grafico'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Painel Gráfico</span>
              </button>
              <button
                onClick={() => setReportView('editorial')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  reportView === 'editorial'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Demonstrativo DRE</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Família {family?.name || 'Familiar'}</span>
            </div>
          </div>
        </div>

        {/* Dynamic View: Graphic Panel vs DRE Infographic */}
        {loading ? (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[32px] p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="font-semibold text-sm">Carregando e compilando dados gráficos...</span>
          </div>
        ) : reportView === 'grafico' ? (
          <FinHouseGraphicPanel
            incomes={incomes}
            expenses={expenses}
            accounts={accounts}
            goals={goals}
            debts={debts}
            loans={loans}
            familyName={family?.name || 'Familiar'}
          />
        ) : (
          <div className="space-y-6">
            {/* Global Key Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 space-y-1.5 shadow-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total de Entradas</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                  R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-500">{incomes.length} lançamento(s)</span>
              </div>

              <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 space-y-1.5 shadow-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total de Despesas</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
                  R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-500">{expenses.length} despesa(s)</span>
              </div>

              <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 space-y-1.5 shadow-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Resultado Operacional</span>
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${balance >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-500">{balance >= 0 ? 'Superávit líquido' : 'Déficit no período'}</span>
              </div>

              <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 space-y-1.5 shadow-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Saldo em Contas</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">
                  R$ {totalInAccounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-500">{accounts.length} conta(s) vinculada(s)</span>
              </div>
            </div>

            <FinancialTrajectoryInfographic 
              incomes={incomes}
              expenses={expenses}
              accounts={accounts}
              debts={debts}
              goals={goals}
              loans={loans}
              members={members}
              familyName={family?.name || 'Familiar'}
            />
          </div>
        )}

        {/* Category Breakdown */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded-lg text-indigo-400">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <span>Distribuição de Gastos por Categoria</span>
            </h3>

            {/* Calendar / Month Navigation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevCatMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition text-xs font-bold cursor-pointer"
                title="Mês Anterior"
              >
                &larr;
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e142e] border border-white/10 text-xs font-bold text-white">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={catMonth}
                  onChange={(e) => setCatMonth(Number(e.target.value))}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx} className="bg-[#0e142e] text-white">{m}</option>
                  ))}
                </select>
                <span className="text-slate-500">/</span>
                <select
                  value={catYear}
                  onChange={(e) => setCatYear(Number(e.target.value))}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y} className="bg-[#0e142e] text-white">{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextCatMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition text-xs font-bold cursor-pointer"
                title="Próximo Mês"
              >
                &rarr;
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Calculando balanços reais...</span>
            </div>
          ) : Object.keys(expensesByCategory).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhuma despesa registrada no mês de {MONTH_NAMES[catMonth]} de {catYear}.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(expensesByCategory).map(([cat, val]) => {
                const pct = selectedCatTotalExpense > 0 ? Math.round((val / selectedCatTotalExpense) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200 font-bold">{cat}</span>
                      <span className="text-slate-400 font-mono">
                        R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-indigo-400 font-bold">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full shadow-sm" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

