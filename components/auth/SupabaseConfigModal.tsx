'use client';

import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function SupabaseConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    try {
      const response = await fetch('/api/schema-sql');
      const sqlText = await response.text();
      await navigator.clipboard.writeText(sqlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-2xl rounded-[28px] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-md shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configuração do Supabase Auth & Banco</h3>
              <p className="text-xs text-slate-400">Integração oficial sem simulações ou dados fictícios</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-4 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Status da Conexão:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isSupabaseConfigured 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isSupabaseConfigured ? 'Conectado com Variáveis de Ambiente' : 'Aguardando Variáveis no .env.local'}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              O aplicativo utiliza a biblioteca oficial <code>@supabase/supabase-js</code> conectada a <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </p>
          </div>

          <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="font-semibold text-white">1. Criar projeto no Supabase</h4>
            <p className="text-slate-400">
              Acesse o console do Supabase e copie a URL do Projeto e a chave anônima (anon public key).
            </p>
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 underline font-semibold"
            >
              Abrir Supabase Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="font-semibold text-white">2. Executar o Script SQL (Tabelas + RLS + Trial)</h4>
            <p className="text-slate-400 leading-relaxed">
              No menu <strong>SQL Editor</strong> do seu Supabase, cole e execute o script para criar todas as tabelas (profiles, families, trial_periods, admin_roles, módulos financeiros) e políticas de segurança RLS:
            </p>
            <button
              id="btn-copy-sql"
              onClick={handleCopySql}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-indigo-600/25 border border-indigo-400/20 active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Script SQL Copiado para a Área de Transferência!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Script SQL Completo
                </>
              )}
            </button>
          </div>

          <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="font-semibold text-white">3. Variáveis no .env.local</h4>
            <div className="bg-[#020617] p-3.5 rounded-xl border border-white/10 font-mono text-[11px] text-indigo-300 select-all">
              NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co<br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_publica
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
