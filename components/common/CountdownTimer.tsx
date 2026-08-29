'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

export interface CountdownTimerProps {
  expiresAt: string | number | Date | null | undefined;
  variant?: 'plain' | 'badge' | 'card' | 'pill' | 'compact';
  showIcon?: boolean;
  className?: string;
}

export function CountdownTimer({ 
  expiresAt, 
  variant = 'plain', 
  showIcon = true,
  className = '' 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    isUrgent: boolean;
    formatted: string;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    isUrgent: false,
    formatted: 'Calculando...',
  });

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: false,
        isUrgent: false,
        formatted: 'Indeterminado',
      });
      return;
    }

    const calculate = () => {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();

      if (isNaN(target)) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: false,
          isUrgent: false,
          formatted: 'Data inválida',
        });
        return;
      }

      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          isUrgent: true,
          formatted: 'Tempo Esgotado',
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const isUrgent = diff < 24 * 60 * 60 * 1000; // Less than 24h

      let formatted = '';
      if (days > 0) {
        formatted += `${days}d `;
      }
      formatted += `${String(hours).padStart(2, '0')}h `;
      formatted += `${String(minutes).padStart(2, '0')}m `;
      formatted += `${String(seconds).padStart(2, '0')}s`;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        isUrgent,
        formatted: formatted.trim(),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Variant: COMPACT (for top navigation header)
  if (variant === 'compact') {
    return (
      <div 
        id="header-countdown-pill"
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all duration-300 ${
          timeLeft.isExpired
            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            : timeLeft.isUrgent
            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10 animate-pulse'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
        } ${className}`}
        title={`Tempo restante de acesso: ${timeLeft.formatted}`}
      >
        {showIcon && (
          <Clock className={`w-3.5 h-3.5 shrink-0 ${
            timeLeft.isExpired ? 'text-rose-400' : timeLeft.isUrgent ? 'text-amber-400 animate-spin-slow' : 'text-emerald-400'
          }`} />
        )}
        <span className="tabular-nums font-mono">{timeLeft.formatted}</span>
      </div>
    );
  }

  // Variant: BADGE or PILL
  if (variant === 'badge' || variant === 'pill') {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold border backdrop-blur-md transition-all ${
          timeLeft.isExpired
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            : timeLeft.isUrgent
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/10'
            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        } ${className}`}
      >
        {showIcon && (
          timeLeft.isExpired ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : timeLeft.isUrgent ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )
        )}
        <span className="tabular-nums font-mono">{timeLeft.formatted}</span>
      </div>
    );
  }

  // Variant: CARD (compact, sleek widget for dashboard)
  if (variant === 'card') {
    const formattedExpiryDate = expiresAt ? (() => {
      const d = new Date(expiresAt);
      return isNaN(d.getTime()) 
        ? '' 
        : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    })() : '';

    return (
      <div 
        id="dashboard-trial-card"
        className={`relative overflow-hidden rounded-2xl border px-4 py-2.5 sm:px-5 sm:py-3 transition-all ${
          timeLeft.isExpired
            ? 'bg-rose-950/20 border-rose-500/25'
            : timeLeft.isUrgent
            ? 'bg-amber-950/20 border-amber-500/25'
            : 'bg-white/[0.03] border-white/10'
        } ${className}`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              timeLeft.isExpired 
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                : timeLeft.isUrgent 
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
            }`}>
              <Clock className="w-4 h-4" />
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                Tempo de Acesso:
              </span>
              <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                timeLeft.isExpired
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : timeLeft.isUrgent
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {timeLeft.isExpired ? 'Expirado' : timeLeft.isUrgent ? 'Expira em breve' : 'Ativo'}
              </span>

              {formattedExpiryDate && (
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  • Término: <strong className="text-slate-300 font-mono font-normal">{formattedExpiryDate}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center sm:justify-end gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">Restante:</span>
            <strong className={`font-mono text-sm sm:text-base font-bold tracking-tight tabular-nums px-2.5 py-0.5 rounded-lg bg-black/30 border border-white/5 ${
              timeLeft.isExpired ? 'text-rose-400' : timeLeft.isUrgent ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {timeLeft.formatted}
            </strong>
          </div>
        </div>
      </div>
    );
  }

  // Variant: PLAIN (Default)
  return (
    <strong className={`font-mono text-xs sm:text-sm tracking-tight tabular-nums ${
      timeLeft.isExpired ? 'text-rose-400 font-bold' : timeLeft.isUrgent ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'
    } ${className}`}>
      {timeLeft.formatted}
    </strong>
  );
}
