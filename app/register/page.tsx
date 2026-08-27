'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { User, Mail, Lock, Users, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isConfigured } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Informe o seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }
    if (!familyName.trim()) {
      setErrorMsg('Informe o nome da sua família.');
      return;
    }

    setLoading(true);

    const res = await signUp({
      name,
      email,
      password,
      confirmPassword,
      familyName,
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      // Wait a moment and navigate to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Erro ao realizar cadastro no Supabase.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient glowing background orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-600/30 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Frosted Glass Card Container */}
      <div className="z-10 w-full max-w-5xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] sm:rounded-[32px] shadow-2xl flex flex-col lg:flex-row overflow-hidden my-auto">
        {/* Left Side: Form */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Finanzza<span className="text-indigo-400">Auth</span>
              </h1>
            </div>

            <div className="space-y-1 mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Criar conta familiar
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Comece seu período de teste de 7 dias com Supabase Auth real.
              </p>
            </div>

            {!isConfigured && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold text-amber-200">Supabase não configurado</strong>
                  Adicione as variáveis no <code>.env.local</code>.
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {success ? (
              <div className="text-center py-10 space-y-3 bg-white/[0.02] border border-emerald-500/30 rounded-2xl p-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-slate-100">Conta Criada com Sucesso!</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Perfil, Família e Período de 7 dias registrados no Supabase com sucesso. Redirecionando para o painel...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Nome */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Nome completo</label>
                  <div className="relative">
                    <input
                      id="register-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* E-mail */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">E-mail</label>
                  <div className="relative">
                    <input
                      id="register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="carlos@exemplo.com"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Senha e Confirmar lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300 ml-1">Senha</label>
                    <div className="relative">
                      <input
                        id="register-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mín. 6 dígitos"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300 ml-1">Confirmar</label>
                    <div className="relative">
                      <input
                        id="register-confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    </div>
                  </div>
                </div>

                {/* Nome da Família */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Nome da família</label>
                  <div className="relative">
                    <input
                      id="register-family-name"
                      type="text"
                      required
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="Ex: Família Silva"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                    />
                    <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-register-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 border border-indigo-400/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      'Cadastrando no Supabase Auth...'
                    ) : (
                      <>
                        <span>CRIAR MINHA CONTA</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-xs sm:text-sm text-slate-400">
                Já possui uma conta?{' '}
                <Link
                  id="link-go-to-login"
                  href="/login"
                  className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline"
                >
                  Fazer login
                </Link>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between text-[11px] text-slate-500">
            <span>Privacidade & RLS nativo</span>
            <span>7 Dias de Degustação</span>
          </div>
        </div>

        {/* Right Side: Showcase */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-indigo-500/10 via-white/[0.02] to-transparent p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo-400 mr-2 animate-pulse" />
              CADASTRO SEGURO
            </div>

            <h3 className="text-xl sm:text-2xl font-medium text-white mb-3">
              Estrutura Multi-Tenant
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              Ao cadastrar sua conta, criamos automaticamente o seu clã familiar e vinculamos a sua role como <span className="text-slate-200 font-semibold">Administrador Familiar (owner)</span>.
            </p>

            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período de Testes</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-200">7 dias de acesso irrestrito aos módulos</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Membros Ilimitados</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-200">Adicione cônjuges e filhos com facilidade</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
            <span>PostgreSQL Supabase</span>
            <span>Segurança Nível Bancário</span>
          </div>
        </div>
      </div>
    </div>
  );
}
