import { getSupabaseClient } from './supabase';

export const VAPID_PUBLIC_KEY =
  'BFRhgkUowMxhl6-iV-eUoC-SIeR4_7yzHhOgeiFJ20qLtOFiiPnNI6gPJfkUFFUxVGQn7-xEvtXfqWXf3WkJfrc';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPushPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker tidak disokong oleh browser ini.');
  }
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export function getStoredUserPhone(): string | null {
  try {
    const raw = localStorage.getItem('cimb_cashplus_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.phone || null;
  } catch {
    return null;
  }
}

export async function enablePushNotifications(targetPhone?: string) {
  if (!('Notification' in window)) {
    throw new Error('Notifications API tidak disokong oleh browser ini.');
  }

  const registration = await registerPushServiceWorker();
  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Kebenaran (permission) notifikasi tidak diberikan oleh pelayar.');
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  const keys = json.keys || {};
  if (!json.endpoint || !keys.p256dh || !keys.auth) {
    throw new Error('Push subscription tidak lengkap.');
  }

  const phone = targetPhone || getStoredUserPhone();

  try {
    if (phone) {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('cimb_push_subscriptions').upsert(
        {
          phone,
          endpoint: json.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (error && !/duplicate|unique/i.test(error.message)) {
        console.warn('[Push] Error saving to cimb_push_subscriptions:', error.message);
      } else {
        console.log('[Push] Subscription recorded in cimb_push_subscriptions for phone:', phone);
      }
    } else {
      console.warn('[Push] No active phone found; subscription will be linked upon login.');
    }
  } catch (err) {
    console.warn('[Push] Database save failed (continuing local push):', err);
  }

  return subscription;
}

export async function syncPushSubscriptionWithUser(phone: string): Promise<boolean> {
  if (!isPushSupported() || !phone) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;

    const json = sub.toJSON();
    const keys = json.keys || {};
    if (!json.endpoint || !keys.p256dh || !keys.auth) return false;

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('cimb_push_subscriptions').upsert(
      {
        phone,
        endpoint: json.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (!error) {
      console.log('[Push] Successfully synced subscription with user phone:', phone);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Push] Failed to sync push subscription:', err);
    return false;
  }
}

export async function unsubscribePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      // Deactivate in database if possible
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('cimb_push_subscriptions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('endpoint', endpoint);
      } catch {}

      return true;
    }
    return false;
  } catch (err) {
    console.error('[Push] Failed to unsubscribe:', err);
    return false;
  }
}


export async function showIncomingNotification(
  title: string,
  body: string,
  data: { chat_id?: string | null; wa_message_id?: string | null; url?: string; [key: string]: any } = {},
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'cimb-notification-' + Date.now(),
      renotify: true,
      vibrate: [100, 50, 100],
      data: { url: data.url || '/', ...data },
    } as NotificationOptions);
    return true;
  } catch {
    // Fallback to postMessage or standard Notification
    try {
      if (typeof Notification !== 'undefined') {
        new Notification(title, { body, icon: '/pwa-192x192.png' });
        return true;
      }
    } catch {}
    return false;
  }
}

export async function sendTestNotification(): Promise<boolean> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Sila benarkan notifikasi dalam tetapan pelayar anda.');
  }

  return showIncomingNotification(
    'CIMB Cash Plus - Ujian Notifikasi',
    'Notifikasi PWA aktif! Anda akan menerima kemas kini status pinjaman dan sembang secara masa nyata.',
    { url: '/' },
  );
}
