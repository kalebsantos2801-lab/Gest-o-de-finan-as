'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Debt } from '@/types/database';
import { AlertOctagon, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function DebtsPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <DebtsContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function DebtsContent() {
  const { profile, user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>(() => memoryCache.get<Debt[]>('debts_list') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('debts_list'));
  const [modalOpen, setModalOpen] = useState(false);

  const [creditor, setCreditor] = useState('');
  const [description, setDescription] = useState('Empréstimo Pessoal');
  const [customDescription, setCustomDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadDebts = useCallback(async () => {
    if (!profile?.family_id) {
      setLoading(false);
      return;
    }
    if (!memoryCache.get('debts_list')) {
      setLoading(true);
    }
    try {
      const { data } = await supabase
        .from('debts')
        .select('*')
        .eq('family_id', profile.family_id)
        .order('created_at', { ascending: false });
      if (data) {
        setDebts(data as Debt[]);
        memoryCache.set('debts_list', data);
      }
    } catch (err) {
      console.error('Error fetching debts:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();

    const isDescriptionEmpty = description === 'Outros' ? !customDescription.trim() : !description.trim();
    const isAmountInvalid = !totalAmount || parseFloat(totalAmount.replace(',', '.')) <= 0;

    if (!creditor.trim()) {
      setErrorMsg('Informe o credor / banco.');
      return;
    }
    if (isDescriptionEmpty && isAmountInvalid) {
      setErrorMsg('Informe a descrição e o valor.');
      return;
    }
    if (isDescriptionEmpty) {
      setErrorMsg('Informe a descrição.');
      return;
    }
    if (isAmountInvalid) {
      setErrorMsg('Informe o valor total.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const finalDescription = description === 'Outros' ? customDescription.trim() : description;

      const { error } = await supabase.from('debts').insert({
        family_id: profile?.family_id,
        user_id: user?.id,
        creditor: creditor.trim(),
        description: finalDescription.trim() || 'Dívida a quitar',
        total_amount: parseFloat(totalAmount.replace(',', '.')),
        paid_amount: 0,
        due_date: dueDate,
        priority,
        status: 'pending',
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setCreditor('');
        setDescription('Empréstimo Pessoal');
        setCustomDescription('');
        setTotalAmount('');
        setErrorMsg('');
        setModalOpen(false);
        await loadDebts();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar dívida');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async (debt: Debt) => {
    await supabase.from('debts').update({ status: 'settled', paid_amount: debt.total_amount }).eq('id', debt.id);
    await loadDebts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro de dívida?')) return;
    await supabase.from('debts').delete().eq('id', id);
    setDebts(prev => prev.filter(d => d.id !== id));
  };

  const pendingDebtsTotal = debts
    .filter(d => d.status !== 'settled')
    .reduce((acc, curr) => acc + (Number(curr.total_amount) - Number(curr.paid_amount || 0)), 0);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400">
                <AlertOctagon className="w-5 h-5" />
              </div>
              Gestão e Quitação de Dívidas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Plano de renegociação e eliminação de pendências financeiras familiares
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total a Quitar</span>
              <span className="text-base sm:text-lg font-extrabold text-rose-400 font-mono">
                R$ {pendingDebtsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-rose-600/25 border border-rose-400/20 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Dívida</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px]">
            <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
            <span>Carregando dívidas do Supabase...</span>
          </div>
        ) : debts.length === 0 ? (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-12 text-center space-y-3 shadow-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Nenhuma dívida cadastrada</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Parabéns! Registre apenas pendências reais que sua família pretende renegociar ou liquidar.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/25 border border-rose-400/20"
            >
              + Registrar Dívida
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {debts.map((debt) => (
              <div key={debt.id} className="bg-white/[0.04] hover:bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm">{debt.creditor}</h4>
                    <p className="text-xs text-slate-400">{debt.description}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    debt.priority === 'high' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {debt.priority === 'high' ? 'Alta Prioridade' : 'Média'}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-xs text-slate-400">Valor Total:</span>
                  <span className="text-lg font-extrabold font-mono text-white">
                    R$ {Number(debt.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                  <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                    debt.status === 'settled' 
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                      : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                  }`}>
                    {debt.status === 'settled' ? 'QUITADA' : 'PENDENTE'}
                  </span>

                  <div className="flex items-center gap-2">
                    {debt.status !== 'settled' && (
                      <button
                        onClick={() => handleSettle(debt)}
                        className="px-3 py-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-xs font-bold transition"
                      >
                        Quitar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-white/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              Nova Dívida a Renegociar
            </h3>

            <form onSubmit={handleAddDebt} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Credor / Empresa</label>
                <input
                  type="text"
                  required
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  placeholder="Ex: Banco / Loja / Cartão Antigo"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Descrição / Motivo</label>
                <select
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="Empréstimo Pessoal">Empréstimo Pessoal</option>
                  <option value="Financiamento">Financiamento (Carro/Casa)</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cheque Especial">Cheque Especial</option>
                  <option value="Renegociação">Renegociação de Dívida</option>
                  <option value="Acordo">Acordo / Carnê</option>
                  <option value="Outros">Outra (Digitar)</option>
                </select>
                {description === 'Outros' && (
                  <input
                    type="text"
                    required
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Digite a descrição da dívida"
                    className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    <option value="high">Alta (Juros Altos)</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
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
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/25 border border-rose-400/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Salvando...' : 'Salvar Dívida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
