'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  PieChart as PieChartIcon,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Income, Expense } from '@/types/database';
import { extractMonthAndYear, safeNumber } from '@/lib/dateUtils';
import Link from 'next/link';

export interface MonthlyDataPoint {
  label: string;
  key: number;
  inc: number;
  exp: number;
  year?: number;
}

interface FinancialEvolutionChartProps {
  data?: MonthlyDataPoint[];
  incomes?: Income[];
  expenses?: Expense[];
  maxVal?: number;
  currentMonthIndex?: number;
  className?: string;
  title?: string;
  subtitle?: string;
  showCategoryBreakdowns?: boolean;
}

const FULL_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

// Excel-style color palette for 3D/Clean Pie charts
const EXPENSE_COLORS = [
  '#ed7d31', // Orange / Diversos
  '#70ad47', // Green / Transporte
  '#7030a0', // Purple / Saúde
  '#4472c4', // Blue / Investimentos
  '#ffc000', // Yellow / Moradia
  '#a5a5a5', // Grey / Educação
  '#255e91', // Dark Blue
  '#9e480e'  // Brown
];

const INCOME_COLORS = [
  '#2f5597', // Dark Blue / Salário
  '#c00000', // Red / Aluguel
  '#548235', // Green / 13º salário
  '#bf8f00', // Gold / Férias
  '#7030a0'  // Purple / Outros
];

export function FinancialEvolutionChart({
  data: initialData,
  incomes = [],
  expenses = [],
  maxVal: providedMaxVal,
  currentMonthIndex = new Date().getMonth(),
  className = '',
  title = 'Receitas x Despesas',
  showCategoryBreakdowns = true
}: FinancialEvolutionChartProps) {
  const currentActualYear = new Date().getFullYear();
  
  // Detect available years in incomes and expenses
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentActualYear);

    incomes.forEach(i => {
      const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
      if (parsed) yearsSet.add(parsed.year);
    });

    expenses.forEach(e => {
      const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
      if (parsed) yearsSet.add(parsed.year);
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [incomes, expenses, currentActualYear]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // If current year has no data but other year has data, default to newest year with data
    if (availableYears.length > 0) return availableYears[0];
    return currentActualYear;
  });

  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [hoveredBarType, setHoveredBarType] = useState<'income' | 'expense' | null>(null);

  // Compute 12-month data (Janeiro to Dezembro) with safe, timezone-proof date extraction
  const yearlyData = useMemo(() => {
    if (incomes.length > 0 || expenses.length > 0) {
      return FULL_MONTH_NAMES.map((name, mIdx) => {
        // Match incomes for this month and year
        const mIncs = incomes.filter(i => {
          const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
          if (!parsed) {
            // If no date, include in current month/year to prevent data loss
            return mIdx === currentMonthIndex && selectedYear === currentActualYear;
          }
          return parsed.month === mIdx && parsed.year === selectedYear;
        });

        // Match expenses for this month and year
        const mExps = expenses.filter(e => {
          const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
          if (!parsed) {
            // If no date, include in current month/year to prevent data loss
            return mIdx === currentMonthIndex && selectedYear === currentActualYear;
          }
          return parsed.month === mIdx && parsed.year === selectedYear;
        });

        const sumInc = mIncs.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);
        const sumExp = mExps.reduce((acc, curr) => acc + safeNumber(curr.amount), 0);

        return {
          label: name,
          shortLabel: SHORT_MONTH_NAMES[mIdx],
          key: mIdx,
          year: selectedYear,
          inc: sumInc,
          exp: sumExp
        };
      });
    }

    // Fallback if pre-aggregated data is provided
    if (initialData && initialData.length > 0) {
      return FULL_MONTH_NAMES.map((name, mIdx) => {
        const match = initialData.find(d => d.key === mIdx);
        return {
          label: name,
          shortLabel: SHORT_MONTH_NAMES[mIdx],
          key: mIdx,
          year: selectedYear,
          inc: match ? safeNumber(match.inc) : 0,
          exp: match ? safeNumber(match.exp) : 0
        };
      });
    }

    // Empty 12 months fallback
    return FULL_MONTH_NAMES.map((name, mIdx) => ({
      label: name,
      shortLabel: SHORT_MONTH_NAMES[mIdx],
      key: mIdx,
      year: selectedYear,
      inc: 0,
      exp: 0
    }));
  }, [incomes, expenses, selectedYear, initialData, currentMonthIndex, currentActualYear]);

  // Compute dynamic Y-axis maximum scale
  const maxVal = useMemo(() => {
    if (providedMaxVal && providedMaxVal > 0) return providedMaxVal;
    const highest = Math.max(...yearlyData.map(d => Math.max(d.inc, d.exp)), 1000);
    
    if (highest <= 1000) return 1000;
    if (highest <= 3000) return 3000;
    if (highest <= 6000) return 6000;
    if (highest <= 10000) return 10000;
    if (highest <= 20000) return 20000;
    return Math.ceil(highest / 5000) * 5000;
  }, [yearlyData, providedMaxVal]);

  // Aggregate Category Breakdowns for the Selected Year (or all data if year has none)
  const expenseCategories = useMemo(() => {
    const yearExps = expenses.filter(e => {
      const parsed = extractMonthAndYear(e.due_date || (e as any).date || (e as any).payment_date || e.created_at);
      return !parsed || parsed.year === selectedYear;
    });

    const targetList = yearExps.length > 0 ? yearExps : expenses;
    if (targetList.length === 0) return [];

    const map: Record<string, number> = {};
    targetList.forEach(e => {
      const cat = (e.category || 'Diversos').trim();
      map[cat] = (map[cat] || 0) + safeNumber(e.amount);
    });

    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;

    return Object.entries(map)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: Math.round((amount / total) * 100),
        color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, selectedYear]);

  const incomeCategories = useMemo(() => {
    const yearIncs = incomes.filter(i => {
      const parsed = extractMonthAndYear(i.received_at || (i as any).date || i.created_at);
      return !parsed || parsed.year === selectedYear;
    });

    const targetList = yearIncs.length > 0 ? yearIncs : incomes;
    if (targetList.length === 0) return [];

    const map: Record<string, number> = {};
    targetList.forEach(i => {
      const src = (i.category || i.description || 'Salário').trim();
      map[src] = (map[src] || 0) + safeNumber(i.amount);
    });

    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;

    return Object.entries(map)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: Math.round((amount / total) * 100),
        color: INCOME_COLORS[idx % INCOME_COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [incomes, selectedYear]);

  // SVG Chart Layout Metrics
  const svgWidth = 840;
  const svgHeight = 360;
  const paddingLeft = 105;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 55;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + plotHeight;

  // Y-axis 6 intervals
  const numberOfTicks = 6;
  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    for (let i = 0; i <= numberOfTicks; i++) {
      const val = (maxVal / numberOfTicks) * i;
      const y = baselineY - (val / maxVal) * plotHeight;
      ticks.push({ value: val, y });
    }
    return ticks;
  }, [maxVal, baselineY, plotHeight, numberOfTicks]);

  const monthGroupWidth = plotWidth / 12;
  const barWidth = Math.min(22, monthGroupWidth * 0.38);
  const barGap = 2;

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const activeMonthData = hoveredMonthIndex !== null ? yearlyData[hoveredMonthIndex] : null;

  // Helper for generating SVG pie chart slices
  const renderPieSlices = (items: { name: string; amount: number; percentage: number; color: string }[]) => {
    if (items.length === 0) return null;

    let accumulatedAngle = 0;
    const radius = 55;
    const cx = 80;
    const cy = 65;

    return items.map((item, idx) => {
      const sliceAngle = (item.percentage / 100) * 360;
      if (sliceAngle <= 0) return null;

      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + sliceAngle;
      accumulatedAngle += sliceAngle;

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return (
        <g key={`slice-${idx}`} className="hover:opacity-90 transition cursor-pointer">
          <path
            d={pathData}
            fill={item.color}
            stroke="#ffffff"
            strokeWidth="1"
          />
        </g>
      );
    });
  };

  return (
    <div className={`w-full rounded-2xl bg-white border border-slate-200 shadow-md p-4 sm:p-6 space-y-6 text-slate-800 relative overflow-hidden ${className}`}>
      
      {/* Top Banner & Year Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="text-center sm:text-left">
          <span className="text-emerald-700 font-bold text-sm tracking-wide">
            Resumo das Despesas
          </span>
        </div>

        {/* Year Navigator */}
        <div className="flex items-center gap-2 self-center sm:self-auto">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setSelectedYear(prev => prev - 1)}
              className="p-1 hover:bg-white rounded transition text-slate-600 hover:text-slate-900"
              title="Ano anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold">{selectedYear}</span>
            <button
              type="button"
              onClick={() => setSelectedYear(prev => prev + 1)}
              className="p-1 hover:bg-white rounded transition text-slate-600 hover:text-slate-900"
              title="Próximo ano"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Title */}
      <div className="text-center pt-1">
        <h2 className="text-xl sm:text-2xl font-serif font-normal text-slate-700 tracking-normal">
          {title}
        </h2>
      </div>

      {/* 1. TOP BAR CHART: Receitas x Despesas (12 Months) */}
      <div className="w-full overflow-x-auto select-none pt-2 pb-1">
        <div className="min-w-[640px] w-full">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-auto overflow-visible"
          >
            <defs>
              <linearGradient id="excelBlueBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b9bd5" />
                <stop offset="100%" stopColor="#41719c" />
              </linearGradient>

              <linearGradient id="excelCoralBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ed7d31" />
                <stop offset="100%" stopColor="#c55a11" />
              </linearGradient>

              <filter id="barShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Horizontal Grid lines & Y-Axis Labels */}
            {yTicks.map((tick, i) => (
              <g key={`ytick-${i}`}>
                <text
                  x={paddingLeft - 12}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="#595959"
                  fontSize="11.5"
                  fontFamily="Arial, sans-serif"
                  fontWeight="normal"
                >
                  {formatCurrency(tick.value)}
                </text>

                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={svgWidth - paddingRight}
                  y2={tick.y}
                  stroke={i === 0 ? "#7f7f7f" : "#e5e7eb"}
                  strokeWidth={i === 0 ? "1.5" : "1"}
                />
              </g>
            ))}

            {/* Vertical Y-Axis Spine */}
            <line
              x1={paddingLeft}
              y1={paddingTop}
              x2={paddingLeft}
              y2={baselineY}
              stroke="#7f7f7f"
              strokeWidth="1.5"
            />

            {/* 12 Months Bars */}
            {yearlyData.map((item, idx) => {
              const groupCenterX = paddingLeft + idx * monthGroupWidth + monthGroupWidth / 2;
              const isHovered = hoveredMonthIndex === idx;
              const isCurrentMonth = selectedYear === currentActualYear && idx === currentMonthIndex;

              const incHeight = (Math.min(maxVal, Math.max(0, item.inc)) / maxVal) * plotHeight;
              const expHeight = (Math.min(maxVal, Math.max(0, item.exp)) / maxVal) * plotHeight;

              const incX = groupCenterX - barWidth - barGap / 2;
              const expX = groupCenterX + barGap / 2;

              const incY = baselineY - incHeight;
              const expY = baselineY - expHeight;

              return (
                <g 
                  key={`month-col-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredMonthIndex(idx)}
                  onMouseLeave={() => {
                    setHoveredMonthIndex(null);
                    setHoveredBarType(null);
                  }}
                >
                  {isHovered && (
                    <rect
                      x={paddingLeft + idx * monthGroupWidth + 2}
                      y={paddingTop}
                      width={monthGroupWidth - 4}
                      height={plotHeight}
                      fill="#f3f4f6"
                      opacity="0.75"
                    />
                  )}

                  {/* Income Bar (Blue) */}
                  <rect
                    x={incX}
                    y={incY}
                    width={barWidth}
                    height={Math.max(1, incHeight)}
                    fill={hoveredBarType === 'income' && isHovered ? "#3b82f6" : "#5b9bd5"}
                    stroke="#41719c"
                    strokeWidth="0.5"
                    filter={isHovered ? "url(#barShadow)" : undefined}
                    onMouseEnter={() => setHoveredBarType('income')}
                    className="transition-all duration-150"
                  />

                  {/* Expense Bar (Coral / Orange) */}
                  <rect
                    x={expX}
                    y={expY}
                    width={barWidth}
                    height={Math.max(1, expHeight)}
                    fill={hoveredBarType === 'expense' && isHovered ? "#ef4444" : "#ed7d31"}
                    stroke="#c55a11"
                    strokeWidth="0.5"
                    filter={isHovered ? "url(#barShadow)" : undefined}
                    onMouseEnter={() => setHoveredBarType('expense')}
                    className="transition-all duration-150"
                  />

                  {/* Month Label */}
                  <text
                    x={groupCenterX}
                    y={baselineY + 18}
                    textAnchor="middle"
                    fill={isHovered ? "#0f172a" : (isCurrentMonth ? "#1d4ed8" : "#595959")}
                    fontSize="11"
                    fontFamily="Arial, sans-serif"
                    fontWeight={isHovered || isCurrentMonth ? "bold" : "normal"}
                  >
                    {item.label}
                  </text>

                  {/* Tick mark */}
                  <line
                    x1={groupCenterX}
                    y1={baselineY}
                    x2={groupCenterX}
                    y2={baselineY + 4}
                    stroke="#7f7f7f"
                    strokeWidth="1"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Main Legend */}
      <div className="flex items-center justify-center gap-8 pt-1 text-xs font-normal text-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-[#5b9bd5] border border-[#41719c] shadow-xs" />
          <span className="font-medium text-slate-700">Total Receitas</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-[#ed7d31] border border-[#c55a11] shadow-xs" />
          <span className="font-medium text-slate-700">Total Despesas</span>
        </div>
      </div>

      {/* Hover Information Tooltip */}
      {activeMonthData && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
            {activeMonthData.label} / {selectedYear}
          </span>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#5b9bd5]" />
              <span className="text-slate-600">Receitas:</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatCurrency(activeMonthData.inc)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ed7d31]" />
              <span className="text-slate-600">Despesas:</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatCurrency(activeMonthData.exp)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-slate-600">Saldo:</span>
              <span className={`font-bold font-mono ${activeMonthData.inc - activeMonthData.exp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {activeMonthData.inc - activeMonthData.exp >= 0 ? '+' : ''}{formatCurrency(activeMonthData.inc - activeMonthData.exp)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. BOTTOM SIDE-BY-SIDE PIE CHARTS (Despesas vs Receitas) */}
      {showCategoryBreakdowns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
          
          {/* Left Pie Chart: Despesas por Categoria */}
          <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-xs space-y-3">
            <h3 className="text-center font-serif text-lg text-slate-700">
              Despesas
            </h3>

            {expenseCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma despesa cadastrada para {selectedYear}.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                {/* SVG Pie */}
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <svg viewBox="0 0 160 130" className="w-full h-full">
                    {renderPieSlices(expenseCategories)}
                  </svg>
                </div>

                {/* Slices Legend */}
                <div className="space-y-1 text-xs max-h-40 overflow-y-auto pr-1 min-w-[140px]">
                  {expenseCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate text-slate-700">{cat.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">{cat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Pie Chart: Receitas por Fonte/Categoria */}
          <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-xs space-y-3">
            <h3 className="text-center font-serif text-lg text-slate-700">
              Receitas
            </h3>

            {incomeCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma receita cadastrada para {selectedYear}.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                {/* SVG Pie */}
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <svg viewBox="0 0 160 130" className="w-full h-full">
                    {renderPieSlices(incomeCategories)}
                  </svg>
                </div>

                {/* Slices Legend */}
                <div className="space-y-1 text-xs max-h-40 overflow-y-auto pr-1 min-w-[140px]">
                  {incomeCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate text-slate-700">{cat.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">{cat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. EXCEL-STYLE BOTTOM STATUS BAR */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Link 
            href="/despesas"
            className="px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Lançamentos
          </Link>
          <button 
            type="button"
            className="px-3 py-1 rounded bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition"
          >
            Gráficos
          </button>
          <Link 
            href="/relatorios"
            className="px-3 py-1 rounded hover:bg-slate-100 text-slate-600 font-medium transition"
          >
            Sobre
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <span>Ano: <strong>{selectedYear}</strong></span>
          <span>Despesas cadastradas: <strong>{expenses.length}</strong></span>
          <span>Receitas cadastradas: <strong>{incomes.length}</strong></span>
        </div>
      </div>
    </div>
  );
}
