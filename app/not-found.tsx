'use client';

import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Página Não Encontrada</h1>
          <p className="text-slate-400 text-sm">
            O endereço que você tentou acessar não existe ou foi movido.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Home className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
