'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Bell,
  Landmark,
  MoreHorizontal,
  ChevronDown,
  Calculator,
  CircleDollarSign
} from 'lucide-react';
import { SupabaseConfigModal } from '@/components/auth/SupabaseConfigModal';
import { NotificationPermissionModal } from '@/components/notifications/NotificationPermissionModal';
import { NotificationManager } from '@/components/notifications/NotificationManager';
import { QuickCalculatorModal } from '@/components/calculator/QuickCalculatorModal';

// Primary tabs displayed directly in the header bar
const primaryNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/entradas', label: 'Entradas', icon: ArrowDownLeft },
  { href: '/despesas', label: 'Despesas', icon: ArrowUpRight },
  { href: '/contas', label: 'Contas', icon: Landmark },
  { href: '/cartoes', label: 'Cartões', icon: CreditCard },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

// Secondary items under the 3-dots menu
const secondaryNavItems = [
  { href: '/carteira', label: 'Carteira (Recarga)', icon: Wallet },
  { href: '/emprestimos', label: 'Empréstimos', icon: Banknote },
  { href: '/dividas', label: 'Dívidas', icon: AlertOctagon },
  { href: '/notificacoes', label: 'Notificações', icon: Bell },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

// Persist unread count and fetch timestamp globally to avoid redundant database calls on page changes
let globalUnreadCount = 0;
let globalLastUnreadFetch = 0;

const allNavItems = [...primaryNavItems, ...secondaryNavItems];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, family, isSuperAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(globalUnreadCount);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Defer prefetching slightly to allow the active page to load and settle with zero network contention
  useEffect(() => {
    const timer = setTimeout(() => {
      const allRoutes = [...primaryNavItems, ...secondaryNavItems];
      allRoutes.forEach((item) => {
        router.prefetch(item.href);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const now = Date.now();
      // Allow fetching at most once every 30 seconds across mounts
      if (now - globalLastUnreadFetch < 30000 && globalLastUnreadFetch > 0) {
        setUnreadCount(globalUnreadCount);
        return;
      }
      try {
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        if (count !== null) {
          globalUnreadCount = count;
          globalLastUnreadFetch = now;
          setUnreadCount(count);
        }
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close 3-dots dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSecondaryActive = secondaryNavItems.some(item => pathname === item.href);

  return (
    <>
      <NotificationPermissionModal />
      <NotificationManager />
      <SupabaseConfigModal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} />
      
      <header className="bg-[#020617]/80 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Family name */}
            <div className="flex items-center gap-4 lg:gap-6">
              <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-lg shadow-black/40 border border-white/10 group-hover:scale-105 transition-transform">
                  <img src="/logo_finanzza.jpg?v=3" alt="Logo Finanzza" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="font-black text-slate-100 text-sm sm:text-base tracking-tight flex items-center gap-1">
                    Finanzza<span className="text-emerald-400">Auth</span>
                  </span>
                  {family?.name && (
                    <span className="block text-[10px] sm:text-[11px] text-slate-400 font-medium -mt-0.5 truncate max-w-[110px] sm:max-w-[160px]">
                      Família <span className="text-blue-300">{family.name}</span>
                    </span>
                  )}
                </div>
              </Link>

              {/* Desktop Navigation Links with 3-dots */}
              <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/30'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* 3 Dots Menu Button for Extra Tabs */}
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    id="header-btn-more-tabs"
                    aria-label="Mais opções"
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isSecondaryActive || moreMenuOpen
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <span>Mais</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 3 Dots Dropdown Menu */}
                  {moreMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#0b1026] border border-[#1e2952] shadow-2xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
                        Outras Abas
                      </div>
                      {secondaryNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-md'
                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-blue-400" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Right Action controls */}
            <div className="hidden md:flex items-center gap-2">
              {isSuperAdmin && (
                <Link
                  id="header-btn-admin"
                  href="/admin"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    pathname?.startsWith('/admin')
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Painel</span> Admin
                </Link>
              )}

              <button
                type="button"
                onClick={() => setCalcModalOpen(true)}
                title="Calculadora Rápida"
                className="p-2 text-indigo-300 hover:text-indigo-200 hover:bg-white/5 rounded-xl border border-white/5 text-xs transition cursor-pointer flex items-center justify-center gap-1.5 font-bold"
              >
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span className="hidden xl:inline">Calculadora</span>
              </button>

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
                <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-200 text-xs font-bold shadow-inner">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden 2xl:block">
                  <p className="text-xs font-medium text-slate-200 truncate max-w-[110px]">
                    {profile?.full_name || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[110px]">
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

            {/* Mobile & Tablet 3-dots / Hamburger Toggle */}
            <div className="flex lg:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCalcModalOpen(true)}
                title="Calculadora Rápida"
                className="p-2 text-indigo-300 hover:text-indigo-200 hover:bg-white/5 border border-white/5 rounded-xl flex items-center justify-center cursor-pointer"
              >
                <Calculator className="w-5 h-5" />
              </button>

              <button
                id="btn-toggle-tabs-menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-xl border transition flex items-center justify-center gap-1 ${
                  mobileMenuOpen
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                    : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:bg-white/10'
                }`}
                title={mobileMenuOpen ? 'Fechar menu de abas' : 'Abrir menu de abas'}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <>
                    <Menu className="w-5 h-5" />
                    <MoreHorizontal className="w-4 h-4 hidden sm:block opacity-60" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Sliding Tabs Panel / Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#060a1a]/95 backdrop-blur-2xl px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MoreHorizontal className="w-4 h-4 text-blue-400" />
                Navegação & Abas
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 text-xs flex items-center gap-1 px-2 font-semibold"
              >
                <X className="w-3.5 h-3.5" />
                <span>Fechar</span>
              </button>
            </div>

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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md font-bold border border-blue-400/40' 
                        : 'text-slate-300 hover:bg-white/5 bg-white/[0.02] border border-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-slate-300">{profile?.full_name || 'Usuário'}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 text-rose-400 font-bold hover:text-rose-300 py-1 px-2 rounded-lg hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        )}
      </header>

      <QuickCalculatorModal
        isOpen={calcModalOpen}
        onClose={() => setCalcModalOpen(false)}
      />
    </>
  );
}
