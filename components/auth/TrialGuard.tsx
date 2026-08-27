'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { Clock, ShieldAlert, Send, CheckCircle2, Lock, LogOut } from 'lucide-react';

interface TrialGuardProps {
  children: React.ReactNode;
}

export function TrialGuard({ children }: TrialGuardProps) {
  const { 
    user, 
    profile, 
    family, 
    trial, 
    isTrialExpired, 
    serverTime, 
    isSuperAdmin,
    signOut,
    requestTrialRelease 
  } = useAuth();

  const [requestReason, setRequestReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Maintain local time for live 1-second countdown to keep re-renders local to TrialGuard
  const [localServerTime, setLocalServerTime] = useState<Date>(new Date());

  useEffect(() => {
    setLocalServerTime(serverTime);
  }, [serverTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalServerTime((prev) => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // SuperAdmins bypass trial expiration
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Calculate remaining countdown
  const getRemainingTime = () => {
    if (!trial?.trial_expires_at) return null;
    const expiresMs = new Date(trial.trial_expires_at).getTime();
    const serverMs = localServerTime.getTime();
    const diff = expiresMs - serverMs;

    if (diff <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return { expired: false, days, hours, minutes, seconds };
  };

  const remaining = getRemainingTime();

  const handleSendReleaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setErrorMessage('Por favor, informe uma justificativa para a solicitação.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    const res = await requestTrialRelease(requestReason);
    setIsSubmitting(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setErrorMessage(res.error || 'Não foi possível enviar a solicitação.');
    }
  };

  // If expired or blocked -> Render Block Screen
  if (isTrialExpired) {
    return (
      <div id="trial-blocked-screen" className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient glow orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-rose-600/25 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-amber-500/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="z-10 w-full max-w-lg bg-white/[0.04] backdrop-blur-2xl border border-rose-500/30 rounded-[28px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
          
          <div className="flex items-center gap-3.5 mb-6">
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-400 shadow-lg shadow-rose-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Período de Testes Expirado</h2>
              <p className="text-xs text-slate-400">Seu acesso de 7 dias ao sistema chegou ao fim</p>
            </div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 mb-6 space-y-2.5 text-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 text-xs">Usuário:</span>
              <span className="font-semibold text-white">{profile?.full_name || user?.email}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 text-xs">Família:</span>
              <span className="font-semibold text-indigo-300">{family?.name || 'Família'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 text-xs">Status no Banco:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {trial?.status === 'blocked' ? 'BLOQUEADO MANUALMENTE' : 'EXPIRADO (AUTORIDADE SERVIDOR)'}
              </span>
            </div>
            {trial?.trial_expires_at && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 text-xs">Expirou em:</span>
                <span className="text-xs text-slate-300 font-mono">
                  {new Date(trial.trial_expires_at).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {!submitted ? (
            <form onSubmit={handleSendReleaseRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 ml-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Solicitar renovação ou liberação de acesso:
                </label>
                <textarea
                  id="trial-release-reason"
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Explique o motivo para o SuperAdmin avaliar sua solicitação..."
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
              )}

              <button
                id="btn-submit-release"
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/25 border border-indigo-400/20 active:scale-[0.98] cursor-pointer"
              >
                {isSubmitting ? (
                  'Enviando solicitação...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Solicitação ao SuperAdmin
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-semibold text-emerald-300">Solicitação Enviada com Sucesso</h4>
              <p className="text-xs text-slate-400">
                O SuperAdmin foi notificado no painel administrativo para avaliar a liberação da sua família.
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-[11px] text-slate-500">
              Verificação autoritativa via servidor
            </span>
            <button
              id="btn-logout-blocked"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active state: Show live countdown banner on top and children
  return (
    <div className="min-h-screen flex flex-col">
      {remaining && !remaining.expired && (
        <div id="trial-active-banner" className="bg-[#020617]/80 backdrop-blur-xl border-b border-indigo-500/20 px-4 py-2 text-xs text-slate-300">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Período de Testes (7 Dias)
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Família: <strong className="text-slate-200">{family?.name || 'Família'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono font-medium text-slate-200">
              <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-slate-400 text-xs">Tempo restante:</span>
              <span className="bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10 text-indigo-300 font-bold backdrop-blur-md">
                {remaining.days}d {remaining.hours}h {remaining.minutes}m {remaining.seconds}s
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
