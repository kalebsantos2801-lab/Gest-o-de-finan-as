'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Income, Expense } from '@/types/database';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, PieChart as PieChartIcon, Calendar, Loader2 } from 'lucide-react';

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
  const { profile } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile?.family_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: inc } = await supabase
        .from('income')
        .select('*')
        .eq('family_id', profile.family_id);
      if (inc) setIncomes(inc as Income[]);

      const { data: exp } = await supabase
        .from('expenses')
        .select('*')
        .eq('family_id', profile.family_id);
      if (exp) setExpenses(exp as Expense[]);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIncome = incomes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Outros';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount);
  });

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              Relatórios e Demonstração Financeira
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Consolidação de receitas vs. despesas reais armazenadas no Supabase
            </p>
          </div>
        </div>

        {/* Global summary card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-1.5 shadow-2xl">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total de Entradas</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-1.5 shadow-2xl">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total de Despesas</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-1.5 shadow-2xl">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Saldo Líquido</span>
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${balance >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 sm:p-7 space-y-5 shadow-2xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/15 border border-cyan-500/30 rounded-lg text-cyan-400">
              <PieChartIcon className="w-4 h-4" />
            </div>
            Distribuição de Gastos por Categoria
          </h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Calculando balanços reais...</span>
            </div>
          ) : Object.keys(expensesByCategory).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhuma despesa para gerar relatório por categoria.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(expensesByCategory).map(([cat, val]) => {
                const pct = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200 font-bold">{cat}</span>
                      <span className="text-slate-400 font-mono">
                        R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-cyan-400 font-bold">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full shadow-sm" style={{ width: `${pct}%` }} />
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
