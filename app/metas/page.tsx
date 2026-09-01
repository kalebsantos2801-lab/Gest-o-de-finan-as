'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Goal } from '@/types/database';
import { Target, Plus, Trash2, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function GoalsPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <GoalsContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function GoalsContent() {
  const { profile, user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>(() => memoryCache.get<Goal[]>('goals_list') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('goals_list'));
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Reserva de Emergência');
  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadGoals = useCallback(async () => {
    if (!profile?.family_id && !user?.id) {
      setLoading(false);
      return;
    }
    const cached = memoryCache.get<Goal[]>('goals_list');
    if (!cached) {
      setLoading(true);
    }
    try {
      const goalsQuery = user?.id
        ? (profile?.family_id
            ? supabase.from('goals').select('*').or(`user_id.eq.${user.id},and(family_id.eq.${profile.family_id},user_id.is.null)`).order('created_at', { ascending: false })
            : supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }))
        : supabase.from('goals').select('*').eq('family_id', profile?.family_id!).order('created_at', { ascending: false });

      const { data } = await goalsQuery;
      if (data) {
        setGoals(data as Goal[]);
        memoryCache.set('goals_list', data);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id, user?.id]);

  useEffect(() => {
    const hasCache = memoryCache.get('goals_list');
    if (hasCache) {
      // Defer background revalidation by 400ms to allow route transitions to complete with 0% CPU thread blocking
      const timer = setTimeout(() => {
        loadGoals();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      loadGoals();
    }
  }, [loadGoals]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    const isCategoryEmpty = category === 'Outro' ? !customCategory.trim() : !category.trim();

    if (!title.trim() || !targetAmount) {
      setErrorMsg('Informe o título e o valor alvo da meta.');
      return;
    }
    if (isCategoryEmpty) {
      setErrorMsg('Informe a categoria.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const finalCategory = category === 'Outro' ? customCategory.trim() : category;
      const { error } = await supabase.from('goals').insert({
        family_id: profile?.family_id,
        user_id: user?.id,
        title: title.trim(),
        target_amount: parseFloat(targetAmount.replace(',', '.')),
        current_amount: parseFloat(currentAmount.replace(',', '.') || '0'),
        target_date: targetDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        category: finalCategory,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        memoryCache.delete('goals_list');
        memoryCache.delete('dashboard_goals');
        setTitle('');
        setTargetAmount('');
        setCurrentAmount('');
        setCustomCategory('');
        setModalOpen(false);
        await loadGoals();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar meta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProgress = async (goal: Goal) => {
    const amountStr = prompt('Quanto deseja adicionar à meta (R$)?');
    if (!amountStr) return;
    const addVal = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(addVal) || addVal <= 0) return;

    await supabase
      .from('goals')
      .update({ current_amount: Number(goal.current_amount || 0) + addVal })
      .eq('id', goal.id);

    memoryCache.delete('goals_list');
    memoryCache.delete('dashboard_goals');
    await loadGoals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return;
    await supabase.from('goals').delete().eq('id', id);
    memoryCache.delete('goals_list');
    memoryCache.delete('dashboard_goals');
    setGoals(prev => prev.filter(g => g.id !== id));
    await loadGoals();
  };

  const totalTarget = goals.reduce((acc, curr) => acc + Number(curr.target_amount || 0), 0);
  const totalSaved = goals.reduce((acc, curr) => acc + Number(curr.current_amount || 0), 0);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                <Target className="w-5 h-5" />
              </div>
              Metas Financeiras da Família
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Planejamento de reservas, viagens, aquisições e sonhos futuros
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Acumulado</span>
              <span className="text-base sm:text-lg font-extrabold text-amber-400 font-mono">
                R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-amber-600/25 border border-amber-400/20 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Meta</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px]">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>Carregando metas do Supabase...</span>
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-12 text-center space-y-3 shadow-2xl">
            <Target className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Nenhuma meta cadastrada</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Defina objetivos reais para sua família (ex: Reserva de Emergência de 6 meses, Férias, Carro Novo).
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-600/25 border border-amber-400/20"
            >
              + Cadastrar Primeira Meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.map((goal) => {
              const progress = Math.min(100, Math.round(((goal.current_amount || 0) / goal.target_amount) * 100));
              return (
                <div key={goal.id} className="bg-white/[0.04] hover:bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">{goal.category}</span>
                      <h4 className="font-bold text-white text-sm mt-2">{goal.title}</h4>
                    </div>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-white/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-mono">
                        R$ {Number(goal.current_amount || 0).toLocaleString('pt-BR')} / R$ {Number(goal.target_amount).toLocaleString('pt-BR')}
                      </span>
                      <span className="font-extrabold text-amber-400">{progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all shadow-sm" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Prazo: <strong className="text-slate-300">{new Date(goal.target_date).toLocaleDateString('pt-BR')}</strong>
                    </span>
                    <button
                      onClick={() => handleAddProgress(goal)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl text-xs font-bold transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Adicionar Valor
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Nova Meta Financeira
            </h3>

            <form onSubmit={handleAddGoal} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Título da Meta</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reserva de Emergência / Viagem"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="10000.00"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Já Acumulado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="Reserva de Emergência">Reserva de Emergência</option>
                    <option value="Viagem">Viagem</option>
                    <option value="Imóvel">Imóvel</option>
                    <option value="Veículo">Veículo</option>
                    <option value="Educação">Educação</option>
                    <option value="Aposentadoria">Aposentadoria</option>
                    <option value="Outro">Outra (Digitar)</option>
                  </select>
                  {category === 'Outro' && (
                    <input
                      type="text"
                      placeholder="Digite a categoria"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      required
                      className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Data Limite</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-600/25 border border-amber-400/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Salvando...' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
