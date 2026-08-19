'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ensureFreshToken } from '@/lib/auth';

// Converts the VAPID public key (base64url, as web-push generates it) into
// the raw byte array PushManager.subscribe expects — there's no built-in
// browser API for this conversion.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = 'unsupported' | 'unknown' | 'denied' | 'subscribed' | 'unsubscribed';

// Sits in the admin header. Browsers require an explicit user gesture to
// request notification permission — this can't safely auto-prompt on page
// load, both because most browsers block/ignore an unsolicited prompt and
// because an uninvited permission dialog is a bad first impression.
export function PushNotifications() {
  const [status, setStatus] = useState<Status>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? 'subscribed' : 'unsubscribed');
    });
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const { publicKey } = await api.get<{ publicKey: string | null }>('/push/vapid-public-key');
      if (!publicKey) {
        alert('Push notifications aren\'t configured on the server yet (missing VAPID keys).');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      const token = await ensureFreshToken();
      if (!token) { window.location.href = '/login'; return; }
      await api.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys }, token);
      setStatus('subscribed');
    } catch {
      alert('Could not enable notifications. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'unsupported' || status === 'subscribed') return status === 'subscribed' ? (
    <span className="text-xs text-status-hired flex items-center gap-1.5" title="New-applicant notifications are on">
      🔔 Notifications on
    </span>
  ) : null;

  if (status === 'denied') {
    return (
      <span className="text-xs text-ink/40" title="Notifications are blocked in your browser settings">
        Notifications blocked
      </span>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={busy}
      className="text-xs font-mono uppercase tracking-wide px-3 py-1.5 border border-line rounded-lg hover:bg-lineSoft/50 disabled:opacity-50"
    >
      {busy ? 'Enabling…' : '🔔 Enable notifications'}
    </button>
  );
}
