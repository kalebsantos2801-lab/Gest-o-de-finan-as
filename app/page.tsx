'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, loading, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (isSuperAdmin) {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, isSuperAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent text-slate-100">
      <div className="flex flex-col items-center gap-3 p-8 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-xs font-bold text-slate-300">Iniciando sistema seguro...</p>
      </div>
    </div>
  );
}
