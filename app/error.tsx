'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Ocorreu um erro</h1>
          <p className="text-slate-400 text-sm">
            Algo inesperado aconteceu ao processar esta página.
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-600/20"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
