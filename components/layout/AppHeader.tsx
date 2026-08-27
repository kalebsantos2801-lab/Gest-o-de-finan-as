'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  CreditCard, 
  Banknote, 
  AlertOctagon, 
  Target, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Users,
  Database,
  Bell
} from 'lucide-react';
import { SupabaseConfigModal } from '@/components/auth/SupabaseConfigModal';
import { NotificationPermissionModal } from '@/components/notifications/NotificationPermissionModal';
import { NotificationManager } from '@/components/notifications/NotificationManager';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/entradas', label: 'Entradas', icon: ArrowDownLeft },
  { href: '/despesas', label: 'Despesas', icon: ArrowUpRight },
  { href: '/contas', label: 'Contas', icon: Wallet },
  { href: '/cartoes', label: 'Cartões', icon: CreditCard },
  { href: '/emprestimos', label: 'Empréstimos', icon: Banknote },
  { href: '/notificacoes', label: 'Notificações', icon: Bell },
  { href: '/dividas', label: 'Dívidas', icon: AlertOctagon },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, profile, family, isSuperAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (count !== null) setUnreadCount(count);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="bg-[#020617]/70 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-40">
      <NotificationPermissionModal />
      <NotificationManager />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Family name */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25 border border-indigo-400/30 group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-100 text-sm sm:text-base tracking-tight flex items-center gap-1.5">
                  Finanzza<span className="text-indigo-400">Auth</span>
                </span>
                {family?.name && (
                  <span className="block text-[11px] text-slate-400 font-medium -mt-0.5 truncate max-w-[140px] sm:max-w-[200px]">
                    Família <span className="text-indigo-300">{family.name}</span>
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/5 backdrop-blur-md">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action controls */}
          <div className="hidden lg:flex items-center gap-2.5">
            {isSuperAdmin && (
              <Link
                id="header-btn-admin"
                href="/admin"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  pathname.startsWith('/admin')
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Painel SuperAdmin
              </Link>
            )}

            <Link
              href="/notificacoes"
              title="Central de Notificações"
              className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl border border-white/5 text-xs transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-slate-900 shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-2 bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/5">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-200 text-xs font-bold shadow-inner">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden 2xl:block">
                <p className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {profile?.full_name || 'Usuário'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {profile?.role === 'owner' ? 'Admin Família' : 'Membro'}
                </p>
              </div>
            </div>

            <button
              id="header-btn-signout"
              onClick={() => signOut()}
              title="Encerrar Sessão"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl text-xs transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/5 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl px-4 py-3 space-y-2">
          {isSuperAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
            >
              <ShieldCheck className="w-4 h-4" />
              Painel SuperAdmin
            </Link>
          )}

          <div className="grid grid-cols-2 gap-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              <span>{profile?.full_name || 'Usuário'}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1 text-rose-400 font-medium hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      )}

      <NotificationPermissionModal />
      <NotificationManager />
      <SupabaseConfigModal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} />
    </header>
  );
}
