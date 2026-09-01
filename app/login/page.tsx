'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  Mail, 
  Lock, 
  Key, 
  ArrowRight, 
  AlertCircle, 
  Wallet, 
  Database,
  CheckCircle2,
  ShieldCheck,
  X
} from 'lucide-react';
import { SupabaseConfigModal } from '@/components/auth/SupabaseConfigModal';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isSuperAdmin, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Admin modal state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (isSuperAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, isSuperAdmin, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Por favor, informe e-mail e senha.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const cleanInputEmail = email.trim().toLowerCase();
    const res = await signIn(cleanInputEmail, password);
    setLoading(false);

    if (res.success) {
      // Direct to admin only if it is strictly the master admin email and authenticated as such
      if (cleanInputEmail === 'kalebsantos2801@gmail.com' && res.isSuperAdmin) {
        router.push('/admin');
      } else {
        const redirectTarget = sessionStorage.getItem('auth_redirect') || '/dashboard';
        sessionStorage.removeItem('auth_redirect');
        router.push(redirectTarget);
      }
    } else {
      setErrorMsg(res.error || 'Credenciais inválidas ou erro de autenticação.');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAdminEmail = adminEmail.trim().toLowerCase();
    if (!cleanAdminEmail || !adminPassword) {
      setAdminError('Informe o e-mail e senha do administrador.');
      return;
    }

    if (cleanAdminEmail !== 'kalebsantos2801@gmail.com') {
      setAdminError('Acesso negado: Somente a credencial de Administrador Mestre oficial (kalebsantos2801@gmail.com) tem permissão de acesso ao painel.');
      return;
    }

    setAdminLoading(true);
    setAdminError('');

    const res = await signIn(cleanAdminEmail, adminPassword);
    setAdminLoading(false);

    if (res.success && res.isSuperAdmin) {
      setAdminModalOpen(false);
      router.push('/admin');
    } else {
      setAdminError(res.error || 'Falha na autenticação administrativa. Verifique a senha mestra.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* High-end low-opacity atmospheric background image overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.12] pointer-events-none scale-105" 
        style={{ backgroundImage: "url('/logo_finanzza.jpg?v=3')" }}
      />
      {/* Soft vignette gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/80 pointer-events-none" />

      {/* Ambient glowing background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top bar info */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          onClick={() => setConfigModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/10 text-xs text-slate-300 hover:text-white hover:border-white/20 transition cursor-pointer shadow-lg"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Configuração Supabase</span>
        </button>
      </div>

      {/* Main Frosted Glass Card Container */}
      <div className="z-10 w-full max-w-5xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] sm:rounded-[32px] shadow-2xl flex flex-col lg:flex-row overflow-hidden my-auto">
        {/* Left Side: Form */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-black/40 border border-white/10">
                <img src="/logo_finanzza.jpg?v=3" alt="Logo Finanzza" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Finanzza<span className="text-emerald-400">Auth</span>
              </h1>
            </div>

            <div className="space-y-1.5 mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Acesse sua conta
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Gestão financeira familiar integrada ao Supabase.
              </p>
            </div>

            {!isConfigured && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold text-amber-200">Supabase não configurado</strong>
                  Configure as variáveis no <code>.env.local</code>.
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">E-mail</label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-medium text-slate-300">Senha</label>
                  <Link
                    id="link-forgot-password"
                    href="/forgot-password"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 border border-indigo-400/20 transition-all transform active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  'Autenticando via Supabase...'
                ) : (
                  <>
                    <span>ENTRAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs sm:text-sm text-slate-400">
                Não tem uma conta?{' '}
                <Link
                  id="link-create-account"
                  href="/register"
                  className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline"
                >
                  Criar conta familiar
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-6">
            <button
              id="btn-admin-access"
              type="button"
              onClick={() => {
                setAdminModalOpen(true);
              }}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Acesso administrativo</span>
            </button>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              Secure by Supabase
            </span>
          </div>
        </div>

        {/* Right Side: Frosted Feature Showcase */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-indigo-500/10 via-white/[0.02] to-transparent p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              SISTEMA ATIVO
            </div>

            <h3 className="text-xl sm:text-2xl font-medium text-white mb-3">
              Proteção Real & Persistente
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              Sincronização em tempo real via <span className="text-slate-200 font-semibold">PostgreSQL RLS</span>. Seus dados familiares protegidos por criptografia de ponta a ponta e isolamento total de tabelas.
            </p>

            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center gap-4 hover:border-white/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vínculo Familiar</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-200">Organização por clãs, contas e membros</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center gap-4 hover:border-white/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trial de 7 Dias</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-200 font-mono">Controle autoritativo via servidor</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center gap-4 hover:border-white/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/20 flex items-center justify-center text-purple-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Políticas RLS</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-200">Segurança nativa em nível de linha</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
            <span>v2.4.0-stable</span>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="w-6 h-1.5 rounded-full bg-indigo-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
            <span>Produção Segura</span>
          </div>
        </div>
      </div>

      {/* Admin Login Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-amber-500/30 w-full max-w-md rounded-2xl sm:rounded-[24px] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Login Administrativo</h3>
                  <p className="text-[11px] text-amber-400">Verificação de Role SuperAdmin no Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">E-mail do Administrador</label>
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="kalebsantos2801@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Senha</label>
                <input
                  id="admin-login-password"
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-admin-login"
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                >
                  {adminLoading ? 'Validando SuperAdmin no Supabase...' : 'Autenticar SuperAdmin'}
                </button>
              </div>
            </form>

            <p className="text-[11px] text-slate-400 text-center">
              A autorização é verificada exclusivamente no servidor/banco via Supabase Auth + RLS.
            </p>
          </div>
        </div>
      )}

      <SupabaseConfigModal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} />
    </div>
  );
}
