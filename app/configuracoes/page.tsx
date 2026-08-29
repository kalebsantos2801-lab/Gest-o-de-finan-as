'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Profile, NotificationSettings, PushSubscriptionRecord } from '@/types/database';
import { 
  requestAndSavePushSubscription, 
  triggerNativeNotification, 
  getNotificationPermission, 
  ensureNotificationSettings,
  playBellChime
} from '@/lib/push-notifications';
import { 
  Users, 
  Shield, 
  Clock, 
  Plus, 
  Key, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Bell,
  Smartphone,
  Sparkles,
  Volume2,
  Check,
  Save,
  Moon
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <SettingsContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user, profile, family, trial, isTrialExpired, serverTime, requestTrialRelease } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Push & Notification settings state
  const [pushPermission, setPushPermission] = useState<string>('default');
  const [devices, setDevices] = useState<PushSubscriptionRecord[]>([]);
  const [loadingPush, setLoadingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState('');
  
  const [notifSettings, setNotifSettings] = useState<Partial<NotificationSettings>>({
    bills_enabled: true,
    cards_enabled: true,
    invoices_enabled: true,
    installments_enabled: true,
    loans_enabled: true,
    budget_enabled: true,
    goals_enabled: true,
    trial_enabled: true,
    advance_days: 3,
    quiet_hours_start: '21:00',
    quiet_hours_end: '08:00',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Request release form
  const [releaseReason, setReleaseReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const daysRemaining = trial?.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(trial.trial_expires_at).getTime() - serverTime.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isTrialActive = !isTrialExpired && daysRemaining > 0;

  const loadPushData = useCallback(async () => {
    if (!user) return;
    setPushPermission(getNotificationPermission());

    // Fetch user devices
    const { data: devData } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);
    if (devData) setDevices(devData as PushSubscriptionRecord[]);

    // Fetch user settings
    const currentSettings = await ensureNotificationSettings(user.id, profile?.family_id);
    if (currentSettings) setNotifSettings(currentSettings);
  }, [user, profile?.family_id]);

  const loadMembers = useCallback(async () => {
    if (!profile?.family_id) {
      setLoadingMembers(false);
      return;
    }
    setLoadingMembers(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', profile.family_id);
      if (data) setMembers(data as Profile[]);
    } catch (err) {
      console.error('Error fetching family members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [profile?.family_id]);

  useEffect(() => {
    loadMembers();
    loadPushData();
  }, [loadMembers, loadPushData]);

  const handleEnablePush = async () => {
    if (!user) return;
    setLoadingPush(true);
    setPushStatusMsg('');
    try {
      const result = await requestAndSavePushSubscription(user.id, profile?.family_id || family?.id, true);
      setPushPermission(result.permission);
      if (result.success) {
        setPushStatusMsg('✅ Notificações Push ativadas com sucesso neste dispositivo!');
        await loadPushData();
      } else {
        setPushStatusMsg(`⚠️ ${result.error || 'Não foi possível ativar as notificações'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao ativar';
      setPushStatusMsg(`⚠️ ${msg}`);
    } finally {
      setLoadingPush(false);
    }
  };

  const handleTestPush = async () => {
    // Play bell sound immediately in-app to satisfy "test sound" request
    playBellChime();
    await triggerNativeNotification({
      title: '🔔 Notificação de Teste - Finanças Familiar',
      body: 'O som nativo e o alerta de vencimento estão funcionando perfeitamente no seu aparelho!',
      url: '/notificacoes',
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSettings(true);
    setSaveSuccessMsg('');
    try {
      await supabase.from('notification_settings').upsert({
        user_id: user.id,
        family_id: profile?.family_id || family?.id || null,
        ...notifSettings,
        updated_at: new Date().toISOString(),
      });
      setSaveSuccessMsg('Preferências de notificação salvas com sucesso!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setRequestLoading(true);
    setRequestError(null);
    try {
      const reason = releaseReason.trim() || 'Solicitação de extensão ou ativação de plano';
      const res = await requestTrialRelease(reason);
      if (res.success) {
        setRequestSent(true);
        setReleaseReason('');
      } else {
        setRequestError(res.error || 'Erro ao enviar solicitação ao SuperAdmin.');
      }
    } catch (err: unknown) {
      console.error('Error requesting release:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao enviar solicitação';
      setRequestError(msg);
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              Configurações da Família & Assinatura
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gerenciamento de membros, dados do grupo familiar e status do período de teste
            </p>
          </div>
        </div>

        {/* Notification Preferences & Push Devices Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 sm:p-7 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-2xl">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Notificações Push Reais no Celular
                </h3>
                <p className="text-xs text-slate-400">
                  Configure alertas nativos de faturas, contas, parcelas e empréstimos com som de sino
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPush}
                className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Testar Som e Push</span>
              </button>

              <button
                type="button"
                onClick={handleEnablePush}
                disabled={loadingPush}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{loadingPush ? 'Ativando...' : 'Ativar neste Celular'}</span>
              </button>
            </div>
          </div>

          {pushStatusMsg && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
              {pushStatusMsg}
            </div>
          )}

          {/* Registered devices */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              Dispositivos Conectados ({devices.length})
            </h4>
            {devices.length === 0 ? (
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl text-xs text-slate-400 text-center">
                Nenhum dispositivo registrado ainda. Clique em &quot;Ativar neste Celular&quot; para autorizar alertas nativos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {devices.map((d) => (
                  <div key={d.id} className="p-3.5 bg-white/[0.02] border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{d.device_type}</p>
                        <p className="text-[10px] text-slate-400">Ativo para notificações nativas</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      ATIVO
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notification Preferences Form */}
          <form onSubmit={handleSaveSettings} className="space-y-5 pt-3 border-t border-white/10">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Categorias de Notificação Desejadas
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: 'bills_enabled', label: 'Contas a Vencer / Vencidas', icon: '💳' },
                { key: 'cards_enabled', label: 'Cartões de Crédito', icon: '🪪' },
                { key: 'invoices_enabled', label: 'Faturas Próximas / Abertas', icon: '📄' },
                { key: 'installments_enabled', label: 'Parcelas de Compras', icon: '📊' },
                { key: 'loans_enabled', label: 'Empréstimos', icon: '🏦' },
                { key: 'budget_enabled', label: 'Alerta de Orçamento (80%+ / 100%+)', icon: '⚠️' },
                { key: 'goals_enabled', label: 'Progresso de Metas', icon: '🎯' },
                { key: 'trial_enabled', label: 'Avisos de Período de Teste', icon: '⏳' },
              ].map((item) => {
                const isChecked = Boolean(notifSettings[item.key as keyof NotificationSettings]);
                return (
                  <label
                    key={item.key}
                    className={`p-3.5 rounded-2xl border text-xs font-semibold cursor-pointer transition flex items-center justify-between ${
                      isChecked
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-inner'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setNotifSettings((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-white/20 bg-slate-900 text-indigo-600 focus:ring-indigo-500/50"
                    />
                  </label>
                );
              })}
            </div>

            {/* Antecedência e Horário */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Antecedência do Vencimento
                </label>
                <select
                  value={notifSettings.advance_days ?? 3}
                  onChange={(e) => setNotifSettings(prev => ({ ...prev, advance_days: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value={3} className="bg-slate-900 text-white">3 dias antes</option>
                  <option value={1} className="bg-slate-900 text-white">1 dia antes (Véspera)</option>
                  <option value={0} className="bg-slate-900 text-white">No dia do vencimento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  Início Horas Silenciosas
                </label>
                <input
                  type="time"
                  value={notifSettings.quiet_hours_start || '21:00'}
                  onChange={(e) => setNotifSettings(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  Fim Horas Silenciosas
                </label>
                <input
                  type="time"
                  value={notifSettings.quiet_hours_end || '08:00'}
                  onChange={(e) => setNotifSettings(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Salvando...' : 'Salvar Preferências de Notificação'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Subscription & Trial Status Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Status da Licença</span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isTrialActive
                    ? `Período de Testes Ativo (${daysRemaining} dias restantes)`
                    : 'Período de Testes Concluído'}
                </h3>
              </div>
            </div>

            <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
              isTrialActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {isTrialActive ? '7 DIAS DE DEGUSTAÇÃO' : 'EXPIRADO'}
            </span>
          </div>

          <div className="pt-3 border-t border-white/10 text-xs text-slate-400 flex flex-col sm:flex-row sm:justify-between gap-2">
            <span>Expira em: <strong className="text-slate-200">{trial?.trial_expires_at ? new Date(trial.trial_expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Indefinido'}</strong></span>
            <span>ID do Grupo Familiar: <code className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-indigo-300 font-mono">{family?.id}</code></span>
          </div>

          {/* Request Extension / Permanent License */}
          <div className="mt-4 p-5 bg-white/[0.03] rounded-2xl border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Solicitar Liberação ou Extensão de Acesso
            </h4>
            {requestSent ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Sua solicitação foi enviada ao SuperAdmin com sucesso e está em análise.</span>
              </div>
            ) : (
              <form onSubmit={handleRequestRelease} className="space-y-3">
                <input
                  type="text"
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Motivo da solicitação (ex: Gostaria de liberar o plano para o ano todo)"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                {requestError && (
                  <p className="text-xs text-rose-400 font-medium">{requestError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {requestLoading ? 'Enviando...' : 'Enviar Solicitação ao Administrador'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Family Members Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 sm:p-7 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Membros da Família: {family?.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pessoas com acesso aos registros e contas deste grupo familiar
              </p>
            </div>
          </div>

          {loadingMembers ? (
            <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-xs">Carregando membros...</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {members.map((m) => (
                <div key={m.id} className="p-4 bg-white/[0.02] flex items-center justify-between text-xs hover:bg-white/[0.05] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400">
                      {m.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-100 text-sm">{m.full_name}</p>
                      <p className="text-[11px] text-slate-400">{m.email}</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold text-[10px] uppercase">
                    {m.role === 'owner' ? 'Criador / Dono' : 'Membro'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
