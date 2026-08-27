'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Profile, TrialPeriod, ReleaseRequest, AuditLog } from '@/types/database';
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  Ban, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Search, 
  Plus, 
  RefreshCw,
  Loader2,
  Calendar,
  Lock
} from 'lucide-react';

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}

function AdminDashboardContent() {
  const { user, profile, serverTime } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'audit'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [trialPeriods, setTrialPeriods] = useState<Record<string, TrialPeriod>>({});
  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load all profiles
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profData) setUsers(profData as Profile[]);

      // 2. Load trial periods
      const { data: trialData } = await supabase
        .from('trial_periods')
        .select('*');
      if (trialData) {
        const map: Record<string, TrialPeriod> = {};
        trialData.forEach((t: TrialPeriod) => {
          map[t.family_id] = t;
        });
        setTrialPeriods(map);
      }

      // 3. Load Release Requests
      const { data: reqData } = await supabase
        .from('release_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (reqData) setRequests(reqData as ReleaseRequest[]);

      // 4. Load Audit Logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (auditData) setAuditLogs(auditData as AuditLog[]);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Extend Trial for a family (e.g. +30 days)
  const handleExtendTrial = async (familyId: string, daysToAdd: number = 30) => {
    try {
      const current = trialPeriods[familyId];
      const baseDate = current?.trial_expires_at ? new Date(current.trial_expires_at) : new Date();
      const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('trial_periods')
        .upsert({
          family_id: familyId,
          trial_expires_at: newExpiry,
          is_blocked: false,
        });

      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'EXTEND_TRIAL',
        target_family_id: familyId,
        details: { daysAdded: daysToAdd, newExpiry },
      });

      await loadAdminData();
    } catch (err) {
      console.error('Error extending trial:', err);
    }
  };

  // Toggle Block/Unblock for a family
  const handleToggleBlock = async (familyId: string, currentBlocked: boolean) => {
    try {
      await supabase
        .from('trial_periods')
        .update({ is_blocked: !currentBlocked })
        .eq('family_id', familyId);

      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: currentBlocked ? 'UNBLOCK_FAMILY' : 'BLOCK_FAMILY',
        target_family_id: familyId,
        details: { blocked: !currentBlocked },
      });

      await loadAdminData();
    } catch (err) {
      console.error('Error toggling block:', err);
    }
  };

  // Approve / Reject Release Request
  const handleRequestAction = async (requestId: string, familyId: string, action: 'approved' | 'rejected') => {
    try {
      await supabase
        .from('release_requests')
        .update({
          status: action,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', requestId);

      if (action === 'approved') {
        // Extend trial by 365 days
        await handleExtendTrial(familyId, 365);
      }

      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: action === 'approved' ? 'APPROVE_RELEASE' : 'REJECT_RELEASE',
        target_family_id: familyId,
        details: { requestId },
      });

      await loadAdminData();
    } catch (err) {
      console.error('Error resolving request:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-indigo-500/30 rounded-[28px] p-6 sm:p-7 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-indigo-500/30">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Painel SuperAdmin Exclusivo
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Controle Geral do Sistema & Supabase Auth
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gerencie usuários reais, controle períodos de teste, aprove solicitações e audite acessos
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Atualizar Painel</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 text-sm gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários & Licenças ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Solicitações de Liberação ({requests.filter(r => r.status === 'pending').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Logs de Auditoria ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab 1: Users & Trial Periods */}
        {activeTab === 'users' && (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <span className="text-xs text-slate-400">Total de cadastros reais: <strong className="text-slate-200">{users.length}</strong></span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Carregando usuários do Supabase...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhum usuário cadastrado encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-slate-400 font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Usuário</th>
                      <th className="p-3.5">Papel</th>
                      <th className="p-3.5">Expiração do Teste</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações de SuperAdmin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const familyId = u.family_id || '';
                      const trial = familyId ? trialPeriods[familyId] : undefined;
                      const isExpired = trial?.trial_expires_at ? new Date(trial.trial_expires_at).getTime() < serverTime.getTime() : false;
                      const isBlocked = trial?.is_blocked;

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.03] transition">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-100">{u.full_name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] uppercase font-bold">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {trial?.trial_expires_at
                              ? new Date(trial.trial_expires_at).toLocaleDateString('pt-BR')
                              : 'Sem registro'}
                          </td>
                          <td className="p-3.5">
                            {isBlocked ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                BLOQUEADO
                              </span>
                            ) : isExpired ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                EXPIRADO
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                ATIVO
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => familyId && handleExtendTrial(familyId, 30)}
                              disabled={!familyId}
                              title="Adicionar +30 dias de teste"
                              className="px-2.5 py-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 rounded-xl text-[11px] font-bold transition disabled:opacity-30"
                            >
                              +30 Dias
                            </button>
                            <button
                              onClick={() => familyId && handleToggleBlock(familyId, !!isBlocked)}
                              disabled={!familyId}
                              title={isBlocked ? 'Desbloquear família' : 'Bloquear família'}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition disabled:opacity-30 ${
                                isBlocked
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                              }`}
                            >
                              {isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Release Requests */}
        {activeTab === 'requests' && (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-extrabold text-white">Solicitações de Acesso dos Usuários</h3>

            {loading ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Carregando solicitações...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhuma solicitação de liberação registrada.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {requests.map((req) => (
                  <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-xs">{req.user_email}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{req.reason}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Enviado em: {new Date(req.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRequestAction(req.id, req.family_id, 'approved')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 active:scale-[0.98]"
                        >
                          Aprovar (+1 Ano)
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, req.family_id, 'rejected')}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/25 border border-rose-400/20 active:scale-[0.98]"
                        >
                          Recusar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-extrabold text-white">Logs de Auditoria de SuperAdmin</h3>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhum evento registrado ainda.
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/10 flex justify-between items-center transition">
                    <div>
                      <span className="text-indigo-400 font-bold mr-2">[{log.action}]</span>
                      <span className="text-slate-300">Família: {log.target_family_id || 'N/A'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
