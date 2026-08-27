'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Store redirect target
      if (typeof window !== 'undefined' && pathname && pathname !== '/login') {
        sessionStorage.setItem('auth_redirect', pathname);
      }
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-slate-100 p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm p-8 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Verificando autenticação...</h3>
            <p className="text-xs text-slate-400 mt-1">Conectando com a sessão segura do Supabase</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
