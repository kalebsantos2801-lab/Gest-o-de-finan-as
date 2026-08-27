'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { ShieldAlert, KeyRound, Lock, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isSuperAdmin, adminRole, loading, updatePassword } = useAuth();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-slate-100 p-4">
        <div className="flex flex-col items-center gap-3 p-8 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <p className="text-sm font-bold text-slate-300">Verificando credenciais de SuperAdmin...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or not SuperAdmin
  if (!user || !isSuperAdmin) {
    return (
      <div id="admin-access-denied" className="min-h-screen flex items-center justify-center bg-transparent text-slate-100 p-4">
        <div className="max-w-md w-full bg-white/[0.04] backdrop-blur-2xl border border-rose-500/30 rounded-[28px] p-6 sm:p-7 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Acesso Restrito: SuperAdmin</h2>
            <p className="text-xs text-slate-400 mt-1">
              Esta área é exclusiva para administradores com role autorizada no Supabase.
            </p>
          </div>
          <div className="pt-2">
            <button
              id="btn-return-dashboard"
              onClick={() => router.push(user ? '/dashboard' : '/login')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl text-sm font-bold transition cursor-pointer active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              {user ? 'Voltar para o Dashboard' : 'Ir para Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mandatory initial password change check for SuperAdmin
  if (adminRole?.requires_password_change) {
    const handleMandatoryPasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword || newPassword.length < 8) {
        setErrorMsg('A nova senha deve ter no mínimo 8 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('As senhas não coincidem.');
        return;
      }

      setIsUpdating(true);
      setErrorMsg('');
      const res = await updatePassword(newPassword);
      setIsUpdating(false);

      if (res.success) {
        setSuccessMsg(true);
      } else {
        setErrorMsg(res.error || 'Erro ao alterar a senha.');
      }
    };

    return (
      <div id="mandatory-password-change" className="min-h-screen flex items-center justify-center bg-transparent text-slate-100 p-4">
        <div className="max-w-md w-full bg-white/[0.04] backdrop-blur-2xl border border-amber-500/30 rounded-[28px] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Alteração Obrigatória de Senha</h2>
              <p className="text-xs text-amber-400/90 font-medium">Primeiro acesso administrativo detectado</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Por motivos de segurança, a credencial inicial provisória deve ser substituída por uma nova senha forte antes de acessar o painel de SuperAdmin.
          </p>

          {!successMsg ? (
            <form onSubmit={handleMandatoryPasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">Nova Senha do Administrador</label>
                <div className="relative">
                  <input
                    id="admin-new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    id="admin-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
              )}

              <button
                id="btn-save-admin-password"
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-amber-500/20"
              >
                {isUpdating ? 'Atualizando senha segura...' : 'Salvar Nova Senha & Acessar Painel'}
              </button>
            </form>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-300">Senha Atualizada no Supabase Auth</h4>
              <p className="text-xs text-slate-400">
                Sua credencial de SuperAdmin foi salva com sucesso de forma criptografada.
              </p>
              <button
                id="btn-continue-to-admin"
                onClick={() => window.location.reload()}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-emerald-600/20"
              >
                Prosseguir para o Painel Administrativo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
