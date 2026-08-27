'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await resetPassword(email);
    setLoading(false);

    if (res.success) {
      setSent(true);
    } else {
      setErrorMsg(res.error || 'Erro ao solicitar envio de link de recuperação.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-indigo-600/30 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="z-10 w-full max-w-md bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-6 sm:p-8 rounded-[28px] shadow-2xl space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-400/30 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Recuperar Senha
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enviaremos um link de redefinição seguro para seu e-mail
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4 py-4 bg-white/[0.02] border border-emerald-500/30 rounded-2xl p-5">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-100">E-mail Enviado!</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Se houver uma conta para <strong className="text-slate-200">{email}</strong>, o link de recuperação foi enviado através do Supabase Auth.
              </p>
            </div>
            <div className="pt-2">
              <Link
                id="link-back-login"
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 ml-1">
                E-mail cadastrado
              </label>
              <div className="relative">
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="pt-1">
              <button
                id="btn-forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
              >
                {loading ? (
                  'Enviando link via Supabase...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ENVIAR LINK</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
