'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Account } from '@/types/database';
import {
  parseSalaryInfo,
  formatInstitutionWithTags,
  calculateSavingsYields,
  SAVINGS_MONTHLY_RATE,
  SAVINGS_ANNUAL_RATE,
  getCleanInstitution,
} from '@/lib/accountUtils';
import {
  Wallet,
  Plus,
  Trash2,
  Edit3,
  Building,
  Loader2,
  AlertCircle,
  Banknote,
  Zap,
  TrendingUp,
  Sparkles,
  PiggyBank,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function AccountsPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <AccountsContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function AccountsContent() {
  const { profile, user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>(() => memoryCache.get<Account[]>('accounts_list') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('accounts_list'));
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<'checking' | 'savings' | 'investment' | 'cash' | 'other'>('checking');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [color, setColor] = useState('#3b82f6');
  
  // Salary Account Optional State
  const [isSalaryAccount, setIsSalaryAccount] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryDay, setSalaryDay] = useState<number>(5);
  const [autoCreditSalary, setAutoCreditSalary] = useState(true);

  // Quick salary credit modal state
  const [salaryCreditAccount, setSalaryCreditAccount] = useState<Account | null>(null);
  const [creditingSalary, setCreditingSalary] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!profile?.family_id && !user?.id) {
      setLoading(false);
      return;
    }
    if (!memoryCache.get('accounts_list')) {
      setLoading(true);
    }
    try {
      const query = user?.id
        ? (profile?.family_id
            ? supabase.from('accounts').select('*').or(`user_id.eq.${user.id},and(family_id.eq.${profile.family_id},user_id.is.null)`).order('created_at', { ascending: false })
            : supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }))
        : supabase.from('accounts').select('*').eq('family_id', profile?.family_id!).order('created_at', { ascending: false });

      const { data } = await query;
      if (data) {
        setAccounts(data as Account[]);
        memoryCache.set('accounts_list', data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id, user?.id]);

  useEffect(() => {
    const hasCache = memoryCache.get('accounts_list');
    if (hasCache) {
      // Defer background revalidation by 400ms to allow route transitions to complete with 0% CPU thread blocking
      const timer = setTimeout(() => {
        loadAccounts();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      loadAccounts();
    }
  }, [loadAccounts]);

  const handleOpenNewModal = () => {
    setEditingAccountId(null);
    setName('');
    setType('checking');
    setBalance('');
    setInstitution('');
    setColor('#3b82f6');
    setIsSalaryAccount(false);
    setSalaryAmount('');
    setSalaryDay(5);
    setAutoCreditSalary(true);

    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (acc: Account) => {
    setEditingAccountId(acc.id);
    setName(acc.name || '');
    setType((acc.type as any) || 'checking');
    setBalance(acc.balance !== undefined && acc.balance !== null ? String(acc.balance) : '');
    setColor(acc.color || '#3b82f6');

    const salaryInfo = parseSalaryInfo(acc);
    setInstitution(salaryInfo.cleanInstitution);
    setIsSalaryAccount(salaryInfo.isSalaryAccount);
    setSalaryAmount(salaryInfo.salaryAmount > 0 ? String(salaryInfo.salaryAmount) : '');
    setSalaryDay(salaryInfo.salaryDay || 5);
    setAutoCreditSalary(salaryInfo.autoCredit);

    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Informe o nome da conta.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const parsedBalance = parseFloat(balance.replace(',', '.') || '0');
      const parsedSalaryAmount = parseFloat(salaryAmount.replace(',', '.') || '0');

      const formattedInstitution = formatInstitutionWithTags(
        institution,
        {
          isSalaryAccount,
          salaryAmount: parsedSalaryAmount,
          salaryDay,
          autoCredit: autoCreditSalary,
        }
      );

      // Try updating/inserting with native schema properties first
      const fullPayload = {
        name: name.trim(),
        type,
        balance: parsedBalance,
        institution: formattedInstitution,
        color,
        is_salary_account: isSalaryAccount,
        salary_amount: parsedSalaryAmount,
        salary_day: salaryDay,
        auto_credit_salary: autoCreditSalary,
      };

      const fallbackPayload = {
        name: name.trim(),
        type,
        balance: parsedBalance,
        institution: formattedInstitution,
        color,
      };

      if (editingAccountId) {
        // Update existing account
        let { error } = await supabase.from('accounts').update(fullPayload).eq('id', editingAccountId);

        if (error && error.message.includes('column')) {
          // Fallback if Postgres schema doesn't have custom columns
          const res = await supabase.from('accounts').update(fallbackPayload).eq('id', editingAccountId);
          error = res.error;
        }

        if (error) {
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }
      } else {
        // Insert new account
        let { error } = await supabase.from('accounts').insert({
          family_id: profile?.family_id,
          user_id: user?.id,
          ...fullPayload,
        }).select().single();

        if (error && error.message.includes('column')) {
          const res = await supabase.from('accounts').insert({
            family_id: profile?.family_id,
            user_id: user?.id,
            ...fallbackPayload,
          }).select().single();
          error = res.error;
        }

        if (error) {
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }
      }

      setModalOpen(false);
      memoryCache.delete('accounts_list');
      memoryCache.delete('income_accounts');
      memoryCache.delete('expenses_accounts');
      await loadAccounts();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar conta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSalaryCredit = async () => {
    if (!salaryCreditAccount) return;
    setCreditingSalary(true);

    try {
      const salaryInfo = parseSalaryInfo(salaryCreditAccount);
      if (salaryInfo.salaryAmount <= 0) {
        alert('Defina um valor de salário válido para esta conta.');
        setCreditingSalary(false);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const descName = `Salário - ${salaryCreditAccount.name}`;

      // 1. Insert income entry in income table
      const { error: incError } = await supabase.from('income').insert({
        family_id: profile?.family_id,
        user_id: user?.id,
        description: descName,
        amount: salaryInfo.salaryAmount,
        category: 'Salário',
        received_at: todayStr,
        account_id: salaryCreditAccount.id,
        is_recurring: true,
        status: 'received',
      });

      if (incError) {
        alert('Erro ao lançar entrada de salário: ' + incError.message);
        setCreditingSalary(false);
        return;
      }

      // 2. Update account balance directly
      const newBalance = Number(salaryCreditAccount.balance || 0) + salaryInfo.salaryAmount;
      const { error: accError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', salaryCreditAccount.id);

      if (accError) {
        alert('Erro ao atualizar saldo da conta: ' + accError.message);
        setCreditingSalary(false);
        return;
      }

      // Invalidate caches
      memoryCache.delete('accounts_list');
      memoryCache.delete('income_list');
      memoryCache.delete('income_accounts');
      memoryCache.delete('dashboard_incomes');
      memoryCache.delete('dashboard_expenses');

      setSalaryCreditAccount(null);
      await loadAccounts();
    } catch (err: unknown) {
      console.error('Error crediting salary:', err);
      alert('Erro ao creditar salário na conta.');
    } finally {
      setCreditingSalary(false);
    }
  };

  const handleDelete = async (id: string, accName: string) => {
    if (!window.confirm(`Deseja realmente excluir a conta "${accName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir conta: ' + error.message);
        return;
      }
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      memoryCache.set('accounts_list', null);
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Erro ao excluir conta.');
    }
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Wallet className="w-5 h-5" />
              </div>
              Contas Bancárias & Carteiras
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Controle dos saldos reais de contas correntes, poupanças e rendimento em tempo real
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Saldo Total</span>
              <span className="text-base sm:text-lg font-extrabold text-white font-mono">
                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta</span>
            </button>
          </div>
        </div>



        {/* Accounts Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px]">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Carregando contas do Supabase...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-12 text-center space-y-3 shadow-2xl">
            <Building className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Nenhuma conta cadastrada</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre suas contas bancárias reais (ex: Itaú, Nubank, Bradesco, Carteira Física, Poupança) para acompanhar o saldo e rendimentos.
            </p>
            <button
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20"
            >
              + Cadastrar Primeira Conta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((acc) => {
              const salaryInfo = parseSalaryInfo(acc);

              return (
                <div key={acc.id} className="bg-white/[0.04] hover:bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl transition flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shrink-0 shadow-md ring-2 ring-white/10" style={{ backgroundColor: acc.color || '#3b82f6' }} />
                        <div>
                          <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                          <span className="text-[11px] text-slate-400">{salaryInfo.cleanInstitution || 'Banco'}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
                        {acc.type === 'checking' ? 'Corrente' : acc.type === 'savings' ? 'Poupança' : acc.type === 'investment' ? 'Investimento' : 'Carteira'}
                      </span>
                    </div>

                    {salaryInfo.isSalaryAccount && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Conta Salário</span>
                            <span className="text-xs font-bold text-white font-mono">
                              R$ {salaryInfo.salaryAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400 font-normal">(Dia {salaryInfo.salaryDay})</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSalaryCreditAccount(acc)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl transition border border-emerald-400/20 shadow-sm flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                          title="Lançar Salário no Saldo"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Lançar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Saldo Atual</span>
                      <span className="text-xl font-extrabold text-white font-mono">
                        R$ {Number(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(acc)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 transition rounded-lg hover:bg-white/5 cursor-pointer"
                        title="Editar Conta"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-white/5 cursor-pointer"
                        title="Excluir Conta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Nova / Editar Conta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-400" />
              {editingAccountId ? 'Editar Conta Bancária' : 'Cadastrar Nova Conta'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Nome da Conta</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank Principal / Poupança Itaú"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Instituição</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex: Nubank / Itaú"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimentos</option>
                    <option value="cash">Dinheiro em Espécie</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Cor de Identificação</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 px-1 py-1 bg-white/[0.04] border border-white/10 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              {type === 'savings' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300">
                  <PiggyBank className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold block text-white">Rendimento Automático da Poupança</span>
                    <span className="text-[11px] text-slate-300">
                      Rendimento mensal de 0,50% a.m. (100% Isento de Imposto de Renda e IOF) calculado em tempo real.
                    </span>
                  </div>
                </div>
              )}

              {/* Configuração de Conta Salário (Opcional) */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isSalaryAccount}
                    onChange={(e) => setIsSalaryAccount(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    Conta Salário (Opcional - Gerar Salário e Crédito)
                  </span>
                </label>

                {isSalaryAccount && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-emerald-300 ml-1">Valor do Salário (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salaryAmount}
                          onChange={(e) => setSalaryAmount(e.target.value)}
                          placeholder="Ex: 4500.00"
                          className="w-full px-3 py-2 bg-slate-900/90 border border-emerald-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-emerald-300 ml-1">Dia do Crédito</label>
                        <select
                          value={salaryDay}
                          onChange={(e) => setSalaryDay(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          {[1, 5, 10, 15, 20, 25, 30].map((d) => (
                            <option key={d} value={d}>Dia {d} do mês</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreditSalary}
                        onChange={(e) => setAutoCreditSalary(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-emerald-500/30 bg-slate-900 text-emerald-500 cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-300">
                        Vincular à aba Entradas para lançamento rápido do salário
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {submitting ? 'Salvando no Supabase...' : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Lançamento de Salário */}
      {salaryCreditAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-sm rounded-[28px] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <Banknote className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Lançar Crédito de Salário</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Deseja lançar a receita de salário no valor de <strong className="text-emerald-400 font-mono">R$ {parseSalaryInfo(salaryCreditAccount).salaryAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> na conta <strong className="text-white">&quot;{salaryCreditAccount.name}&quot;</strong>?
                <span className="block mt-1.5 text-[11px] text-slate-400">
                  O valor será creditado no saldo da conta e registrado na aba de Entradas.
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={creditingSalary}
                onClick={() => setSalaryCreditAccount(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={creditingSalary}
                onClick={handleConfirmSalaryCredit}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {creditingSalary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Lançando...</span>
                  </>
                ) : (
                  'Sim, Lançar Salário'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
