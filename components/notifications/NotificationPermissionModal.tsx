'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { requestAndSavePushSubscription, isPushSupported, getDeviceType, playBellChime } from '@/lib/push-notifications';
import { Bell, CheckCircle2, ShieldAlert, X, Sparkles, Volume2, ChevronRight, RefreshCw, Smartphone, ExternalLink } from 'lucide-react';

export function NotificationPermissionModal() {
  const { user, profile, family } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [device, setDevice] = useState('Celular');
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDevice(getDeviceType());
      setIsInIframe(window.self !== window.top);
    }
  }, []);

  useEffect(() => {
    if (!user || !isPushSupported()) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission;
      const dismissed = localStorage.getItem('financas_push_dismissed');
      
      if (currentPermission === 'granted') {
        // Automatically register or refresh push subscription in the background on startup
        requestAndSavePushSubscription(user.id, profile?.family_id || family?.id).catch((err) => {
          console.warn('Auto registration of push subscription on startup failed:', err);
        });
      } else if (currentPermission === 'default' && !dismissed) {
        // Delay slightly for smooth UX after app load
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile?.family_id, family?.id]);

  // Listen to manual triggers to open the modal
  useEffect(() => {
    const handleOpen = () => {
      if (typeof window !== 'undefined') {
        const currentPermission = Notification.permission;
        setIsBlocked(currentPermission === 'denied');
      }
      setIsOpen(true);
    };

    window.addEventListener('open-notification-modal', handleOpen);
    return () => window.removeEventListener('open-notification-modal', handleOpen);
  }, []);

  if (!isOpen || !user) return null;

  const handleActivate = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && Notification.permission === 'denied') {
        setIsBlocked(true);
        return;
      }
      const result = await requestAndSavePushSubscription(user.id, profile?.family_id || family?.id, true);
      if (result.success || result.permission === 'granted') {
        localStorage.removeItem('financas_push_dismissed');
        setIsOpen(false);
      } else if (result.permission === 'denied') {
        setIsBlocked(true);
      } else {
        localStorage.setItem('financas_push_dismissed', 'true');
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('financas_push_dismissed', 'true');
    setIsOpen(false);
  };

  const handleTestSound = () => {
    playBellChime();
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  const isIOS = device.includes('iOS') || (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent));
  const isAndroid = device.includes('Android') || (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-indigo-500/30 w-full max-w-sm sm:max-w-md rounded-[24px] p-4 sm:p-6 space-y-4 relative overflow-y-auto max-h-[90vh] my-auto shadow-2xl">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Icon */}
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-md ${
            isBlocked || isInIframe
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
              : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400'
          }`}>
            {isBlocked || isInIframe ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <Bell className="w-6 h-6 animate-bounce" />}
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isInIframe ? (
          <>
            {/* If inside an iframe (AI Studio preview iframe blocks permissions) */}
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                ⚠️ Bloqueio de Segurança
              </h2>
              <p className="text-xs text-slate-300">
                Você está visualizando o aplicativo dentro da janela (iframe) do AI Studio. 
                <strong> Os navegadores bloqueiam solicitações de notificação dentro de janelas integradas por segurança.</strong>
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2 text-xs text-amber-200">
              <span className="font-bold block">Como Ativar de Verdade:</span>
              <p className="leading-relaxed">
                Abra o aplicativo em uma **nova aba cheia** fora da ferramenta do AI Studio. 
                Lá o seu navegador permitirá ativar as notificações perfeitamente!
              </p>
            </div>

            {/* Action Buttons for Iframe */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleOpenInNewTab}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer font-sans"
              >
                <ExternalLink className="w-4 h-4" />
                <span>ABRIR EM NOVA ABA</span>
              </button>

              <button
                onClick={handleDismiss}
                className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition border border-white/5 text-center cursor-pointer"
              >
                CONTINUAR AQUI
              </button>
            </div>
          </>
        ) : !isBlocked ? (
          <>
            {/* Title & Prompt Text */}
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                🔔 Ative as notificações
              </h2>
              <p className="text-xs text-slate-300">
                Receba avisos importantes no seu celular sobre:
              </p>
            </div>

            {/* Benefits List */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span>Contas próximas do vencimento</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                <span>Faturas do cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>Parcelas e Empréstimos</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                <span>Contas vencidas e estouro de orçamento</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>Avisos sobre seu período de teste</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-medium bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
              <Volume2 className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>Com som nativo de sino no seu dispositivo</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleActivate}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>{loading ? 'Solicitando permissão...' : 'ATIVAR NOTIFICAÇÕES'}</span>
              </button>

              <button
                onClick={handleDismiss}
                className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition border border-white/5 text-center cursor-pointer"
              >
                AGORA NÃO
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Blocked/Denied Assistance UI */}
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🔒 Permissão Bloqueada
              </h2>
              <p className="text-xs text-slate-300">
                Você bloqueou as notificações deste aplicativo anteriormente. Siga o guia abaixo para reativar facilmente neste celular:
              </p>
            </div>

            {/* Step-by-step custom guide tailored to the detected device */}
            <div className="bg-slate-900/50 border border-rose-500/20 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300 pb-1 border-b border-white/5">
                <Smartphone className="w-4 h-4" />
                <span>Instruções para {isIOS ? 'iPhone / iOS' : isAndroid ? 'Android' : device}</span>
              </div>

              {isIOS ? (
                <div className="space-y-3.5 text-xs text-slate-200">
                  <div className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold shrink-0">1</span>
                    <p>Abra os <strong>Ajustes</strong> do seu iPhone.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold shrink-0">2</span>
                    <p>Vá em <strong>Notificações</strong> e selecione o navegador <strong>Safari</strong> (ou nosso aplicativo).</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold shrink-0">3</span>
                    <p>Ative a opção <strong>&quot;Permitir Notificações&quot;</strong>.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs text-slate-200">
                  <div className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold shrink-0">1</span>
                    <p>Toque no ícone de <strong>Ajustes / Cadeado / Configuração</strong> à esquerda da barra de endereços (ao lado do link do site no Chrome).</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold shrink-0">2</span>
                    <p>Toque em <strong>Permissões</strong> ou <strong>Configurações do Site</strong>.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold shrink-0">3</span>
                    <p>Altere a permissão de <strong>Notificações</strong> para <strong>Permitir</strong>.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-medium bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
              <Volume2 className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>O som de sino sintético ainda funcionará localmente!</span>
            </div>

            {/* Blocked Assist Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleTestSound}
                className="py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 text-xs font-bold rounded-xl transition border border-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                title="Testar Som Sintético"
              >
                <Volume2 className="w-4 h-4" />
                <span>Testar Som 🔔</span>
              </button>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recarregar</span>
              </button>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition border border-white/5 text-center cursor-pointer"
            >
              ENTENDI, DEPOIS CONFIGURO
            </button>
          </>
        )}
      </div>
    </div>
  );
}

