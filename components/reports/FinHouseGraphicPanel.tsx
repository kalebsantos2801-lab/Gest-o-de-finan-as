'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
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
  Info, 
  Plus, 
  BarChart3, 
  Calendar, 
  CreditCard, 
  ChevronRight,
  ArrowLeftRight,
  Target,
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Account, Income, Expense, Goal, Debt, Loan } from '@/types/database';
import { extractMonthAndYear, safeNumber } from '@/lib/dateUtils';

interface FinHouseGraphicPanelProps {
  incomes: Income[];
  expenses: Expense[];
  accounts: Account[];
  goals: Goal[];
  debts?: Debt[];
  loans?: Loan[];
  familyName?: string;
}

export function FinHouseGraphicPanel({
  incomes,
  expenses,
  accounts,
  goals,
  debts = [],
  loans = [],
  familyName = 'Familiar'
}: FinHouseGraphicPanelProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ month: string; income: number; expense: number } | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');

  const now = useMemo(() => new Date(), []);
  const currentMonthIdx = now.getMonth();
  const currentYearNum = now.getFullYear();

  // Active Selected Month & Year state
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);

  const MONTH_NAMES = useMemo(() => [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ], []);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentMonthIdx);
    setSelectedYear(currentYearNum);
  };

  const isCurrentMonthSelected = selectedMonth === currentMonthIdx && selectedYear === currentYearNum;

  // Selected month income & expenses with safe date parsing & recurring item support
  const selectedMonthIncomes = useMemo(() => {
    const targetMonthVal = selectedYear * 12 + selectedMonth;
    return incomes.filter(i => {
      const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
      if (!parsed) return true;
      const itemMonthVal = parsed.year * 12 + parsed.month;
      if (i.is_recurring) {
        return itemMonthVal <= targetMonthVal;
      }
      return parsed.month === selectedMonth && parsed.year === selectedYear;
    });
  }, [incomes, selectedMonth, selectedYear]);

  const selectedMonthExpenses = useMemo(() => {
    const targetMonthVal = selectedYear * 12 + selectedMonth;
    return expenses.filter(e => {
      const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
      if (!parsed) return true;
      const itemMonthVal = parsed.year * 12 + parsed.month;
      if (e.is_recurring) {
        return itemMonthVal <= targetMonthVal;
      }
      return parsed.month === selectedMonth && parsed.year === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  // Aggregate values
  const realTotalBalance = accounts.reduce((acc, curr) => acc + safeNumber(curr.balance), 0);
  const realTotalIncome = selectedMonthIncomes.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);
  const realTotalExpense = selectedMonthExpenses.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);

  const displayTotalBalance = realTotalBalance;
  const displayTotalIncome = realTotalIncome;
  const displayTotalExpense = realTotalExpense;
  const displaySavings = displayTotalIncome - displayTotalExpense;
  const displaySavingsRate = displayTotalIncome > 0 ? (displaySavings / displayTotalIncome) * 100 : 0;

  // Previous month calculations for percentage comparisons
  const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYearNum = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const prevMonthIncomes = useMemo(() => {
    const prevMonthVal = prevYearNum * 12 + prevMonthIdx;
    return incomes.filter(i => {
      const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
      if (!parsed) return false;
      const itemMonthVal = parsed.year * 12 + parsed.month;
      if (i.is_recurring) {
        return itemMonthVal <= prevMonthVal;
      }
      return parsed.month === prevMonthIdx && parsed.year === prevYearNum;
    });
  }, [incomes, prevMonthIdx, prevYearNum]);

  const prevMonthExpenses = useMemo(() => {
    const prevMonthVal = prevYearNum * 12 + prevMonthIdx;
    return expenses.filter(e => {
      const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
      if (!parsed) return false;
      const itemMonthVal = parsed.year * 12 + parsed.month;
      if (e.is_recurring) {
        return itemMonthVal <= prevMonthVal;
      }
      return parsed.month === prevMonthIdx && parsed.year === prevYearNum;
    });
  }, [expenses, prevMonthIdx, prevYearNum]);

  const prevTotalIncome = prevMonthIncomes.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);
  const prevTotalExpense = prevMonthExpenses.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);

  const incomeChangePct = prevTotalIncome > 0 
    ? ((displayTotalIncome - prevTotalIncome) / prevTotalIncome) * 100 
    : null;
    
  const expenseChangePct = prevTotalExpense > 0 
    ? ((displayTotalExpense - prevTotalExpense) / prevTotalExpense) * 100 
    : null;

  // Timeline (8 months leading to selected month)
  const monthlyTimelineData = useMemo(() => {
    const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = [];
    
    for (let i = 7; i >= 0; i--) {
      let mIdx = selectedMonth - i;
      let yIdx = selectedYear;
      while (mIdx < 0) {
        mIdx += 12;
        yIdx -= 1;
      }
      const label = monthNamesShort[mIdx];

      const targetMVal = yIdx * 12 + mIdx;

      const mIncs = incomes.filter(inc => {
        const parsed = extractMonthAndYear(inc.received_at || (inc as any).date || inc.created_at);
        if (!parsed) return false;
        const itemVal = parsed.year * 12 + parsed.month;
        if (inc.is_recurring) return itemVal <= targetMVal;
        return parsed.month === mIdx && parsed.year === yIdx;
      });

      const mExps = expenses.filter(exp => {
        const parsed = extractMonthAndYear(exp.due_date || (exp as any).date || (exp as any).payment_date || exp.created_at);
        if (!parsed) return false;
        const itemVal = parsed.year * 12 + parsed.month;
        if (exp.is_recurring) return itemVal <= targetMVal;
        return parsed.month === mIdx && parsed.year === yIdx;
      });

      const sumInc = mIncs.reduce((s, item) => s + safeNumber(item.amount), 0);
      const sumExp = mExps.reduce((s, item) => s + safeNumber(item.amount), 0);

      result.push({
        label,
        monthIdx: mIdx,
        yearNum: yIdx,
        key: `${yIdx}-${mIdx}`,
        inc: sumInc,
        exp: sumExp
      });
    }

    return result;
  }, [incomes, expenses, selectedMonth, selectedYear]);

  const timelineMaxVal = useMemo(() => {
    const max = Math.max(...monthlyTimelineData.map(d => Math.max(d.inc, d.exp)), 1000);
    return Math.ceil(max / 1000) * 1000;
  }, [monthlyTimelineData]);

  // Categories Breakdown (uses selected month expenses)
  const categoriesData = useMemo(() => {
    const targetExpenses = selectedMonthExpenses;
    const catMap: Record<string, { total: number; recurringCount: number }> = {};
    
    targetExpenses.forEach(exp => {
      const cat = exp.category || 'Outros';
      if (!catMap[cat]) {
        catMap[cat] = { total: 0, recurringCount: 0 };
      }
      catMap[cat].total += safeNumber(exp.amount);
      if (exp.is_recurring) {
        catMap[cat].recurringCount += 1;
      }
    });

    // Include debts (Dívidas)
    debts.forEach(d => {
      if (d.status !== 'settled') {
        const remaining = safeNumber(d.total_amount) - safeNumber(d.paid_amount);
        if (remaining > 0) {
          if (!catMap['Dívidas']) catMap['Dívidas'] = { total: 0, recurringCount: 0 };
          catMap['Dívidas'].total += remaining;
        }
      }
    });

    const categoryIcons: Record<string, any> = {
      'Moradia': { icon: Home, color: '#3b82f6', bg: 'bg-blue-500/20 text-blue-400' },
      'Alimentação': { icon: Utensils, color: '#10b981', bg: 'bg-emerald-500/20 text-emerald-400' },
      'Transporte': { icon: Car, color: '#06b6d4', bg: 'bg-cyan-500/20 text-cyan-400' },
      'Saúde': { icon: Heart, color: '#f97316', bg: 'bg-orange-500/20 text-orange-400' },
      'Lazer': { icon: Gamepad2, color: '#a855f7', bg: 'bg-purple-500/20 text-purple-400' },
      'Educação': { icon: Lightbulb, color: '#eab308', bg: 'bg-yellow-500/20 text-yellow-400' },
      'Dívidas': { icon: AlertCircle, color: '#ef4444', bg: 'bg-rose-500/20 text-rose-400' },
      'Outros': { icon: MoreHorizontal, color: '#6366f1', bg: 'bg-indigo-500/20 text-indigo-400' }
    };

    const totalExpense = Object.values(catMap).reduce((s, v) => s + v.total, 0) || 1;

    return Object.entries(catMap)
      .map(([name, data]) => {
        const meta = categoryIcons[name] || categoryIcons['Outros'];
        const percentage = Math.round((data.total / totalExpense) * 100);
        return {
          name,
          icon: meta.icon,
          color: meta.color,
          bg: meta.bg,
          amount: data.total,
          recurringCount: data.recurringCount,
          percentage
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [selectedMonthExpenses, debts]);

  // Real upcoming bills from real expenses
  const realUpcomingBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expenses
      .filter(e => {
        if (!e.due_date) return false;
        const d = new Date(e.due_date);
        return d >= today || e.status === 'pending';
      })
      .sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return dateA - dateB;
      })
      .slice(0, 4)
      .map(exp => {
        let dueText = 'Sem data';
        if (exp.due_date) {
          const dueDate = new Date(exp.due_date);
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            dueText = `Venceu há ${Math.abs(diffDays)} dias`;
          } else if (diffDays === 0) {
            dueText = 'Vence hoje';
          } else if (diffDays === 1) {
            dueText = 'Vence amanhã';
          } else {
            dueText = `Vence em ${diffDays} dias`;
          }
        }
        return {
          id: exp.id,
          name: exp.description || exp.category || 'Despesa',
          amount: Number(exp.amount || 0),
          dueText,
          icon: exp.category === 'Moradia' ? Home : (exp.category === 'Alimentação' ? Utensils : (exp.category === 'Transporte' ? Car : CreditCard)),
          iconBg: 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
        };
      });
  }, [expenses, now]);

  // Investment accounts
  const investmentAccounts = useMemo(() => {
    return accounts.filter(acc => acc.type === 'investment' || acc.name?.toLowerCase().includes('invest'));
  }, [accounts]);

  const realInvestmentBalance = useMemo(() => {
    return investmentAccounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);
  }, [investmentAccounts]);

  const investmentBars = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const bars = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1);
      const mLabel = monthNames[d.getMonth()];
      const height = realInvestmentBalance > 0 ? Math.min(100, 40 + (5 - i) * 12) : 0;
      bars.push({ month: mLabel, height });
    }
    return bars;
  }, [selectedMonth, selectedYear, realInvestmentBalance]);

  return (
    <div className="space-y-6 w-full font-sans antialiased text-slate-100">
      {/* ========================================================= */}
      {/* 0. MONTH-BY-MONTH CALENDAR NAVIGATOR BANNER */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0e142e] via-[#121a3d] to-[#0e142e] border border-[#1b244d] p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Navegação Mensal</span>
              {!isCurrentMonthSelected && (
                <button
                  onClick={handleResetToCurrentMonth}
                  className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-full transition cursor-pointer"
                >
                  Ir para Mês Atual
                </button>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {MONTH_NAMES[selectedMonth]} de {selectedYear}
            </h2>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 rounded-2xl bg-[#161f42] hover:bg-[#202c5c] text-white border border-white/10 transition cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold"
            title="Mês anterior"
          >
            <span>&larr;</span>
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Direct Select Dropdown */}
          <div className="flex items-center gap-1 bg-[#161f42] border border-white/10 rounded-2xl px-2 py-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-1"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx} className="bg-[#0e142e] text-white">{m}</option>
              ))}
            </select>
            <span className="text-slate-500 text-xs">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-1"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y} className="bg-[#0e142e] text-white">{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2.5 rounded-2xl bg-[#161f42] hover:bg-[#202c5c] text-white border border-white/10 transition cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold"
            title="Próximo mês"
          >
            <span className="hidden sm:inline">Próximo</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. TOP 4 KPI CARDS (Pristine Match) */}
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
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>{accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}</span>
          </div>
        </div>

        {/* Card 2: Receitas (Mês) */}
        <div className="rounded-3xl bg-[#0e142e] border border-[#1b244d] p-5 space-y-3 shadow-xl hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">Receitas ({MONTH_NAMES[selectedMonth]})</span>
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
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{selectedMonthIncomes.length} {selectedMonthIncomes.length === 1 ? 'receita este mês' : 'receitas este mês'}</span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Despesas (Mês) */}
        <div className="rounded-3xl bg-[#0e142e] border border-[#1b244d] p-5 space-y-3 shadow-xl hover:border-rose-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">Despesas ({MONTH_NAMES[selectedMonth]})</span>
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
                <span>{selectedMonthExpenses.length} {selectedMonthExpenses.length === 1 ? 'despesa este mês' : 'despesas este mês'}</span>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Economia (Mês) */}
        <div className="rounded-3xl bg-[#0e142e] border border-[#1b244d] p-5 space-y-3 shadow-xl hover:border-purple-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">Economia ({MONTH_NAMES[selectedMonth]})</span>
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
      {/* 2. MIDDLE ANALYTICAL GRID */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Gastos por Categoria (Donut Chart - 7 Cols on xl) */}
        <div className="lg:col-span-12 xl:col-span-7 rounded-3xl bg-[#0e142e] border border-[#1b244d] p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b244d] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Distribuição de Gastos por Categoria</h3>
                <p className="text-xs text-slate-400">Análise detalhada do mês de <strong className="text-indigo-300">{MONTH_NAMES[selectedMonth]} {selectedYear}</strong></p>
              </div>
            </div>

            {/* Quick Month Switcher for Category Card */}
            <div className="flex items-center gap-1.5 bg-[#161f42] border border-white/10 rounded-2xl px-2 py-1 shrink-0">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white cursor-pointer"
                title="Mês anterior"
              >
                &larr;
              </button>
              <span className="text-xs font-bold text-white font-mono px-1">
                {MONTH_NAMES[selectedMonth].substring(0, 3)}/{selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white cursor-pointer"
                title="Próximo mês"
              >
                &rarr;
              </button>
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
      {/* 3. LOWER DETAILED WIDGETS */}
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
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
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
    </div>
  );
}
