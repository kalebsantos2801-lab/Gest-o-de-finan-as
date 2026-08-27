'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNotification } from '@/types/database';
import { triggerNativeNotification, playBellChime, getNotificationPermission, decodeNotificationMessage } from '@/lib/push-notifications';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Filter, 
  CreditCard, 
  Wallet, 
  AlertTriangle, 
  Banknote, 
  Sparkles, 
  ExternalLink, 
  Clock, 
  Settings,
  RefreshCw,
  Info,
  Volume2,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <NotificationsContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function NotificationsContent() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'financial' | 'bills' | 'cards' | 'system'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [showSimulatedToast, setShowSimulatedToast] = useState(false);
  const [toastContent, setToastContent] = useState({ title: '', body: '' });
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermissionStatus(getNotificationPermission());
      setIsInIframe(window.self !== window.top);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const decodedList = data.map((n: any) => {
          const { cleanMessage, type, target_url } = decodeNotificationMessage(n.message);
          return {
            ...n,
            message: cleanMessage,
            type: n.type || type,
            target_url: n.target_url || target_url,
          };
        });
        setNotifications(decodedList as AppNotification[]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleManualSync = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await fetch(`/api/notifications/check-and-send?userId=${user.id}`);
      await loadNotifications();
    } catch (err) {
      console.error('Error running manual check:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleTestNotification = async () => {
    // Always play the synthesized bell chime sound immediately
    playBellChime();
    
    const title = '🔔 Notificação de Teste';
    const body = 'Este é um teste do som de sino e do sistema de notificações do Finanças Familiar.';
    
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      await triggerNativeNotification({
        title,
        body,
        url: '/notificacoes',
      });
    } else {
      // Show simulated toast
      setToastContent({ title, body });
      setShowSimulatedToast(true);
      // Auto-dismiss after 5s
      setTimeout(() => {
        setShowSimulatedToast(false);
      }, 5000);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'cards') return n.type?.includes('fatura') || n.type?.includes('card') || n.target_url?.includes('cartoes');
    if (filter === 'bills') return n.type?.includes('conta') || n.target_url?.includes('contas');
    if (filter === 'financial') return n.type?.includes('conta') || n.type?.includes('fatura') || n.type?.includes('parcela') || n.type?.includes('orcamento');
    if (filter === 'system') return n.type?.includes('trial') || n.type?.includes('system');
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getBadgeStyle = (type?: string, title?: string) => {
    const t = (type || title || '').toLowerCase();
    if (t.includes('vencida') || t.includes('ultrapassado')) {
      return {
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
        icon: AlertTriangle,
        tag: 'CRÍTICO',
      };
    }
    if (t.includes('fatura') || t.includes('card')) {
      return {
        bg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
        icon: CreditCard,
        tag: 'FATURA',
      };
    }
    if (t.includes('conta')) {
      return {
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
        icon: Wallet,
        tag: 'CONTA',
      };
    }
    if (t.includes('emprestimo') || t.includes('parcela')) {
      return {
        bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
        icon: Banknote,
        tag: 'PARCELA',
      };
    }
    return {
      bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
      icon: Bell,
      tag: 'ALERTA',
    };
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <AppHeader />

      {/* Beautiful Simulated Glassmorphic Toast */}
      {showSimulatedToast && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full bg-slate-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">{toastContent.title}</span>
              <button 
                onClick={() => setShowSimulatedToast(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1">{toastContent.body}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded-md font-mono">
                Som de Sino Reproduzido 🔊
              </span>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Warning Box for iframe Sandbox restrictions */}
        {isInIframe ? (
          <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-amber-500/10 border border-amber-500/30 rounded-[24px] p-5 shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  Bloqueio de Notificações do AI Studio (iframe)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Os navegadores modernos **bloqueiam solicitações de permissão de notificação** dentro de janelas integradas (iframes) por segurança. Para poder ativar e receber as notificações de verdade no seu computador ou celular, você deve abrir o aplicativo em tela cheia fora da ferramenta.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(window.location.href, '_blank');
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-indigo-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Aplicativo em Nova Aba</span>
              </button>

              <button
                onClick={() => {
                  playBellChime();
                  setToastContent({
                    title: '🔔 Teste de Som Direto',
                    body: 'O som do sino foi gerado e reproduzido localmente com sucesso!'
                  });
                  setShowSimulatedToast(true);
                  setTimeout(() => setShowSimulatedToast(false), 4000);
                }}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Testar Apenas Som</span>
              </button>
            </div>
          </div>
        ) : (
          permissionStatus === 'denied' && (
            <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border border-rose-500/30 rounded-[24px] p-5 shadow-lg space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    Permissão de Notificação Bloqueada pelo Navegador
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Você recusou ou bloqueou as notificações deste site anteriormente. Nós reproduzimos o <strong>som de sino sintético</strong> localmente para seu teste, mas para receber alertas automáticos no celular ou computador, siga as instruções abaixo para desbloquear.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-200">No Google Chrome:</span>
                  <p className="text-[11px] text-slate-400">Clique no ícone de <strong>ajustes/cadeado</strong> ao lado da URL na barra de endereços e altere Notificações para &quot;Permitir&quot;.</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-200">No Safari (iOS/Mac):</span>
                  <p className="text-[11px] text-slate-400">Acesse <strong>Ajustes do Sistema &gt; Notificações &gt; Safari</strong> (ou Finanças Familiar) e marque &quot;Permitir Notificações&quot;.</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-200">No Firefox:</span>
                  <p className="text-[11px] text-slate-400">Clique no ícone de <strong>balão com cadeado</strong> na barra de endereços, remova o bloqueio e recarregue a página.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    playBellChime();
                    setToastContent({
                      title: '🔔 Teste de Som Direto',
                      body: 'O som do sino foi gerado e reproduzido localmente com sucesso!'
                    });
                    setShowSimulatedToast(true);
                    setTimeout(() => setShowSimulatedToast(false), 4000);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-indigo-600/20"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Testar Apenas Som</span>
                </button>

                <button
                  onClick={async () => {
                    const res = await Notification.requestPermission();
                    setPermissionStatus(res);
                    if (res === 'granted') {
                      window.location.reload();
                    }
                  }}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition border border-white/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Recarregar & Tentar Ativar</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* Title Header Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Central de Notificações
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-500/30">
                    {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Histórico de notificações e avisos financeiros do aplicativo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={refreshing}
              title="Verificar novos vencimentos"
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl border border-white/10 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Verificar Agora</span>
            </button>

            <button
              onClick={handleTestNotification}
              title="Testar som e notificação nativa do celular"
              className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold rounded-xl border border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Testar Push</span>
            </button>

            <Link
              href="/configuracoes"
              title="Configurar preferências de notificação"
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Filters and Mark All as Read */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[24px] p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Todas ({notifications.length})
            </button>

            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === 'unread'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Não Lidas ({unreadCount})
            </button>

            <button
              onClick={() => setFilter('bills')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === 'bills'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Contas
            </button>

            <button
              onClick={() => setFilter('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === 'cards'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Cartões & Faturas
            </button>

            <button
              onClick={() => setFilter('system')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === 'system'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Sistema
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 self-end md:self-auto cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como lidas</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white/[0.04] border border-white/10 rounded-[28px]">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium">Carregando suas notificações...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] space-y-3 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Nenhuma notificação encontrada</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {filter === 'unread'
                  ? 'Você já leu todas as suas notificações financeiras!'
                  : 'Você não possui avisos pendentes ou notificações nesta categoria.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const style = getBadgeStyle(n.type, n.title);
              const Icon = style.icon;
              const dateObj = new Date(n.created_at);
              const formattedDate = dateObj.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    handleMarkAsRead(n.id);
                    if (n.target_url) {
                      window.location.href = n.target_url;
                    }
                  }}
                  className={`group relative bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-2xl border rounded-[24px] p-4 sm:p-5 transition shadow-lg cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !n.is_read ? 'border-indigo-500/40 bg-indigo-500/[0.03]' : 'border-white/10 opacity-90'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Category Icon */}
                    <div className={`p-3 rounded-2xl border shrink-0 ${style.bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${style.bg}`}>
                          {style.tag}
                        </span>
                        <h3 className={`text-sm sm:text-base font-bold text-white truncate ${!n.is_read ? 'font-black' : ''}`}>
                          {n.title}
                        </h3>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                      </div>

                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedDate}
                        </span>
                        {n.target_url && (
                          <span className="text-indigo-400 font-medium group-hover:underline flex items-center gap-0.5">
                            Ver Detalhes <ExternalLink className="w-3 h-3 inline" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Marcar como lida"
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl border border-transparent hover:border-emerald-500/20 transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      title="Excluir notificação"
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
