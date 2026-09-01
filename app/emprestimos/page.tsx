'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Loan } from '@/types/database';
import { Banknote, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function LoansPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <LoansContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function LoansContent() {
  const { profile, user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>(() => memoryCache.get<Loan[]>('loans_list') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('loans_list'));
  const [modalOpen, setModalOpen] = useState(false);

  // Modal states for Pagar Parcela e Excluir
  const [loanToPay, setLoanToPay] = useState<Loan | null>(null);
  const [payingInstallment, setPayingInstallment] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState('');
  const [lender, setLender] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [installments, setInstallments] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadLoans = useCallback(async () => {
    if (!profile?.family_id && !user?.id) {
      setLoading(false);
      return;
    }
    const cached = memoryCache.get<Loan[]>('loans_list');
    if (!cached) {
      setLoading(true);
    }
    try {
      const loansQuery = user?.id
        ? (profile?.family_id
            ? supabase.from('loans').select('*').or(`user_id.eq.${user.id},and(family_id.eq.${profile.family_id},user_id.is.null)`).order('created_at', { ascending: false })
            : supabase.from('loans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }))
        : supabase.from('loans').select('*').eq('family_id', profile?.family_id!).order('created_at', { ascending: false });

      const { data } = await loansQuery;
      if (data) {
        setLoans(data as Loan[]);
        memoryCache.set('loans_list', data);
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id, user?.id]);

  useEffect(() => {
    const hasCache = memoryCache.get('loans_list');
    if (hasCache) {
      // Defer background revalidation by 400ms to allow route transitions to complete with 0% CPU thread blocking
      const timer = setTimeout(() => {
        loadLoans();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      loadLoans();
    }
  }, [loadLoans]);

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !totalAmount) {
      setErrorMsg('Preencha os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const amount = parseFloat(totalAmount.replace(',', '.'));
      const { error } = await supabase.from('loans').insert({
        family_id: profile?.family_id,
        user_id: user?.id,
        title: title.trim(),
        lender: lender.trim() || 'Instituição Financeira',
        total_amount: amount,
        remaining_amount: amount,
        interest_rate: parseFloat(interestRate.replace(',', '.') || '0'),
        total_installments: Number(installments),
        paid_installments: 0,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        memoryCache.delete('loans_list');
        memoryCache.delete('report_loans');
        setTitle('');
        setLender('');
        setTotalAmount('');
        setInterestRate('');
        setModalOpen(false);
        await loadLoans();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar empréstimo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayInstallment = async () => {
    if (!loanToPay) return;
    const nextPaid = loanToPay.paid_installments + 1;
    if (nextPaid > loanToPay.total_installments) return;

    setPayingInstallment(true);
    try {
      const installmentValue = loanToPay.total_amount / loanToPay.total_installments;
      const remaining = Math.max(0, loanToPay.remaining_amount - installmentValue);

      await supabase
        .from('loans')
        .update({
          paid_installments: nextPaid,
          remaining_amount: remaining,
        })
        .eq('id', loanToPay.id);

      memoryCache.delete('loans_list');
      memoryCache.delete('report_loans');
      setLoanToPay(null);
      await loadLoans();
    } catch (err) {
      console.error('Error paying installment:', err);
      alert('Erro ao pagar parcela.');
    } finally {
      setPayingInstallment(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!loanToDelete) return;
    setDeleting(true);
    try {
      await supabase.from('loans').delete().eq('id', loanToDelete.id);
      memoryCache.delete('loans_list');
      memoryCache.delete('report_loans');
      setLoans(prev => prev.filter(l => l.id !== loanToDelete.id));
      setLoanToDelete(null);
      await loadLoans();
    } catch (err) {
      console.error('Error deleting loan:', err);
      alert('Erro ao excluir empréstimo.');
    } finally {
      setDeleting(false);
    }
  };

  const totalLoansValue = loans.reduce((acc, curr) => acc + Number(curr.remaining_amount || 0), 0);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Banknote className="w-5 h-5" />
              </div>
              Controle de Empréstimos & Financiamentos
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Acompanhe amortizações, taxas e parcelas restantes no Supabase
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Saldo Devedor Total</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">
                R$ {totalLoansValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/25 border border-emerald-400/20 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Empréstimo</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px]">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Carregando empréstimos...</span>
          </div>
        ) : loans.length === 0 ? (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-12 text-center space-y-3 shadow-2xl">
            <Banknote className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Nenhum empréstimo registrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre financiamentos (ex: Imóvel, Veículo, Consignado) para controlar a quitação das parcelas.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20"
            >
              + Cadastrar Primeiro Empréstimo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {loans.map((loan) => {
              const progress = Math.round((loan.paid_installments / loan.total_installments) * 100);
              return (
                <div key={loan.id} className="bg-white/[0.04] hover:bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{loan.title}</h4>
                      <p className="text-xs text-slate-400">{loan.lender} • Taxa: {loan.interest_rate}% a.m.</p>
                    </div>
                    <button
                      onClick={() => setLoanToDelete(loan)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-white/5 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Parcelas Pagas: <strong className="text-slate-200">{loan.paid_installments} de {loan.total_installments}</strong></span>
                      <span className="font-extrabold text-emerald-400">{progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-emerald-500 rounded-full transition-all shadow-sm" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Restante</span>
                      <span className="font-extrabold font-mono text-white text-base">
                        R$ {Number(loan.remaining_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {loan.paid_installments < loan.total_installments ? (
                      <button
                        onClick={() => setLoanToPay(loan)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Pagar Parcela
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        QUITADO
                      </span>
                    )}
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
              <Banknote className="w-5 h-5 text-emerald-400" />
              Novo Empréstimo
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddLoan} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Título / Finalidade</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Financiamento Imobiliário"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Credor / Banco</label>
                  <input
                    type="text"
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    placeholder="Ex: Caixa"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="50000.00"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Taxa de Juros (% a.m.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="1.2"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Total de Parcelas</label>
                  <input
                    type="number"
                    min={1}
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Salvando...' : 'Salvar Empréstimo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Confirmação de Pagamento de Parcela */}
      {loanToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-sm rounded-[28px] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Pagar Parcela</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tem certeza que deseja marcar a <strong className="text-emerald-400">Parcela {loanToPay.paid_installments + 1} de {loanToPay.total_installments}</strong> do empréstimo <strong className="text-white">&quot;{loanToPay.lender || loanToPay.title}&quot;</strong> como <span className="text-emerald-400 font-bold">PAGA</span>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={payingInstallment}
                onClick={() => setLoanToPay(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={payingInstallment}
                onClick={handleConfirmPayInstallment}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {payingInstallment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  'Sim, Pagar Parcela'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {loanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-sm rounded-[28px] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Excluir Empréstimo</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o empréstimo <strong className="text-white">&quot;{loanToDelete.title}&quot;</strong>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setLoanToDelete(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/25 border border-rose-400/20 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  'Sim, Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
