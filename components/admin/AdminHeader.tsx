'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  ShieldCheck, 
  LogOut, 
  ExternalLink,
  Lock,
  UserCheck,
  ChevronDown,
  User,
  Shield,
  ArrowRight
} from 'lucide-react';

export function AdminHeader() {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setLogoutModalOpen(false);
    await signOut();
  };

  return (
    <>
      <header className="bg-[#020617]/95 backdrop-blur-2xl border-b border-amber-500/20 sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
            
            {/* Logo & SuperAdmin Title */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 border border-amber-400/40 shrink-0">
                <ShieldCheck className="w-5 h-5 text-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-white text-xs sm:text-base tracking-tight truncate">
                    Painel <span className="text-amber-400">Administrativo</span>
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase shrink-0">
                    <Lock className="w-3 h-3 text-amber-400" />
                    SuperAdmin
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate hidden sm:block">
                  Gestão de Contas, Prazos de Licença & Bloqueios
                </p>
              </div>
            </div>

            {/* Right Action controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Visão do Usuário */}
              <Link
                href="/dashboard"
                id="admin-nav-user-view"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
                title="Acessar visão de usuário comum"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Visão do Usuário</span>
              </Link>

              <div className="h-4 w-px bg-white/10 mx-0.5 hidden sm:block" />

              {/* User Name Pill with Dropdown Menu & Logout */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="admin-user-profile-menu-button"
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/25 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-amber-500/30 text-xs font-bold text-amber-300 transition cursor-pointer group"
                  title="Clique para opções de conta ou sair do sistema"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="truncate max-w-[100px] sm:max-w-[160px] md:max-w-[200px] text-[11px] sm:text-xs">
                    {user?.email || 'Administrador'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-300 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 border-b border-white/10 mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Super Administrador</p>
                          <p className="text-xs font-mono text-slate-200 truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Alternar para Visão do Usuário
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                      </Link>

                      <button
                        id="admin-menu-signout"
                        type="button"
                        onClick={() => setLogoutModalOpen(true)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sair do Sistema Administrativo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Quick Logout Button */}
              <button
                id="admin-btn-direct-signout"
                type="button"
                onClick={() => setLogoutModalOpen(true)}
                title="Sair do Sistema Administrativo"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 border border-transparent hover:border-rose-500/20 rounded-xl text-xs transition cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Confirmation Modal to Sign Out */}
      {logoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">Sair do Painel Admin?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Deseja encerrar sua sessão de administrador?</p>
              </div>
            </div>

            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 text-xs text-slate-300">
              Sua sessão atual com o e-mail <strong className="text-amber-300 font-mono">{user?.email}</strong> será desconectada com segurança.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-admin-signout"
                type="button"
                onClick={handleSignOut}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Sim, Sair Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
