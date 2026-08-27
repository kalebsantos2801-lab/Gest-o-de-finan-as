import { supabase } from '@/lib/supabase';
import { PushSubscriptionRecord, NotificationSettings } from '@/types/database';

export interface SubscriptionOptions {
  userId: string;
  familyId?: string | null;
}

// Convert VAPID key helper
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Detect device type (Android, iOS, Desktop)
export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'Web';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Celular Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'Celular iOS';
  if (/mac/i.test(ua)) return 'Mac OS';
  if (/win/i.test(ua)) return 'Windows Desktop';
  if (/linux/i.test(ua)) return 'Linux Desktop';
  return 'Navegador Web';
}

// Check if Push Notifications are supported
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Get current permission status ('default' | 'granted' | 'denied')
export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

// Register Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Error registering Service Worker:', err);
    return null;
  }
}

// Request Notification Permission & Save Subscription to Supabase
export async function requestAndSavePushSubscription(
  userId: string,
  familyId?: string | null,
  showWelcome: boolean = false
): Promise<{ success: boolean; permission: NotificationPermission; error?: string }> {
  if (!isPushSupported()) {
    return {
      success: false,
      permission: 'denied',
      error: 'Notificações push não são suportadas neste navegador/dispositivo.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, permission, error: 'Permissão de notificação recusada pelo usuário.' };
    }

    const registration = await registerServiceWorker();
    const deviceType = getDeviceType();

    let subscriptionJSON: Record<string, unknown> = {};
    let endpointStr = '';

    if (registration && 'pushManager' in registration) {
      try {
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          const options: PushSubscriptionOptionsInit = {
            userVisibleOnly: true,
          };
          if (vapidKey) {
            options.applicationServerKey = urlBase64ToUint8Array(vapidKey);
          }
          subscription = await registration.pushManager.subscribe(options);
        }

        if (subscription) {
          subscriptionJSON = subscription.toJSON() as Record<string, unknown>;
          endpointStr = subscription.endpoint || '';
        }
      } catch (pushErr) {
        console.warn('PushManager subscription warning (falling back to native web notifications):', pushErr);
      }
    }

    // Upsert subscription into Supabase push_subscriptions table
    const pushToken = endpointStr || `token_${userId}_${Date.now()}`;
    
    // Save to localStorage as dynamic fallback
    if (typeof window !== 'undefined') {
      const fallbackObj = {
        id: `local_${Date.now()}`,
        user_id: userId,
        family_id: familyId || null,
        device_type: deviceType,
        push_token: pushToken,
        endpoint: endpointStr || null,
        subscription_data: subscriptionJSON,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      };
      localStorage.setItem('financas_active_push_subscription_' + userId, JSON.stringify(fallbackObj));
    }

    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        family_id: familyId || null,
        device_type: deviceType,
        push_token: pushToken,
        endpoint: endpointStr || null,
        subscription_data: subscriptionJSON,
        is_active: true,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' }
    );

    if (dbError) {
      console.warn('Notice saving push subscription to Supabase:', dbError.message);
    }

    // Ensure user notification settings exist
    await ensureNotificationSettings(userId, familyId);

    // Show a welcome native notification right away to confirm setup
    if (showWelcome) {
      await triggerNativeNotification({
        title: '🔔 Finanças Familiar',
        body: 'Notificações ativadas com sucesso! Você receberá avisos sobre vencimentos de faturas, contas e parcelas.',
        url: '/notificacoes',
      });
    }

    return { success: true, permission };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao ativar notificações';
    return { success: false, permission: Notification.permission, error: msg };
  }
}

// Synthesize a beautiful crystal-clear bell chime sound using Web Audio API
export function playBellChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Create a synthesized bell sound (chime)
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      // Decay curve for a bell/chime sound
      gainNode.gain.setValueAtTime(volume, start);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    // Chime has a fundamental frequency and harmonics for a bell-like timbre
    // Primary chime note: E5 (659.25 Hz)
    playTone(659.25, now, 1.5, 0.4);
    // Harmonics
    playTone(987.77, now, 1.2, 0.2); // B5
    playTone(1318.51, now, 0.8, 0.1); // E6
    playTone(1975.53, now, 0.5, 0.05); // B6
  } catch (err) {
    console.error('Error playing synthesized bell chime:', err);
  }
}

// Trigger a native OS notification
export async function triggerNativeNotification({
  title,
  body,
  url = '/notificacoes',
  icon = '/icon-192.png',
  silent = false,
}: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  silent?: boolean;
}) {
  // Always trigger the in-app visual toast event so users see it even if browser permission is blocked!
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('show-in-app-toast', {
        detail: { title, body, url, silent },
      })
    );
  }

  // Only play the synthesized bell chime sound in-app when NOT silent!
  if (!silent) {
    playBellChime();
  }

  if (!isPushSupported() || Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.showNotification) {
      await registration.showNotification(title, {
        body,
        icon,
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        renotify: true,
        tag: 'financas-notification-' + Date.now(),
        data: { url },
      } as NotificationOptions);
    } else {
      const n = new Notification(title, {
        body,
        icon,
        data: { url },
      });
      n.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  } catch (err) {
    console.warn('Native notification error:', err);
  }
}

// Ensure default user notification settings in DB
export async function ensureNotificationSettings(userId: string, familyId?: string | null): Promise<NotificationSettings | null> {
  const defaultSettings: NotificationSettings = {
    id: 'default',
    user_id: userId,
    family_id: familyId || null,
    bills_enabled: true,
    cards_enabled: true,
    invoices_enabled: true,
    installments_enabled: true,
    loans_enabled: true,
    budget_enabled: true,
    goals_enabled: true,
    trial_enabled: true,
    advance_days: 3,
    quiet_hours_start: '21:00',
    quiet_hours_end: '08:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing && !fetchError) return existing as NotificationSettings;

    // Use localStorage fallback if table is missing or fetch error
    if (fetchError || !existing) {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('financas_notification_settings_' + userId);
        if (local) {
          try {
            return JSON.parse(local) as NotificationSettings;
          } catch {
            // ignore JSON parse errors
          }
        }
      }
    }

    const { data: created, error: insertError } = await supabase
      .from('notification_settings')
      .insert({
        user_id: userId,
        family_id: familyId || null,
        bills_enabled: true,
        cards_enabled: true,
        invoices_enabled: true,
        installments_enabled: true,
        loans_enabled: true,
        budget_enabled: true,
        goals_enabled: true,
        trial_enabled: true,
        advance_days: 3,
        quiet_hours_start: '21:00',
        quiet_hours_end: '08:00',
      })
      .select()
      .maybeSingle();

    if (created && !insertError) {
      return created as NotificationSettings;
    }

    // fallback to local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('financas_notification_settings_' + userId, JSON.stringify(defaultSettings));
    }
    return defaultSettings;
  } catch (err) {
    console.error('Error ensuring notification settings, returning local fallback:', err);
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('financas_notification_settings_' + userId);
      if (local) {
        try {
          return JSON.parse(local) as NotificationSettings;
        } catch {
          // ignore
        }
      }
      localStorage.setItem('financas_notification_settings_' + userId, JSON.stringify(defaultSettings));
    }
    return defaultSettings;
  }
}

// Fetch active subscriptions for user
export async function getActiveSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!error && data) {
      return data as PushSubscriptionRecord[];
    }
  } catch (err) {
    console.error('Error getting active subscriptions from Supabase:', err);
  }

  // fallback to local storage
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('financas_active_push_subscription_' + userId);
    if (local) {
      try {
        return [JSON.parse(local)] as PushSubscriptionRecord[];
      } catch {
        // ignore
      }
    }
  }
  return [];
}

// Encode metadata into message body as fallback for missing columns
export function encodeNotificationMessage(message: string, type: string, refId: string, targetUrl: string): string {
  return `${message}\n[meta:type=${type};ref=${refId};url=${targetUrl}]`;
}

// Decode metadata from message body
export function decodeNotificationMessage(fullMessage: string): {
  cleanMessage: string;
  type?: string;
  reference_id?: string;
  target_url?: string;
} {
  if (!fullMessage) {
    return { cleanMessage: '' };
  }
  const metaRegex = /\n\[meta:type=([^;]*);ref=([^;]*);url=([^\]]*)\]/;
  const match = fullMessage.match(metaRegex);
  if (match) {
    return {
      cleanMessage: fullMessage.replace(metaRegex, ''),
      type: match[1] || undefined,
      reference_id: match[2] || undefined,
      target_url: match[3] || undefined,
    };
  }
  return {
    cleanMessage: fullMessage,
    type: undefined,
    reference_id: undefined,
    target_url: undefined,
  };
}

