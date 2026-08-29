'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PIX_CONFIG } from '@/lib/pix';
import { 
  ShieldAlert, 
  Send, 
  CheckCircle2, 
  Lock, 
  LogOut, 
  Upload, 
  QrCode, 
  Copy, 
  Check, 
  Building2, 
  Sparkles, 
  ArrowUpRight,
  AlertTriangle,
  User,
  Users
} from 'lucide-react';

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

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [copiedKeyQuick, setCopiedKeyQuick] = useState(false);
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

  const currentPlan = PIX_CONFIG.plans[selectedPlan];

  // SuperAdmins bypass trial expiration
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const handleCopyQuickKey = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(currentPlan.copiaECola);
      setCopiedKeyQuick(true);
      setTimeout(() => setCopiedKeyQuick(false), 2500);
    } catch {
      // Fallback
    }
  };

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

  // Check if expired or blocked
  const isManuallyBlocked = profile?.status === 'blocked' || trial?.status === 'blocked' || (trial as any)?.is_blocked === true;
  const isExpiredByTime = Boolean(
    trial?.trial_expires_at && 
    new Date(trial.trial_expires_at).getTime() <= localServerTime.getTime()
  );
  const shouldBlock = !isSuperAdmin && (isTrialExpired || isManuallyBlocked || isExpiredByTime);

  // If expired or blocked -> Render Block Screen
  if (shouldBlock) {
    return (
      <div id="trial-blocked-screen" className="min-h-screen bg-[#040817] text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-x-hidden">
        {/* Ambient glow accents */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="z-10 w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-5 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden space-y-6">
          {/* Top highlight gradient */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500" />
          
          {/* Screen Header */}
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-400 shadow-xl shadow-rose-500/15 shrink-0">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isManuallyBlocked ? 'Acesso Bloqueado' : 'Período de Testes Expirado'}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {isManuallyBlocked 
                  ? 'Sua conta foi suspensa ou bloqueada pelo administrador do sistema.' 
                  : 'Seu período de teste ao sistema chegou ao fim. Realize o pagamento ou solicite liberação.'}
              </p>
            </div>
          </div>

          {/* User & Account Status Card */}
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Usuário:
              </span>
              <span className="font-bold text-white font-mono">{profile?.full_name || user?.email}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Família:
              </span>
              <span className="font-bold text-indigo-300">{family?.name || 'Família'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                Status da Conta:
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {isManuallyBlocked ? 'BLOQUEADO PELO ADMINISTRADOR' : 'EXPIRADO (AUTORIDADE SERVIDOR)'}
              </span>
            </div>
            {trial?.trial_expires_at && !isManuallyBlocked && (
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/5">
                <span className="text-slate-400">Expirou em:</span>
                <span className="text-slate-300 font-mono">
                  {new Date(trial.trial_expires_at).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {/* MAIN PIX CTA CARD */}
          <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900/90 to-emerald-950/50 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl shadow-indigo-500/10 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white">Liberação via PIX</h4>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {currentPlan.formattedAmount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-bold">
                    Beneficiário: {PIX_CONFIG.beneficiary}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Rápido</span>
              </span>
            </div>

            {/* Plan Selector */}
            <div className="bg-slate-950/60 p-2 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block px-1 mt-0.5">
                Escolha o plano de liberação:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('monthly')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                    selectedPlan === 'monthly'
                      ? 'bg-indigo-600/20 text-white border-indigo-500/50 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
                  }`}
                >
                  <span className="text-[11px]">1 Mês (Mensal)</span>
                  <span className="text-[10px] text-emerald-400 font-extrabold">R$ 7,00</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border relative overflow-hidden ${
                    selectedPlan === 'yearly'
                      ? 'bg-indigo-600/20 text-white border-indigo-500/50 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                    1 Ano (Anual)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-extrabold">R$ 75,00</span>
                </button>
              </div>
            </div>

            {/* Quick Key Preview Box */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Código PIX Copia e Cola:</span>
                <span className="text-emerald-400 font-bold">Valor: {currentPlan.formattedAmount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-white truncate select-all flex-1">
                  {currentPlan.copiaECola}
                </span>
                <button
                  type="button"
                  onClick={handleCopyQuickKey}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    copiedKeyQuick
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-[#0080c8] hover:bg-[#006ea8] text-white shadow-md'
                  }`}
                >
                  {copiedKeyQuick ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Link to Dedicated Wallet Page */}
            <Link
              href={`/carteira?plan=${selectedPlan}`}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-2xl text-xs font-black tracking-wide transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] text-center"
            >
              <QrCode className="w-4 h-4" />
              <span>Ver QR Code & Pagar {currentPlan.formattedAmount}</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Form de Solicitação Manual ao SuperAdmin */}
          {!submitted ? (
            <form onSubmit={handleSendReleaseRequest} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Ou envie uma solicitação por mensagem:
                </label>
                <textarea
                  id="trial-release-reason"
                  rows={2}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Explique o motivo para o SuperAdmin avaliar sua solicitação..."
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
              )}

              <button
                id="btn-submit-release"
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition border border-white/10 cursor-pointer"
              >
                {isSubmitting ? (
                  'Enviando solicitação...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Mensagem ao SuperAdmin</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
              <h4 className="text-xs font-bold text-emerald-300">Solicitação Enviada com Sucesso</h4>
              <p className="text-[11px] text-slate-400">
                O SuperAdmin foi notificado no painel administrativo para avaliar sua liberação.
              </p>
            </div>
          )}

          {/* Suporte WhatsApp */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.113.957 11.48.957c-5.43 0-9.85 4.37-9.855 9.799-.001 1.838.497 3.633 1.442 5.216l-.974 3.559 3.655-.959zM18.252 14.9c-.34-.17-2.015-.995-2.327-1.109-.312-.113-.539-.17-.766.17-.227.34-.879 1.109-1.077 1.332-.197.223-.396.252-.736.082-.34-.17-1.436-.53-2.735-1.689-1.01-.9-1.692-2.013-1.89-2.352-.198-.34-.022-.523.148-.692.153-.152.34-.396.51-.595.17-.198.227-.34.34-.566.113-.227.056-.425-.028-.595-.085-.17-.766-1.841-1.049-2.522-.276-.664-.556-.574-.766-.585-.198-.01-.425-.01-.652-.01-.227 0-.595.085-.907.425-.312.34-1.19 1.161-1.19 2.83 0 1.67 1.218 3.284 1.388 3.51.17.227 2.399 3.662 5.811 5.132.812.35 1.446.559 1.94.716.815.258 1.558.222 2.146.135.656-.098 2.015-.823 2.298-1.62.283-.797.283-1.479.198-1.62-.085-.141-.312-.227-.652-.397z" />
                </svg>
              </div>
              <div className="space-y-0.5 text-left">
                <h4 className="text-xs font-black text-white">Suporte por WhatsApp</h4>
                <p className="text-[10px] text-slate-400">Clique para enviar mensagem direta</p>
              </div>
            </div>
            <a
              href="https://wa.me/5532999634583?text=Olá!%20Estou%20na%20tela%20de%20bloqueio%20do%20sistema%20e%20gostaria%20de%20ajuda%20para%20liberar%20meu%20acesso."
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              Falar com Suporte
            </a>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-[11px] text-slate-500">
              Verificação autoritativa via servidor
            </span>
            <button
              id="btn-logout-blocked"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 cursor-pointer transition font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active state: Authorized, return children cleanly
  return <>{children}</>;
}

