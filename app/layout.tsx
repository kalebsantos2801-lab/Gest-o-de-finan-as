import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/src/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Gestão Financeira Familiar — Finanzza',
  description: 'Sistema completo de controle financeiro familiar com Supabase Auth, controle de famílias, perfis e período de testes.',
  icons: {
    icon: '/logo_finanzza.jpg?v=3',
    shortcut: '/logo_finanzza.jpg?v=3',
    apple: '/logo_finanzza.jpg?v=3',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#020617] text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white relative overflow-x-hidden" suppressHydrationWarning>
        {/* Fixed Ambient Frosted Glass Glow Orbs - Optimized via hardware-accelerated Radial Gradients */}
        <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[650px] max-h-[650px] pointer-events-none -z-10 opacity-70" style={{ backgroundImage: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%)' }} />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] pointer-events-none -z-10 opacity-70" style={{ backgroundImage: 'radial-gradient(circle, rgba(16, 185, 129, 0.10) 0%, transparent 70%)' }} />
        <div className="fixed top-[40%] left-[50%] -translate-x-1/2 w-[35vw] h-[35vw] max-w-[500px] max-h-[500px] pointer-events-none -z-10 opacity-70" style={{ backgroundImage: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)' }} />
        
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
