'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Printer, 
  Sparkles, 
  PieChart,
  BarChart2,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Layers,
  Percent,
  Wallet,
  Coins
} from 'lucide-react';
import { Income, Expense, Account, Debt, Goal, Loan, FamilyMember } from '@/types/database';
import { extractMonthAndYear, safeNumber } from '@/lib/dateUtils';

export interface MonthlyFinancialSummary {
  monthKey: string; // YYYY-MM
  label: string; // "jan. 2024"
  monthName: string; // "Janeiro"
  year: number;
  income: number;
  expense: number;
  savings: number; // income - expense
  savingsRate: number; // percentage (savings / income * 100)
  incomesList: Income[];
  expensesList: Expense[];
  topIncomeSources: { source: string; amount: number }[];
  topExpenseCategories: { category: string; amount: number }[];
}

export interface InfographicDataPoint {
  date: string;
  label: string;
  value: number;
  secondaryValue?: number;
  highlight?: boolean;
  highlightLabel?: string;
  note?: string;
  phaseId?: string;
}

export interface TimelinePhase {
  id: string;
  title: string;
  period: string;
  avatarText: string;
  avatarBg: string;
  summary: string;
  color: string;
}

interface FinancialTrajectoryInfographicProps {
  incomes: Income[];
  expenses: Expense[];
  accounts: Account[];
  debts: Debt[];
  goals: Goal[];
  loans: Loan[];
  members: FamilyMember[];
  familyName?: string;
}

// Historical Dollar Ptax Dataset (Plano Real 1994 - 2024) reference
const HISTORICAL_DOLLAR_DATA: InfographicDataPoint[] = [
  { date: '1994-06-01', label: 'jun. 1994', value: 1.00, highlight: true, highlightLabel: '1,00', note: 'Início do Plano Real', phaseId: 'fhc' },
  { date: '1995-01-01', label: '1995', value: 0.84, phaseId: 'fhc' },
  { date: '1996-01-01', label: '1996', value: 0.97, phaseId: 'fhc' },
  { date: '1997-01-01', label: '1997', value: 1.04, phaseId: 'fhc' },
  { date: '1998-01-01', label: '1998', value: 1.12, phaseId: 'fhc' },
  { date: '1999-01-01', label: '1999', value: 1.98, note: 'Desvalorização cambial', phaseId: 'fhc' },
  { date: '2000-01-01', label: '2000', value: 1.83, phaseId: 'fhc' },
  { date: '2001-01-01', label: '2001', value: 2.35, phaseId: 'fhc' },
  { date: '2002-09-01', label: 'set. 2002', value: 3.90, highlight: true, highlightLabel: '3,90', note: 'Pico de incerteza eleitoral', phaseId: 'fhc' },
  { date: '2003-01-01', label: '2003', value: 2.90, phaseId: 'lula1' },
  { date: '2004-01-01', label: '2004', value: 2.65, phaseId: 'lula1' },
  { date: '2005-01-01', label: '2005', value: 2.34, phaseId: 'lula1' },
  { date: '2006-01-01', label: '2006', value: 2.14, phaseId: 'lula1' },
  { date: '2007-01-01', label: '2007', value: 1.77, phaseId: 'lula1' },
  { date: '2008-01-01', label: '2008', value: 2.33, note: 'Crise do Subprime', phaseId: 'lula1' },
  { date: '2009-01-01', label: '2009', value: 1.74, phaseId: 'lula1' },
  { date: '2010-01-01', label: '2010', value: 1.66, phaseId: 'lula1' },
  { date: '2011-07-01', label: 'jul. 2011', value: 1.56, highlight: true, highlightLabel: '1,56', note: 'Mínima histórica recente', phaseId: 'dilma_temer' },
  { date: '2012-01-01', label: '2012', value: 2.04, phaseId: 'dilma_temer' },
  { date: '2013-01-01', label: '2013', value: 2.34, phaseId: 'dilma_temer' },
  { date: '2014-01-01', label: '2014', value: 2.66, phaseId: 'dilma_temer' },
  { date: '2015-01-01', label: '2015', value: 3.90, phaseId: 'dilma_temer' },
  { date: '2016-01-01', label: '2016', value: 3.26, phaseId: 'dilma_temer' },
  { date: '2017-01-01', label: '2017', value: 3.31, phaseId: 'dilma_temer' },
  { date: '2018-01-01', label: '2018', value: 3.87, phaseId: 'dilma_temer' },
  { date: '2019-01-01', label: '2019', value: 4.03, phaseId: 'bolsonaro' },
  { date: '2020-03-01', label: 'mar. 2020', value: 5.15, note: 'Início da pandemia', phaseId: 'bolsonaro' },
  { date: '2020-10-01', label: 'out. 2020', value: 5.70, highlight: true, highlightLabel: '5,70', note: 'Pico da Pandemia', phaseId: 'bolsonaro' },
  { date: '2021-01-01', label: '2021', value: 5.57, phaseId: 'bolsonaro' },
  { date: '2022-01-01', label: '2022', value: 5.28, phaseId: 'bolsonaro' },
  { date: '2023-01-01', label: '2023', value: 4.85, phaseId: 'lula3' },
  { date: '2024-04-15', label: '15.abr. 2024', value: 5.18, highlight: true, highlightLabel: '5,18', note: 'Cotação de Fechamento', phaseId: 'lula3' },
];

const HISTORICAL_DOLLAR_PHASES: TimelinePhase[] = [
  { id: 'fhc', title: 'FHC', period: '1994 - 2002', avatarText: 'FHC', avatarBg: 'from-amber-600 to-amber-800', summary: 'Criação do Real, âncora cambial e flutuação em 1999', color: '#d97706' },
  { id: 'lula1', title: 'Lula I & II', period: '2003 - 2010', avatarText: 'LULA', avatarBg: 'from-rose-600 to-rose-800', summary: 'Super ciclo de commodities, acúmulo de reservas e valorização do Real', color: '#e11d48' },
  { id: 'dilma_temer', title: 'Dilma / Temer', period: '2011 - 2018', avatarText: 'D / T', avatarBg: 'from-emerald-700 to-cyan-900', summary: 'Mínima de R$ 1,56 (2011), recessão de 2015 e reformas de transição', color: '#059669' },
  { id: 'bolsonaro', title: 'Bolsonaro', period: '2019 - 2022', avatarText: 'JB', avatarBg: 'from-blue-600 to-blue-900', summary: 'Choque da pandemia (2020), corte de juros e pico de R$ 5,70', color: '#2563eb' },
  { id: 'lula3', title: 'Lula III', period: '2023 - 2024', avatarText: 'L3', avatarBg: 'from-indigo-600 to-indigo-900', summary: 'Estabilização do câmbio na faixa de R$ 4,80 - R$ 5,20', color: '#4f46e5' },
];

// Month names in Portuguese
const MONTH_NAMES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_NAMES_SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

export function FinancialTrajectoryInfographic({
  incomes,
  expenses,
  accounts,
  debts,
  goals,
  loans,
  members,
  familyName = 'Familiar'
}: FinancialTrajectoryInfographicProps) {
  const [activeTab, setActiveTab] = useState<'salary_vs_expenses' | 'family_trajectory' | 'dollar_benchmark' | 'dre_statement'>('salary_vs_expenses');
  const [themeMode, setThemeMode] = useState<'infographic_light' | 'glass_dark'>('infographic_light');
  const [chartVisualMode, setChartVisualMode] = useState<'dual_line' | 'comparison_bars' | 'net_savings'>('dual_line');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Process and aggregate all real month-by-month Salary/Income vs Expense data
  const monthlyData: MonthlyFinancialSummary[] = useMemo(() => {
    const map: Record<string, {
      monthKey: string;
      label: string;
      monthName: string;
      year: number;
      income: number;
      expense: number;
      incomesList: Income[];
      expensesList: Expense[];
      incomeSourceMap: Record<string, number>;
      expenseCategoryMap: Record<string, number>;
    }> = {};

    // Group Incomes (Salários, rendas, pró-labore, etc.)
    incomes.forEach((inc) => {
      const parsed = extractMonthAndYear(inc.received_at || (inc as any).date || inc.created_at);
      const year = parsed ? parsed.year : new Date().getFullYear();
      const monthIdx = parsed ? parsed.month : new Date().getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
      const monthName = MONTH_NAMES_FULL[monthIdx];

      if (!map[key]) {
        map[key] = {
          monthKey: key,
          label,
          monthName,
          year,
          income: 0,
          expense: 0,
          incomesList: [],
          expensesList: [],
          incomeSourceMap: {},
          expenseCategoryMap: {}
        };
      }

      const amt = safeNumber(inc.amount);
      map[key].income += amt;
      map[key].incomesList.push(inc);
      const src = inc.description || inc.category || 'Salário / Renda Principal';
      map[key].incomeSourceMap[src] = (map[key].incomeSourceMap[src] || 0) + amt;
    });

    // Group Expenses (Despesas, contas fixas, cartões, etc.)
    expenses.forEach((exp) => {
      const parsed = extractMonthAndYear(exp.due_date || (exp as any).date || (exp as any).payment_date || exp.created_at);
      const year = parsed ? parsed.year : new Date().getFullYear();
      const monthIdx = parsed ? parsed.month : new Date().getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
      const monthName = MONTH_NAMES_FULL[monthIdx];

      if (!map[key]) {
        map[key] = {
          monthKey: key,
          label,
          monthName,
          year,
          income: 0,
          expense: 0,
          incomesList: [],
          expensesList: [],
          incomeSourceMap: {},
          expenseCategoryMap: {}
        };
      }

      const amt = safeNumber(exp.amount);
      map[key].expense += amt;
      map[key].expensesList.push(exp);
      const cat = exp.category || 'Outros';
      map[key].expenseCategoryMap[cat] = (map[key].expenseCategoryMap[cat] || 0) + amt;
    });

    const sortedKeys = Object.keys(map).sort();

    // If no real transactions exist yet, provide a robust, structured 6-month demo dataset based on user accounts
    if (sortedKeys.length === 0) {
      const baseSalary = 7500;
      const currentYear = new Date().getFullYear();
      const monthsDemo = [
        { key: `${currentYear}-01`, name: 'Janeiro', label: `jan. ${currentYear}`, inc: baseSalary, exp: 4850 },
        { key: `${currentYear}-02`, name: 'Fevereiro', label: `fev. ${currentYear}`, inc: baseSalary + 600, exp: 5200 },
        { key: `${currentYear}-03`, name: 'Março', label: `mar. ${currentYear}`, inc: baseSalary, exp: 6100 },
        { key: `${currentYear}-04`, name: 'Abril', label: `abr. ${currentYear}`, inc: baseSalary + 1800, exp: 4600 },
        { key: `${currentYear}-05`, name: 'Maio', label: `mai. ${currentYear}`, inc: baseSalary, exp: 4950 },
        { key: `${currentYear}-06`, name: 'Junho', label: `jun. ${currentYear}`, inc: baseSalary + 800, exp: 4400 },
      ];

      return monthsDemo.map(m => {
        const savings = m.inc - m.exp;
        const savingsRate = m.inc > 0 ? (savings / m.inc) * 100 : 0;
        return {
          monthKey: m.key,
          label: m.label,
          monthName: m.name,
          year: currentYear,
          income: m.inc,
          expense: m.exp,
          savings,
          savingsRate,
          incomesList: [],
          expensesList: [],
          topIncomeSources: [{ source: 'Salário Fixo Mensal', amount: m.inc }],
          topExpenseCategories: [
            { category: 'Moradia / Aluguel', amount: m.exp * 0.4 },
            { category: 'Alimentação / Mercado', amount: m.exp * 0.3 },
            { category: 'Transporte / Contas', amount: m.exp * 0.3 }
          ]
        };
      });
    }

    return sortedKeys.map(key => {
      const item = map[key];
      const savings = item.income - item.expense;
      const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;

      const topIncomeSources = Object.entries(item.incomeSourceMap)
        .map(([source, amount]) => ({ source, amount }))
        .sort((a, b) => b.amount - a.amount);

      const topExpenseCategories = Object.entries(item.expenseCategoryMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      return {
        monthKey: item.monthKey,
        label: item.label,
        monthName: item.monthName,
        year: item.year,
        income: item.income,
        expense: item.expense,
        savings,
        savingsRate,
        incomesList: item.incomesList,
        expensesList: item.expensesList,
        topIncomeSources,
        topExpenseCategories
      };
    });
  }, [incomes, expenses]);

  // Find the selected month details (or default to latest month)
  const activeMonthSummary = useMemo(() => {
    if (selectedMonthKey) {
      const found = monthlyData.find(m => m.monthKey === selectedMonthKey);
      if (found) return found;
    }
    return monthlyData[monthlyData.length - 1] || null;
  }, [monthlyData, selectedMonthKey]);

  // Overall aggregate stats across all months
  const globalSummary = useMemo(() => {
    const totalInc = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExp = monthlyData.reduce((s, m) => s + m.expense, 0);
    const totalSav = totalInc - totalExp;
    const avgMonthlyIncome = monthlyData.length ? totalInc / monthlyData.length : 0;
    const avgMonthlyExpense = monthlyData.length ? totalExp / monthlyData.length : 0;
    const avgSavingsRate = totalInc > 0 ? (totalSav / totalInc) * 100 : 0;

    let peakIncomeMonth = monthlyData[0];
    let peakExpenseMonth = monthlyData[0];
    let bestSavingsMonth = monthlyData[0];

    monthlyData.forEach(m => {
      if (m.income > (peakIncomeMonth?.income || 0)) peakIncomeMonth = m;
      if (m.expense > (peakExpenseMonth?.expense || 0)) peakExpenseMonth = m;
      if (m.savings > (bestSavingsMonth?.savings || -Infinity)) bestSavingsMonth = m;
    });

    return {
      totalInc,
      totalExp,
      totalSav,
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgSavingsRate,
      peakIncomeMonth,
      peakExpenseMonth,
      bestSavingsMonth,
      monthsCount: monthlyData.length
    };
  }, [monthlyData]);

  // SVG Coordinates calculation for the Dual Salary vs Expense curves & bar columns
  const svgCalculations = useMemo(() => {
    if (monthlyData.length === 0) {
      return { 
        svgWidth: 1000, 
        svgHeight: 440, 
        coordsIncome: [], 
        coordsExpense: [], 
        coordsSavings: [], 
        pathIncome: '', 
        pathExpense: '', 
        pathSavings: '', 
        areaIncome: '', 
        areaExpense: '', 
        maxVal: 1000,
        baselineY: 365,
        plotWidth: 840,
        paddingX: 80
      };
    }

    const svgWidth = 1000;
    const svgHeight = 440;
    const paddingX = 80;
    const paddingTop = 90;
    const paddingBottom = 75;

    const allValues = monthlyData.flatMap(m => [m.income, m.expense, Math.abs(m.savings)]);
    const rawMax = Math.max(...allValues, 1000);
    const maxVal = rawMax * 1.22; // give space for top callouts
    const minVal = 0;

    const plotWidth = svgWidth - paddingX * 2;
    const plotHeight = svgHeight - paddingTop - paddingBottom;
    const count = monthlyData.length;

    const coordsIncome = monthlyData.map((d, index) => {
      const x = paddingX + (index / (count - 1 || 1)) * plotWidth;
      const normalizedY = (d.income - minVal) / (maxVal - minVal);
      const y = svgHeight - paddingBottom - normalizedY * plotHeight;
      return { x, y, data: d };
    });

    const coordsExpense = monthlyData.map((d, index) => {
      const x = paddingX + (index / (count - 1 || 1)) * plotWidth;
      const normalizedY = (d.expense - minVal) / (maxVal - minVal);
      const y = svgHeight - paddingBottom - normalizedY * plotHeight;
      return { x, y, data: d };
    });

    const coordsSavings = monthlyData.map((d, index) => {
      const x = paddingX + (index / (count - 1 || 1)) * plotWidth;
      const normalizedY = (Math.max(0, d.savings) - minVal) / (maxVal - minVal);
      const y = svgHeight - paddingBottom - normalizedY * plotHeight;
      return { x, y, data: d };
    });

    // Helper for smooth curve
    const buildCurve = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    };

    const pathIncome = buildCurve(coordsIncome);
    const pathExpense = buildCurve(coordsExpense);
    const pathSavings = buildCurve(coordsSavings);

    const baselineY = svgHeight - paddingBottom;
    const areaIncome = pathIncome ? `${pathIncome} L ${coordsIncome[count - 1].x} ${baselineY} L ${coordsIncome[0].x} ${baselineY} Z` : '';
    const areaExpense = pathExpense ? `${pathExpense} L ${coordsExpense[count - 1].x} ${baselineY} L ${coordsExpense[0].x} ${baselineY} Z` : '';

    return {
      svgWidth,
      svgHeight,
      coordsIncome,
      coordsExpense,
      coordsSavings,
      pathIncome,
      pathExpense,
      pathSavings,
      areaIncome,
      areaExpense,
      maxVal,
      baselineY,
      plotWidth,
      paddingX
    };
  }, [monthlyData]);

  // Trajectory Dataset for Cumulative Tab
  const cumulativeData = useMemo(() => {
    const initialBase = accounts.reduce((s, a) => s + Number(a.balance || 0), 0) || 5000;
    const result: InfographicDataPoint[] = [];
    let acc = initialBase;

    for (let idx = 0; idx < monthlyData.length; idx++) {
      const m = monthlyData[idx];
      acc += m.savings;
      const isFirst = idx === 0;
      const isLast = idx === monthlyData.length - 1;
      result.push({
        date: m.monthKey,
        label: m.label,
        value: acc,
        highlight: isFirst || isLast,
        highlightLabel: `R$ ${acc.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
        note: isFirst ? 'Ponto Inicial' : isLast ? 'Saldo Atual' : undefined
      });
    }

    return result;
  }, [monthlyData, accounts]);

  const handlePrint = () => {
    window.print();
  };

  const isLight = themeMode === 'infographic_light';

  return (
    <div className="space-y-6">
      {/* 1. Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-4 rounded-2xl">
        {/* Tab View Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
          <button
            id="tab-btn-salary-vs-expenses"
            onClick={() => setActiveTab('salary_vs_expenses')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'salary_vs_expenses'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            Salário vs Despesas (Mensal)
          </button>

          <button
            id="tab-btn-family"
            onClick={() => setActiveTab('family_trajectory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'family_trajectory'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Patrimônio Acumulado
          </button>

          <button
            id="tab-btn-dre"
            onClick={() => setActiveTab('dre_statement')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'dre_statement'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Demonstração DRE & Balanço
          </button>

          <button
            id="tab-btn-dollar"
            onClick={() => setActiveTab('dollar_benchmark')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'dollar_benchmark'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Benchmark Dólar (1994 - 2024)
          </button>
        </div>

        {/* Theme & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              id="theme-light-btn"
              onClick={() => setThemeMode('infographic_light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isLight ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Estilo Editorial / Jornalístico Alto Contraste (Igual Poder360)"
            >
              📰 Estilo Infográfico
            </button>
            <button
              id="theme-dark-btn"
              onClick={() => setThemeMode('glass_dark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isLight ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Estilo Escuro Finanzza"
            >
              🌙 Modo Escuro
            </button>
          </div>

          <button
            id="btn-print-report"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Primary View: Monthly Salary vs Expense Infographic */}
      {activeTab === 'salary_vs_expenses' && (
        <div className="space-y-6">
          {/* Top Quick Answers: Quanto Recebi vs Quanto Gastei vs Quanto Sobrou */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quanto Recebi */}
            <div className={`rounded-3xl p-5 border shadow-xl transition-all ${
              isLight 
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 text-slate-900' 
                : 'bg-emerald-950/30 border-emerald-500/30 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Quanto Recebi
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                R$ {(activeMonthSummary?.income || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Salários e entradas em <strong>{activeMonthSummary?.label || 'Mês selecionado'}</strong>
              </div>
            </div>

            {/* Quanto Gastei */}
            <div className={`rounded-3xl p-5 border shadow-xl transition-all ${
              isLight 
                ? 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 text-slate-900' 
                : 'bg-rose-950/30 border-rose-500/30 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Quanto Gastei
                </span>
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                R$ {(activeMonthSummary?.expense || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Despesas e contas pagas no mês
              </div>
            </div>

            {/* Quanto Sobrou */}
            <div className={`rounded-3xl p-5 border shadow-xl transition-all ${
              isLight 
                ? 'bg-gradient-to-br from-cyan-50 to-blue-100/50 border-cyan-200 text-slate-900' 
                : 'bg-cyan-950/30 border-cyan-500/30 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  Quanto Sobrou
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className={`mt-2 text-2xl sm:text-3xl font-black font-mono ${
                (activeMonthSummary?.savings || 0) >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                R$ {(activeMonthSummary?.savings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                {(activeMonthSummary?.savings || 0) >= 0 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                    <span>Sobrou <strong>{activeMonthSummary?.savingsRate.toFixed(1)}%</strong> do salário</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />
                    <span>Déficit de R$ {Math.abs(activeMonthSummary?.savings || 0).toLocaleString('pt-BR')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Média Histórica / Taxa de Poupança */}
            <div className={`rounded-3xl p-5 border shadow-xl transition-all ${
              isLight 
                ? 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 text-slate-900' 
                : 'bg-indigo-950/30 border-indigo-500/30 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Taxa Média de Sobra
                </span>
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {globalSummary.avgSavingsRate.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Média de economia em {globalSummary.monthsCount} mês(es)
              </div>
            </div>
          </div>

          {/* Infographic Main Editorial Canvas (Poder360 Visual Style) */}
          <div 
            ref={containerRef}
            id="infographic-salary-expenses-card"
            className={`relative rounded-[32px] overflow-hidden transition-all duration-300 shadow-2xl border ${
              isLight 
                ? 'bg-[#f4f7fb] text-[#0f172a] border-slate-300/80 shadow-slate-900/10' 
                : 'bg-slate-950/80 text-white border-white/10 backdrop-blur-3xl'
            }`}
          >
            {/* Top Accent Strip */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-rose-500" />

            <div className="p-6 sm:p-10 lg:p-12 space-y-8">
              {/* Header Title (Poder360 Infographic Architecture) */}
              <div className="text-center space-y-2 max-w-3xl mx-auto">
                <h2 className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase ${
                  isLight ? 'text-[#0c305c]' : 'text-emerald-400'
                }`}>
                  SALÁRIO & RECEITAS VS. DESPESAS MENSAIS
                </h2>

                <p className={`text-sm sm:text-base font-bold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  demonstração visual de quanto você recebeu e quanto você gastou a cada mês (R$)
                </p>

                <p className={`text-xs sm:text-sm ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  comparações exatas de salários, custos fixos, gastos no cartão e economia líquida da família {familyName}
                </p>
              </div>

              {/* Chart Mode Selector Buttons & Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3 border-slate-200 dark:border-white/10">
                {/* Visual Chart Mode */}
                <div className="flex items-center gap-1.5 p-1 bg-black/10 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold">
                  <button
                    onClick={() => setChartVisualMode('dual_line')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartVisualMode === 'dual_line'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Curvas de Evolução
                  </button>

                  <button
                    onClick={() => setChartVisualMode('comparison_bars')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartVisualMode === 'comparison_bars'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Barras Lado a Lado
                  </button>

                  <button
                    onClick={() => setChartVisualMode('net_savings')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartVisualMode === 'net_savings'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Sobra Líquida
                  </button>
                </div>

                {/* Legend Badges */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-extrabold">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                    <span className={isLight ? 'text-emerald-800' : 'text-emerald-400'}>
                      Salário / Recebido
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                    <span className={isLight ? 'text-rose-800' : 'text-rose-400'}>
                      Despesas / Gasto
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm" />
                    <span className={isLight ? 'text-cyan-800' : 'text-cyan-400'}>
                      Economia / Sobra
                    </span>
                  </div>
                </div>
              </div>

              {/* Graphic Vector Canvas (Dual Curve / Bar Chart) */}
              <div className={`relative w-full rounded-3xl p-3 sm:p-6 border overflow-hidden ${
                isLight 
                  ? 'bg-white border-slate-200/80 shadow-inner' 
                  : 'bg-slate-900/70 border-white/5'
              }`}>
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox="0 0 1000 440"
                    className="w-full h-auto min-w-[750px] select-none"
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      {/* Income Gradient */}
                      <linearGradient id="gradIncomeLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Expense Gradient */}
                      <linearGradient id="gradExpenseLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Savings Gradient */}
                      <linearGradient id="gradSavingsLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Filter for shadows */}
                      <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
                      </filter>
                    </defs>

                    {/* Horizontal Baseline / Grid Lines */}
                    <line 
                      x1="60" 
                      y1={svgCalculations.baselineY} 
                      x2="940" 
                      y2={svgCalculations.baselineY} 
                      stroke={isLight ? '#cbd5e1' : '#334155'} 
                      strokeWidth="1.5" 
                    />

                    {/* Intermediate Grid lines */}
                    {[0.25, 0.5, 0.75].map((pct, i) => {
                      const yGrid = svgCalculations.baselineY - pct * (svgCalculations.baselineY - 90);
                      return (
                        <line
                          key={i}
                          x1="60"
                          y1={yGrid}
                          x2="940"
                          y2={yGrid}
                          stroke={isLight ? '#f1f5f9' : '#1e293b'}
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* 1. Comparison Bars Mode */}
                    {chartVisualMode === 'comparison_bars' && (
                      <g>
                        {monthlyData.map((d, index) => {
                          const xCenter = svgCalculations.paddingX + (index / (monthlyData.length - 1 || 1)) * (svgCalculations.plotWidth || 840);
                          const barWidth = Math.min(28, 400 / (monthlyData.length || 1));
                          const incHeight = ((d.income) / (svgCalculations.maxVal || 1)) * (svgCalculations.baselineY - 90);
                          const expHeight = ((d.expense) / (svgCalculations.maxVal || 1)) * (svgCalculations.baselineY - 90);

                          const isHovered = hoveredIndex === index;
                          const isSelected = selectedMonthKey === d.monthKey;

                          return (
                            <g 
                              key={index} 
                              className="cursor-pointer"
                              onClick={() => setSelectedMonthKey(d.monthKey)}
                              onMouseEnter={() => setHoveredIndex(index)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              {/* Background hover highlight column */}
                              {(isHovered || isSelected) && (
                                <rect
                                  x={xCenter - barWidth * 1.6}
                                  y={60}
                                  width={barWidth * 3.2}
                                  height={svgCalculations.baselineY - 60}
                                  fill={isLight ? 'rgba(12, 48, 92, 0.05)' : 'rgba(255, 255, 255, 0.05)'}
                                  rx="8"
                                />
                              )}

                              {/* Income Bar (Green) */}
                              <rect
                                x={xCenter - barWidth - 2}
                                y={svgCalculations.baselineY - incHeight}
                                width={barWidth}
                                height={incHeight}
                                fill="#10b981"
                                rx="4"
                                filter="url(#badgeShadow)"
                              />

                              {/* Expense Bar (Rose) */}
                              <rect
                                x={xCenter + 2}
                                y={svgCalculations.baselineY - expHeight}
                                width={barWidth}
                                height={expHeight}
                                fill="#f43f5e"
                                rx="4"
                                filter="url(#badgeShadow)"
                              />

                              {/* Value Tag on top of Bars */}
                              <text
                                x={xCenter - barWidth / 2 - 2}
                                y={svgCalculations.baselineY - incHeight - 8}
                                textAnchor="middle"
                                fill={isLight ? '#047857' : '#34d399'}
                                fontSize="11"
                                fontWeight="800"
                              >
                                R$ {d.income.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                              </text>

                              <text
                                x={xCenter + barWidth / 2 + 2}
                                y={svgCalculations.baselineY - expHeight - 8}
                                textAnchor="middle"
                                fill={isLight ? '#be123c' : '#fb7185'}
                                fontSize="11"
                                fontWeight="800"
                              >
                                R$ {d.expense.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                              </text>

                              {/* Date label at baseline */}
                              <text
                                x={xCenter}
                                y={svgCalculations.baselineY + 24}
                                textAnchor="middle"
                                fill={isLight ? '#0c305c' : '#ffffff'}
                                fontSize="13"
                                fontWeight="800"
                              >
                                {d.label.split(' ')[0]}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* 2. Dual Curves Mode (Poder360-Style) */}
                    {chartVisualMode === 'dual_line' && (
                      <g>
                        {/* Area fills */}
                        {svgCalculations.areaIncome && (
                          <path d={svgCalculations.areaIncome} fill="url(#gradIncomeLight)" />
                        )}
                        {svgCalculations.areaExpense && (
                          <path d={svgCalculations.areaExpense} fill="url(#gradExpenseLight)" />
                        )}

                        {/* Income Line (Green) */}
                        {svgCalculations.pathIncome && (
                          <path
                            d={svgCalculations.pathIncome}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Expense Line (Rose) */}
                        {svgCalculations.pathExpense && (
                          <path
                            d={svgCalculations.pathExpense}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Interactive Data Points & Value Callouts */}
                        {svgCalculations.coordsIncome.map((ptInc, idx) => {
                          const ptExp = svgCalculations.coordsExpense[idx];
                          const isHovered = hoveredIndex === idx;
                          const isSelected = selectedMonthKey === ptInc.data.monthKey;
                          const isPeakInc = ptInc.data.income === globalSummary.peakIncomeMonth?.income;
                          const isPeakExp = ptExp.data.expense === globalSummary.peakExpenseMonth?.expense;

                          return (
                            <g 
                              key={idx} 
                              className="cursor-pointer"
                              onClick={() => setSelectedMonthKey(ptInc.data.monthKey)}
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              {/* Vertical dotted guide line */}
                              <line
                                x1={ptInc.x}
                                y1={Math.min(ptInc.y, ptExp.y) - 25}
                                x2={ptInc.x}
                                y2={svgCalculations.baselineY}
                                stroke={isLight ? '#94a3b8' : '#64748b'}
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                              />

                              {/* Income Dot */}
                              <circle
                                cx={ptInc.x}
                                cy={ptInc.y}
                                r={isHovered || isSelected ? 8 : 6}
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth="2"
                                filter="url(#badgeShadow)"
                              />

                              {/* Expense Dot */}
                              <circle
                                cx={ptExp.x}
                                cy={ptExp.y}
                                r={isHovered || isSelected ? 8 : 6}
                                fill="#f43f5e"
                                stroke="#ffffff"
                                strokeWidth="2"
                                filter="url(#badgeShadow)"
                              />

                              {/* Income Value Callout (Green) */}
                              <g transform={`translate(${ptInc.x}, ${ptInc.y - 12})`}>
                                <text
                                  textAnchor="middle"
                                  fill={isLight ? '#065f46' : '#34d399'}
                                  fontSize={isPeakInc ? "16" : "13"}
                                  fontWeight="900"
                                >
                                  R$ {ptInc.data.income.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </text>
                                {isPeakInc && (
                                  <text
                                    textAnchor="middle"
                                    y="-16"
                                    fill={isLight ? '#047857' : '#6ee7b7'}
                                    fontSize="10"
                                    fontWeight="800"
                                  >
                                    ★ MAIOR SALÁRIO
                                  </text>
                                )}
                              </g>

                              {/* Expense Value Callout (Rose) */}
                              <g transform={`translate(${ptExp.x}, ${ptExp.y + 20})`}>
                                <text
                                  textAnchor="middle"
                                  fill={isLight ? '#9f1239' : '#fda4af'}
                                  fontSize={isPeakExp ? "16" : "13"}
                                  fontWeight="900"
                                >
                                  R$ {ptExp.data.expense.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </text>
                                {isPeakExp && (
                                  <text
                                    textAnchor="middle"
                                    y="16"
                                    fill={isLight ? '#be123c' : '#f43f5e'}
                                    fontSize="10"
                                    fontWeight="800"
                                  >
                                    ▲ MAIOR GASTO
                                  </text>
                                )}
                              </g>

                              {/* X-Axis Date at Bottom */}
                              <g transform={`translate(${ptInc.x}, ${svgCalculations.baselineY + 24})`}>
                                <text
                                  textAnchor="middle"
                                  fill={isLight ? '#0c305c' : '#ffffff'}
                                  fontSize="14"
                                  fontWeight="800"
                                >
                                  {ptInc.data.label.split(' ')[0]}
                                </text>
                                <text
                                  textAnchor="middle"
                                  y="16"
                                  fill={isLight ? '#64748b' : '#94a3b8'}
                                  fontSize="11"
                                  fontWeight="700"
                                >
                                  {ptInc.data.label.split(' ')[1]}
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* 3. Net Savings Curve Mode */}
                    {chartVisualMode === 'net_savings' && (
                      <g>
                        {/* Area fill */}
                        {svgCalculations.pathSavings && (
                          <path
                            d={`${svgCalculations.pathSavings} L ${svgCalculations.coordsSavings[svgCalculations.coordsSavings.length - 1].x} ${svgCalculations.baselineY} L ${svgCalculations.coordsSavings[0].x} ${svgCalculations.baselineY} Z`}
                            fill="url(#gradSavingsLight)"
                          />
                        )}

                        {/* Curve */}
                        {svgCalculations.pathSavings && (
                          <path
                            d={svgCalculations.pathSavings}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Dots & Callouts */}
                        {svgCalculations.coordsSavings.map((pt, idx) => {
                          const isHovered = hoveredIndex === idx;
                          const isSelected = selectedMonthKey === pt.data.monthKey;

                          return (
                            <g 
                              key={idx} 
                              className="cursor-pointer"
                              onClick={() => setSelectedMonthKey(pt.data.monthKey)}
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              <line
                                x1={pt.x}
                                y1={pt.y}
                                x2={pt.x}
                                y2={svgCalculations.baselineY}
                                stroke={isLight ? '#94a3b8' : '#64748b'}
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                              />

                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isHovered || isSelected ? 8 : 6}
                                fill="#06b6d4"
                                stroke="#ffffff"
                                strokeWidth="2"
                                filter="url(#badgeShadow)"
                              />

                              {/* Value Label */}
                              <g transform={`translate(${pt.x}, ${pt.y - 12})`}>
                                <text
                                  textAnchor="middle"
                                  fill={isLight ? '#0e7490' : '#22d3ee'}
                                  fontSize="15"
                                  fontWeight="900"
                                >
                                  +R$ {pt.data.savings.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </text>
                                <text
                                  textAnchor="middle"
                                  y="-16"
                                  fill={isLight ? '#0284c7' : '#38bdf8'}
                                  fontSize="10"
                                  fontWeight="800"
                                >
                                  {pt.data.savingsRate.toFixed(0)}% POUPADO
                                </text>
                              </g>

                              {/* Date Label */}
                              <g transform={`translate(${pt.x}, ${svgCalculations.baselineY + 24})`}>
                                <text
                                  textAnchor="middle"
                                  fill={isLight ? '#0c305c' : '#ffffff'}
                                  fontSize="14"
                                  fontWeight="800"
                                >
                                  {pt.data.label.split(' ')[0]}
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </g>
                    )}
                  </svg>
                </div>
              </div>

              {/* 3. Monthly Cards Strip (Poder360-Style Phase/Avatars Row) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 px-2">
                  <span>Demonstração Mês a Mês (Clique no mês para detalhar)</span>
                  <span>{monthlyData.length} Mês(es) Registrados</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  {monthlyData.map((m) => {
                    const isSelected = activeMonthSummary?.monthKey === m.monthKey;
                    const isPositive = m.savings >= 0;

                    return (
                      <button
                        key={m.monthKey}
                        onClick={() => setSelectedMonthKey(m.monthKey)}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? isLight
                              ? 'bg-white border-[#0c305c] ring-2 ring-[#0c305c] shadow-lg scale-[1.02]'
                              : 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/50 shadow-xl scale-[1.02]'
                            : isLight
                            ? 'bg-white/80 border-slate-200 hover:border-slate-300 shadow-sm'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                        }`}
                      >
                        {/* Month Header with Avatar */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-md ${
                              isPositive ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-amber-500 to-rose-700'
                            }`}>
                              {m.monthName.slice(0, 3).toUpperCase()}
                            </div>
                            <div>
                              <h4 className={`text-xs font-black uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {m.monthName}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-semibold">{m.year}</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isPositive 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}>
                            {isPositive ? `+${m.savingsRate.toFixed(0)}%` : 'Déficit'}
                          </span>
                        </div>

                        {/* Values: Quanto Recebi vs Quanto Gastei */}
                        <div className="space-y-1 text-xs font-mono">
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span className="font-sans text-[11px] font-bold text-slate-500 dark:text-slate-400">Recebi:</span>
                            <span className="font-black">R$ {m.income.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                          </div>

                          <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                            <span className="font-sans text-[11px] font-bold text-slate-500 dark:text-slate-400">Gastei:</span>
                            <span className="font-black">R$ {m.expense.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                          </div>

                          <div className="border-t border-slate-200 dark:border-white/10 pt-1 flex justify-between items-center font-black">
                            <span className="font-sans text-[11px] text-slate-700 dark:text-slate-300">Sobrou:</span>
                            <span className={isPositive ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'}>
                              R$ {m.savings.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>

                        {/* Proportional Mini Bar */}
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${Math.min(100, (m.income / (m.income + m.expense || 1)) * 100)}%` }} 
                            title="Proporção Recebida"
                          />
                          <div 
                            className="h-full bg-rose-500" 
                            style={{ width: `${Math.min(100, (m.expense / (m.income + m.expense || 1)) * 100)}%` }} 
                            title="Proporção Paga"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Deep Dive Breakdown of the Selected Month */}
              {activeMonthSummary && (
                <div className={`p-6 rounded-3xl border transition-all ${
                  isLight 
                    ? 'bg-white border-slate-200 shadow-md text-slate-800' 
                    : 'bg-slate-900/90 border-white/10 text-white'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-500 font-black text-sm">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black">
                          Detalhamento de {activeMonthSummary.monthName} de {activeMonthSummary.year}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Composição exata de onde veio a renda e para onde foi o dinheiro gasto
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs font-bold">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Entradas: R$ {activeMonthSummary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Saídas: R$ {activeMonthSummary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
                    {/* Sources of Income in this month */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <span>Fontes de Renda / Salários Recebidos</span>
                        <span>{activeMonthSummary.topIncomeSources.length} fonte(s)</span>
                      </div>

                      {activeMonthSummary.topIncomeSources.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 text-xs text-slate-400 text-center">
                          Nenhum salário individual cadastrado especificamente neste mês.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeMonthSummary.topIncomeSources.map((src, i) => {
                            const pct = activeMonthSummary.income > 0 ? (src.amount / activeMonthSummary.income) * 100 : 0;
                            return (
                              <div key={i} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                  <span>{src.source}</span>
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                    R$ {src.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({pct.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Categories of Expenses in this month */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        <span>Maiores Categorias de Despesas Pagas</span>
                        <span>{activeMonthSummary.topExpenseCategories.length} categoria(s)</span>
                      </div>

                      {activeMonthSummary.topExpenseCategories.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 text-xs text-slate-400 text-center">
                          Nenhuma despesa individual lançada neste mês.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeMonthSummary.topExpenseCategories.map((cat, i) => {
                            const pct = activeMonthSummary.expense > 0 ? (cat.amount / activeMonthSummary.expense) * 100 : 0;
                            return (
                              <div key={i} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                  <span>{cat.category}</span>
                                  <span className="font-mono text-rose-600 dark:text-rose-400">
                                    R$ {cat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({pct.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-rose-500/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Attribution & Date (Poder360 style) */}
              <div className={`flex flex-wrap items-center justify-between pt-4 border-t gap-2 text-[11px] ${
                isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-slate-400'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold">fonte:</span>
                  <span>Extratos, Salários e Lançamentos da Família {familyName}</span>
                </div>

                <div className="flex items-center gap-3 font-bold">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Relatório Mensal Consolidado</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">
                    {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. Secondary View: Cumulative Family Net Worth Trajectory */}
      {activeTab === 'family_trajectory' && (
        <div className={`relative rounded-[32px] overflow-hidden transition-all duration-300 shadow-2xl border ${
          isLight 
            ? 'bg-[#f4f7fb] text-[#0f172a] border-slate-300/80 shadow-slate-900/10' 
            : 'bg-slate-950/80 text-white border-white/10 backdrop-blur-3xl'
        }`}>
          <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />
          <div className="p-6 sm:p-10 lg:p-12 space-y-6">
            <div className="text-center space-y-2 max-w-3xl mx-auto">
              <h2 className={`text-2xl sm:text-4xl font-black uppercase ${isLight ? 'text-[#0c305c]' : 'text-indigo-400'}`}>
                TRAJETÓRIA PATRIMONIAL ACUMULADA
              </h2>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Evolução contínua do saldo das contas e reservas líquidas da Família {familyName}
              </p>
            </div>

            {/* Trajectory Table / Visual Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {cumulativeData.map((pt, i) => (
                <div 
                  key={i} 
                  className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-400">{pt.label}</div>
                  <div className="text-2xl font-black font-mono text-indigo-500 mt-1">
                    R$ {pt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {pt.note && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                      {pt.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. DRE Statement View */}
      {activeTab === 'dre_statement' && (
        <FinancialDREStatement 
          incomes={incomes}
          expenses={expenses}
          accounts={accounts}
          debts={debts}
          goals={goals}
          loans={loans}
          familyName={familyName}
          isLight={isLight}
        />
      )}

      {/* 5. Dollar Benchmark View */}
      {activeTab === 'dollar_benchmark' && (
        <div className={`relative rounded-[32px] overflow-hidden transition-all duration-300 shadow-2xl border ${
          isLight 
            ? 'bg-[#f4f7fb] text-[#0f172a] border-slate-300/80 shadow-slate-900/10' 
            : 'bg-slate-950/80 text-white border-white/10 backdrop-blur-3xl'
        }`}>
          <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-600" />
          <div className="p-6 sm:p-10 lg:p-12 space-y-8">
            <div className="text-center space-y-2 max-w-3xl mx-auto">
              <h2 className={`text-2xl sm:text-4xl font-black uppercase ${isLight ? 'text-[#0c305c]' : 'text-amber-400'}`}>
                DÓLAR DESDE O INÍCIO DO PLANO REAL (1994 - 2024)
              </h2>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                cotação nominal mensal e o câmbio de hoje com base na Ptax do Banco Central
              </p>
            </div>

            {/* Presidential Era Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
              {HISTORICAL_DOLLAR_PHASES.map((p) => (
                <div key={p.id} className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${p.avatarBg} text-white font-black text-xs flex items-center justify-center`}>
                      {p.avatarText}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{p.title}</h4>
                      <span className="text-[10px] text-slate-400">{p.period}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {p.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: DRE Familiar (Demonstração do Resultado do Exercício)
function FinancialDREStatement({
  incomes,
  expenses,
  accounts,
  debts,
  goals,
  loans,
  familyName,
  isLight
}: {
  incomes: Income[];
  expenses: Expense[];
  accounts: Account[];
  debts: Debt[];
  goals: Goal[];
  loans: Loan[];
  familyName: string;
  isLight: boolean;
}) {
  const totalGrossIncome = incomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalAccountBalances = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalPendingDebts = debts.filter(d => d.status !== 'settled').reduce((sum, d) => sum + Math.max(0, Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);
  const totalRemainingLoans = loans.reduce((sum, l) => sum + Number(l.remaining_amount || 0), 0);
  const totalSavedInGoals = goals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);

  const netOperatingResult = totalGrossIncome - totalExpenses;
  const netWorth = totalAccountBalances + totalSavedInGoals - totalPendingDebts - totalRemainingLoans;

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/80 border-white/10 text-white backdrop-blur-2xl'
    }`}>
      <div className="border-b pb-4 border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
            Demonstração do Resultado & Balanço Patrimonial
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Relatório gerencial padronizado para a Família {familyName}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400">Patrimônio Líquido Estimado</span>
          <div className={`text-2xl font-black font-mono ${netWorth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            R$ {netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* DRE Rows */}
      <div className="space-y-3 font-mono text-sm">
        {/* 1. Receita Bruta */}
        <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-bold text-emerald-600 dark:text-emerald-400">
          <span>(+) 1. RECEITAS / SALÁRIOS TOTAIS REALIZADOS</span>
          <span>R$ {totalGrossIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* 2. Despesas Operacionais */}
        <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 font-bold text-rose-600 dark:text-rose-400">
          <span>(-) 2. DESPESAS E CUSTOS FIXOS/VARIÁVEIS</span>
          <span>R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* 3. Resultado Operacional Líquido */}
        <div className={`flex justify-between items-center py-3 px-4 rounded-xl border-2 font-black ${
          netOperatingResult >= 0 
            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400' 
            : 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
        }`}>
          <span>(=) 3. RESULTADO OPERACIONAL LÍQUIDO (SUPERÁVIT / DÉFICIT)</span>
          <span className="text-base">R$ {netOperatingResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* 4. Balanço de Ativos e Passivos */}
        <div className="pt-4 space-y-2">
          <div className="text-xs font-sans font-extrabold uppercase tracking-wider text-slate-400">
            Composição de Ativos e Passivos (Balanço Consolidado)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Ativos */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-xs font-sans font-bold text-emerald-400">ATIVOS (Contas + Metas)</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Saldo em Contas Bancárias:</span>
                <span>R$ {totalAccountBalances.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Poupado em Metas:</span>
                <span>R$ {totalSavedInGoals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-emerald-400 text-xs">
                <span>Total de Ativos:</span>
                <span>R$ {(totalAccountBalances + totalSavedInGoals).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Passivos */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-xs font-sans font-bold text-rose-400">PASSIVOS (Dívidas + Empréstimos)</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Dívidas Pendentes:</span>
                <span>R$ {totalPendingDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Saldo Devedor Empréstimos:</span>
                <span>R$ {totalRemainingLoans.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-rose-400 text-xs">
                <span>Total de Passivos:</span>
                <span>R$ {(totalPendingDebts + totalRemainingLoans).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
