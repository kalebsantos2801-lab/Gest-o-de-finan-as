'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { Account } from '@/types/database';
import { Wallet, Plus, Trash2, Edit3, Building, Loader2, AlertCircle } from 'lucide-react';

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
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadAccounts = useCallback(async () => {
    if (!profile?.family_id) {
      setLoading(false);
      return;
    }
    // Only set loading if there is no cache to keep transitions seamless
    if (!memoryCache.get('accounts_list')) {
      setLoading(true);
    }
    try {
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('family_id', profile.family_id)
        .order('created_at', { ascending: false });
      if (data) {
        setAccounts(data as Account[]);
        memoryCache.set('accounts_list', data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Informe o nome da conta.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const parsedBalance = parseFloat(balance.replace(',', '.') || '0');
      const { error } = await supabase.from('accounts').insert({
        family_id: profile?.family_id,
        user_id: user?.id,
        name: name.trim(),
        type,
        balance: parsedBalance,
        institution: institution.trim() || 'Banco',
        color,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setName('');
        setBalance('');
        setInstitution('');
        setModalOpen(false);
        await loadAccounts();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar conta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta conta bancária?')) return;
    await supabase.from('accounts').delete().eq('id', id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
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
              Controle dos saldos reais de contas correntes, poupanças e investimentos da família
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Saldo Total</span>
              <span className="text-base sm:text-lg font-extrabold text-white font-mono">
                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setModalOpen(true)}
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
              Cadastre suas contas bancárias reais (ex: Itaú, Nubank, Bradesco, Carteira Física) para acompanhar o saldo consolidado.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20"
            >
              + Cadastrar Primeira Conta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-white/[0.04] hover:bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl transition">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shrink-0 shadow-md ring-2 ring-white/10" style={{ backgroundColor: acc.color || '#3b82f6' }} />
                    <div>
                      <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                      <span className="text-[11px] text-slate-400">{acc.institution || 'Banco'}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
                    {acc.type === 'checking' ? 'Corrente' : acc.type === 'savings' ? 'Poupança' : acc.type === 'investment' ? 'Investimento' : 'Carteira'}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Saldo Atual</span>
                    <span className="text-xl font-extrabold text-white font-mono">
                      R$ {Number(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-white/5"
                    title="Excluir Conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Nova Conta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-400" />
              Cadastrar Nova Conta
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddAccount} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Nome da Conta</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank Principal / Conta Conjunta"
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
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Salvando no Supabase...' : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
