'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Income, Account } from '@/types/database';
import { ArrowDownLeft, Plus, Trash2, Calendar, CheckCircle2, AlertCircle, Loader2, Pencil } from 'lucide-react';

export default function IncomePage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <IncomeContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function IncomeContent() {
  const { profile, user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  useEffect(() => {
    const cachedIncomes = memoryCache.get<Income[]>('income_list');
    const cachedAccounts = memoryCache.get<Account[]>('income_accounts');
    if (cachedIncomes) setIncomes(cachedIncomes);
    if (cachedAccounts) setAccounts(cachedAccounts);
    if (cachedIncomes) setLoading(false);
  }, []);

  // Form state
  const [description, setDescription] = useState('Salário');
  const [customDescription, setCustomDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salário');
  const [customCategory, setCustomCategory] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartEdit = (item: Income) => {
    setEditingIncome(item);
    
    const predefinedDescriptions = [
      "Salário", "Adiantamento", "Freelance", "Rendimento de Investimento",
      "Venda", "Cashback", "Outros"
    ];
    if (predefinedDescriptions.includes(item.description)) {
      setDescription(item.description);
      setCustomDescription('');
    } else {
      setDescription('Outros');
      setCustomDescription(item.description);
    }

    const predefinedCategories = [
      "Salário", "Investimentos", "Freelance", "Presentes", "Vendas", "Outros"
    ];
    if (predefinedCategories.includes(item.category)) {
      setCategory(item.category);
      setCustomCategory('');
    } else {
      setCategory('Outros');
      setCustomCategory(item.category);
    }

    setAmount(item.amount.toString());
    setReceivedAt(item.received_at);
    setAccountId(item.account_id || '');
    setIsRecurring(item.is_recurring || false);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setEditingIncome(null);
    setDescription('Salário');
    setCustomDescription('');
    setCategory('Salário');
    setCustomCategory('');
    setAmount('');
    setReceivedAt(new Date().toISOString().split('T')[0]);
    setAccountId(accounts.length > 0 ? accounts[0].id : '');
    setIsRecurring(false);
    setErrorMsg('');
    setModalOpen(true);
  };

  const loadData = useCallback(async () => {
    if (!profile?.family_id) {
      setLoading(false);
      return;
    }
    // Only set loading if there is no cache
    if (!memoryCache.get('income_list')) {
      setLoading(true);
    }
    try {
      const { data: incData } = await supabase
        .from('income')
        .select('*')
        .eq('family_id', profile.family_id)
        .order('received_at', { ascending: false });
      if (incData) {
        setIncomes(incData as Income[]);
        memoryCache.set('income_list', incData);
      }

      const { data: accData } = await supabase
        .from('accounts')
        .select('*')
        .eq('family_id', profile.family_id);
      if (accData) {
        setAccounts(accData as Account[]);
        memoryCache.set('income_accounts', accData);
        if (accData.length > 0 && !accountId) setAccountId(accData[0].id);
      }
    } catch (err) {
      console.error('Error fetching income:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id, accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddIncome = async (e: React.FormEvent) => {
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
      
      if (editingIncome) {
        // Track previous state for account balance updates
        const oldAmount = Number(editingIncome.amount);
        const oldAccountId = editingIncome.account_id;

        const { error } = await supabase
          .from('income')
          .update({
            description: finalDescription.trim(),
            amount: parsedAmount,
            category: finalCategory,
            received_at: receivedAt,
            account_id: accountId || null,
            is_recurring: isRecurring,
          })
          .eq('id', editingIncome.id);

        if (error) {
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }

        // 1. Rollback old balance impact (since income adds balance, rollback subtracts it)
        if (oldAccountId) {
          const acc = accounts.find(a => a.id === oldAccountId);
          if (acc) {
            const newBalance = Number(acc.balance) - oldAmount;
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', oldAccountId);
            acc.balance = newBalance;
          }
        }

        // 2. Apply new balance impact (adds new balance)
        if (accountId) {
          const acc = accounts.find(a => a.id === accountId);
          if (acc) {
            const newBalance = Number(acc.balance) + parsedAmount;
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId);
            acc.balance = newBalance;
          }
        }
      } else {
        const { error } = await supabase.from('income').insert({
          family_id: profile?.family_id,
          user_id: user?.id,
          description: finalDescription.trim(),
          amount: parsedAmount,
          category: finalCategory,
          received_at: receivedAt,
          account_id: accountId || null,
          is_recurring: isRecurring,
          status: 'received',
        });

        if (error) {
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }

        // Also update account balance if selected
        if (accountId) {
          const acc = accounts.find((a) => a.id === accountId);
          if (acc) {
            await supabase
              .from('accounts')
              .update({ balance: Number(acc.balance) + parsedAmount })
              .eq('id', accountId);
          }
        }
      }

      setDescription('Salário');
      setCustomDescription('');
      setCategory('Salário');
      setCustomCategory('');
      setAmount('');
      setErrorMsg('');
      setModalOpen(false);
      setEditingIncome(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar entrada');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta entrada?')) return;
    await supabase.from('income').delete().eq('id', id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const totalIncomes = incomes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              Gestão de Entradas e Receitas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Controle de salários, rendimentos e receitas da família no Supabase
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Recebido</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">
                R$ {totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              id="btn-new-income"
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Entrada</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center text-xs text-slate-400">
            <span className="font-bold text-white">{incomes.length} Entradas Registradas</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-indigo-300 font-medium">Sincronizado com RLS</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Carregando receitas do Supabase...</span>
            </div>
          ) : incomes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ArrowDownLeft className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">Nenhuma entrada cadastrada</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Registre os rendimentos reais da sua família para alimentar os gráficos e balanço.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20"
              >
                + Cadastrar Primeira Entrada
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {incomes.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition">
                  <div className="flex items-start sm:items-center gap-3.5 w-full sm:w-auto">
                    <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl text-emerald-400 shadow-sm shrink-0">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate max-w-[220px] sm:max-w-none">{item.description}</h4>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px]">
                          {item.category}
                        </span>
                        <span>• Data: {new Date(item.received_at).toLocaleDateString('pt-BR')}</span>
                        {item.is_recurring && (
                          <span className="text-indigo-400 text-[10px] font-semibold">• Recorrente</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-white/[0.03] sm:border-t-0">
                    <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono">
                      + R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {/* Modal Nova Entrada */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
              {editingIncome ? 'Editar Entrada Existente' : 'Cadastrar Nova Entrada Real'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddIncome} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Descrição</label>
                <select
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="Salário">Salário</option>
                  <option value="Adiantamento">Adiantamento</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Rendimento de Investimento">Rendimento de Investimento</option>
                  <option value="Venda">Venda de Produto/Serviço</option>
                  <option value="Cashback">Cashback / Reembolso</option>
                  <option value="Outros">Outra (Digitar)</option>
                </select>
                {description === 'Outros' && (
                  <input
                    type="text"
                    required
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Digite a descrição da entrada"
                    className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="Salário">Salário</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Benefícios">Benefícios</option>
                    <option value="Vendas">Vendas</option>
                    <option value="Outros">Outra (Digitar)</option>
                  </select>
                  {category === 'Outros' && (
                    <input
                      type="text"
                      placeholder="Digite a categoria"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      required
                      className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Data de Recebimento</label>
                  <input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Conta de Destino</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Nenhuma / Outra</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-rec"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-white/5 border-white/20 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="chk-rec" className="text-xs text-slate-300">
                  Esta entrada é recorrente mensal
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
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Salvando no Supabase...' : editingIncome ? 'Salvar Alterações' : 'Salvar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
