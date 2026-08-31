'use client';

import React, { useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { memoryCache } from '@/lib/cache';
import { Banknote, X, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface RegisterSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegisterSalaryModal({ isOpen, onClose, onSuccess }: RegisterSalaryModalProps) {
  const { user, profile } = useAuth();
  const [description, setDescription] = useState('Salário');
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'received' | 'expected'>('received');
  const [isRecurring, setIsRecurring] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor de salário válido.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('income').insert({
        family_id: profile?.family_id,
        user_id: user?.id,
        description: description.trim() || 'Salário',
        amount: parsedAmount,
        category: 'Salário',
        received_at: receivedAt,
        is_recurring: isRecurring,
        status: status,
        account_id: null, // Zero vínculos com contas bancárias
      });

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      // Clear relevant caches
      memoryCache.delete('income_list');
      memoryCache.delete('dashboard_incomes');
      memoryCache.delete('dashboard_expenses');

      setSuccessMsg('Salário registrado com sucesso!');
      setTimeout(() => {
        setSubmitting(false);
        setSuccessMsg('');
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao registrar salário');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1329]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[32px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Registrar Meu Salário</h3>
              <p className="text-[11px] text-slate-400">Sem vínculos com contas bancárias ou cartões</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 ml-1">Descrição do Salário</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Salário Mensal, Pró-labore"
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 ml-1">Valor Salarial (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 5000.00"
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-emerald-500/30 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 ml-1">Data / Dia</label>
              <input
                type="date"
                required
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 ml-1">Status do Salário</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('received')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'received'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/25'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Já Recebido</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('expected')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'expected'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/25'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Previsão futuro</span>
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-slate-900 text-emerald-600 focus:ring-emerald-500/50 cursor-pointer"
            />
            <span className="text-xs text-slate-300">
              Registrar como receita recorrente mensal
            </span>
          </label>

          <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl text-[11px] text-slate-400 leading-relaxed">
            💡 Este cadastro não depende de conta bancária e será contabilizado diretamente no seu total de Entradas.
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 disabled:opacity-50 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                'Salvar Salário'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
