'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { triggerNativeNotification, decodeNotificationMessage, playBellChime } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import { Bell, X, Volume2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InAppToast {
  id: string;
  title: string;
  body: string;
  url: string;
}

export function NotificationManager() {
  const { user } = useAuth();
  const router = useRouter();
  const lastCheckRef = useRef<number>(0);
  const [toasts, setToasts] = useState<InAppToast[]>([]);

  const runNotificationCheck = useCallback(async () => {
    if (!user) return;

    // Prevent checking more than once every 60 seconds
    const now = Date.now();
    if (now - lastCheckRef.current < 60000) return;
    lastCheckRef.current = now;

    try {
      const res = await fetch(`/api/notifications/check-and-send?userId=${user.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.sent > 0 && Array.isArray(data.notifications)) {
          // Trigger native push / browser notification for newly sent notifications
          for (const item of data.notifications) {
            triggerNativeNotification({
              title: item.title,
              body: item.message,
              url: item.target_url || '/notificacoes',
              silent: true,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Background notification check error:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial check on mount
    runNotificationCheck();

    // Periodic interval check every 5 minutes
    const interval = setInterval(() => {
      runNotificationCheck();
    }, 5 * 60 * 1000);

    // Listen to our custom in-app toast event to display sliding cards
    const handleInAppToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; body: string; url: string; silent?: boolean }>;
      const { title, body, url, silent } = customEvent.detail;
      
      const newToast: InAppToast = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        title,
        body,
        url: url || '/notificacoes',
      };

      // Play sound
      if (!silent) {
        playBellChime();
      }

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 6000);
    };

    window.addEventListener('show-in-app-toast', handleInAppToast);

    // Realtime Supabase subscription for new notifications with a unique channel name to prevent re-subscribe errors
    const channelId = `user_notifications_${user.id}_${Math.random().toString(36).substring(2, 10)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as { title?: string; message?: string; target_url?: string };
          if (newNotif?.title && newNotif?.message) {
            const { cleanMessage, target_url } = decodeNotificationMessage(newNotif.message);
            triggerNativeNotification({
              title: newNotif.title,
              body: cleanMessage,
              url: newNotif.target_url || target_url || '/notificacoes',
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener('show-in-app-toast', handleInAppToast);
      supabase.removeChannel(channel);
    };
  }, [user, runNotificationCheck]);

  const handleToastClick = (toast: InAppToast) => {
    router.push(toast.url);
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
  };

  const handleCloseToast = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleToastClick(toast)}
          className="bg-slate-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 cursor-pointer hover:border-indigo-400/60 transition group relative overflow-hidden"
        >
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 group-hover:scale-105 transition shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white pr-2 block truncate">{toast.title}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">{toast.body}</p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-300">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Som de sino reproduzido 🔊</span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-0.5 hover:underline">
                Ver detalhes <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>

          <button
            onClick={(e) => handleCloseToast(toast.id, e)}
            className="absolute top-3.5 right-3 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
