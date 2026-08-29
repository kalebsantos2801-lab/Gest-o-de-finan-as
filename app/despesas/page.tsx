'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Expense, Account } from '@/types/database';
import { ArrowUpRight, Plus, Trash2, CheckCircle, Clock, AlertCircle, Loader2, Pencil } from 'lucide-react';

export default function ExpensesPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <ExpensesContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function ExpensesContent() {
  const { profile, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const cachedExpenses = memoryCache.get<Expense[]>('expenses_list');
    const cachedAccounts = memoryCache.get<Account[]>('expenses_accounts');
    if (cachedExpenses) setExpenses(cachedExpenses);
    if (cachedAccounts) setAccounts(cachedAccounts);
    if (cachedExpenses) setLoading(false);
  }, []);

  // Form
  const [description, setDescription] = useState('Mercado');
  const [customDescription, setCustomDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [customCategory, setCustomCategory] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [status, setStatus] = useState<'paid' | 'pending'>('pending');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartEdit = (item: Expense) => {
    setEditingExpense(item);
    
    const predefinedDescriptions = [
      "Mercado", "Aluguel", "Conta de Luz", "Conta de Água", 
      "Internet", "Farmácia", "Combustível", "Assinaturas", "Cartão de Crédito"
    ];
    if (predefinedDescriptions.includes(item.description)) {
      setDescription(item.description);
      setCustomDescription('');
    } else {
      setDescription('Outros');
      setCustomDescription(item.description);
    }

    const predefinedCategories = [
      "Alimentação", "Moradia", "Transporte", "Saúde", "Educação", "Lazer", "Serviços"
    ];
    if (predefinedCategories.includes(item.category)) {
      setCategory(item.category);
      setCustomCategory('');
    } else {
      setCategory('Outros');
      setCustomCategory(item.category);
    }

    setAmount(item.amount.toString());
    setDueDate(item.due_date);
    setAccountId(item.account_id || '');
    setIsRecurring(item.is_recurring || false);
    setStatus(item.status);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setEditingExpense(null);
    setDescription('Mercado');
    setCustomDescription('');
    setCategory('Alimentação');
    setCustomCategory('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setAccountId('');
    setIsRecurring(false);
    setStatus('pending');
    setErrorMsg('');
    setModalOpen(true);
  };

  const loadData = useCallback(async () => {
    if (!profile?.family_id) {
      setLoading(false);
      return;
    }
    // Only set loading if there is no cache to keep transitions seamless
    if (!memoryCache.get('expenses_list')) {
      setLoading(true);
    }
    try {
      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .eq('family_id', profile.family_id)
        .order('due_date', { ascending: false });
      if (expData) {
        setExpenses(expData as Expense[]);
        memoryCache.set('expenses_list', expData);
      }

      const { data: accData } = await supabase
        .from('accounts')
        .select('*')
        .eq('family_id', profile.family_id);
      if (accData) {
        setAccounts(accData as Account[]);
        memoryCache.set('expenses_accounts', accData);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isDescriptionEmpty = description === 'Outros' ? !customDescription.trim() : !description.trim();
    const isCategoryEmpty = category === 'Outros' ? !customCategory.trim() : !category.trim();
    const isAmountInvalid = !amount || parseFloat(amount.replace(',', '.')) <= 0;

    if (isDescriptionEmpty && isAmountInvalid) {
      setErrorMsg('Informe a descrição e o valor.');
      return;
    }
    if (isDescriptionEmpty) {
      setErrorMsg('Informe a descrição.');
      return;
    }
    if (isAmountInvalid) {
      setErrorMsg('Informe o valor.');
      return;
    }
    if (isCategoryEmpty) {
      setErrorMsg('Informe a categoria.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const parsedAmount = parseFloat(amount.replace(',', '.'));
      const finalCategory = category === 'Outros' ? customCategory.trim() : category;
      const finalDescription = description === 'Outros' ? customDescription.trim() : description;

      if (editingExpense) {
        // Track previous state for account balance updates
        const oldAmount = Number(editingExpense.amount);
        const oldStatus = editingExpense.status;
        const oldAccountId = editingExpense.account_id;

        const { error } = await supabase
          .from('expenses')
          .update({
            description: finalDescription.trim(),
            amount: parsedAmount,
            category: finalCategory,
            due_date: dueDate,
            account_id: accountId || null,
            is_recurring: isRecurring,
            status,
          })
          .eq('id', editingExpense.id);

        if (error) {
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }

        // 1. Rollback old balance impact if it was paid
        if (oldStatus === 'paid' && oldAccountId) {
          const acc = accounts.find(a => a.id === oldAccountId);
          if (acc) {
            const newBalance = Number(acc.balance) + oldAmount;
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', oldAccountId);
            acc.balance = newBalance;
          }
        }

        // 2. Apply new balance impact if now paid
        if (status === 'paid' && accountId) {
          const acc = accounts.find(a => a.id === accountId);
          if (acc) {
            const newBalance = Number(acc.balance) - parsedAmount;
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId);
            acc.balance = newBalance;
          }
        }
      } else {
        const { error } = await supabase.from('expenses').insert({
          family_id: profile?.family_id,
          user_id: user?.id,
          description: finalDescription.trim(),
          amount: parsedAmount,
          category: finalCategory,
          due_date: dueDate,
          account_id: accountId || null,
          is_recurring: isRecurring,
          status,
        });

        if (error) {
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }

        // Deduct from account balance if already paid and account selected
        if (status === 'paid' && accountId) {
          const acc = accounts.find((a) => a.id === accountId);
          if (acc) {
            await supabase
              .from('accounts')
              .update({ balance: Number(acc.balance) - parsedAmount })
              .eq('id', accountId);
          }
        }
      }

      setDescription('Mercado');
      setCustomDescription('');
      setCategory('Alimentação');
      setCustomCategory('');
      setAmount('');
      setErrorMsg('');
      setModalOpen(false);
      setEditingExpense(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar despesa');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (item: Expense) => {
    const newStatus = item.status === 'paid' ? 'pending' : 'paid';
    await supabase.from('expenses').update({ status: newStatus }).eq('id', item.id);
    setExpenses((prev) =>
      prev.map((e) => (e.id === item.id ? { ...e, status: newStatus } : e))
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta despesa?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses((prev) => prev.filter((i) => i.id !== id));
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const paidExpenses = expenses.filter((e) => e.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const pendingExpenses = expenses.filter((e) => e.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              Gestão de Despesas & Contas a Pagar
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Controle detalhado de gastos familiares com persistência segura no Supabase
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Despesas</span>
              <span className="text-base sm:text-lg font-extrabold text-rose-400 font-mono">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              id="btn-new-expense"
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/25 border border-rose-400/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Despesa</span>
            </button>
          </div>
        </div>

        {/* Status mini bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div className="p-5 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-[24px] flex items-center justify-between shadow-xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl border border-emerald-500/25 shadow-sm">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Já Pagas</p>
                <p className="text-xl font-extrabold text-white font-mono tracking-tight">
                  R$ {paidExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{expenses.filter(e => e.status === 'paid').length} contas</span>
          </div>

          <div className="p-5 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-[24px] flex items-center justify-between shadow-xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl border border-amber-500/25 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Pendentes / A Vencer</p>
                <p className="text-xl font-extrabold text-amber-400 font-mono tracking-tight">
                  R$ {pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{expenses.filter(e => e.status === 'pending').length} contas</span>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center text-xs text-slate-400">
            <span className="font-bold text-white">{expenses.length} Despesas Registradas</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-indigo-300 font-medium">RLS por Família</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
              <span>Carregando despesas...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ArrowUpRight className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">Nenhuma despesa cadastrada</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cadastre as contas da sua família para acompanhar vencimentos e status de pagamento.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/25 border border-rose-400/20"
              >
                + Cadastrar Primeira Despesa
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {expenses.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition">
                  <div className="flex items-start sm:items-center gap-3.5 w-full sm:w-auto">
                    <button
                      onClick={() => toggleStatus(item)}
                      title={item.status === 'paid' ? 'Marcar como pendente' : 'Marcar como paga'}
                      className={`p-2.5 rounded-2xl transition border shrink-0 mt-0.5 sm:mt-0 ${
                        item.status === 'paid'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/40 hover:text-amber-300'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate max-w-[220px] sm:max-w-none">{item.description}</h4>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px]">
                          {item.category}
                        </span>
                        <span>• Vence em: {new Date(item.due_date).toLocaleDateString('pt-BR')}</span>
                        <span className={`text-[10px] font-bold ${item.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          • {item.status === 'paid' ? 'PAGA' : 'PENDENTE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-white/[0.03] sm:border-t-0">
                    <span className="text-sm sm:text-base font-extrabold text-rose-400 font-mono">
                      - R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-2 text-slate-400 hover:text-indigo-400 transition rounded-xl hover:bg-white/5 active:scale-95 cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 transition rounded-xl hover:bg-white/5 active:scale-95 cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Nova Despesa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-rose-400" />
              {editingExpense ? 'Editar Despesa Existente' : 'Cadastrar Nova Despesa Real'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Descrição</label>
                <select
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="Mercado">Mercado / Supermercado</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Conta de Luz">Conta de Luz</option>
                  <option value="Conta de Água">Conta de Água</option>
                  <option value="Internet">Internet / TV</option>
                  <option value="Farmácia">Farmácia</option>
                  <option value="Combustível">Combustível</option>
                  <option value="Assinaturas">Assinaturas (Netflix, etc)</option>
                  <option value="Cartão de Crédito">Fatura Cartão de Crédito</option>
                  <option value="Outros">Outra (Digitar)</option>
                </select>
                {description === 'Outros' && (
                  <input
                    type="text"
                    required
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Digite a descrição da despesa"
                    className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    <option value="Alimentação">Alimentação</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Outros">Outra (Digitar)</option>
                  </select>
                  {category === 'Outros' && (
                    <input
                      type="text"
                      placeholder="Digite a categoria"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      required
                      className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Vencimento</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'paid' | 'pending')}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Paga</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Conta Bancária (Opcional)</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Nenhuma / Outra</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-rec-exp"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-white/5 border-white/20 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="chk-rec-exp" className="text-xs text-slate-300">
                  Despesa recorrente mensal
                </label>
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
                  {submitting ? 'Salvando no Supabase...' : editingExpense ? 'Salvar Alterações' : 'Salvar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
