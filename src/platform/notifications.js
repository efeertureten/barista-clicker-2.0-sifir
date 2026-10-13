// Yerel bildirimler (yalnızca Android uygulamasında). Ne zaman ne gönderileceğini game/reminders.js hesaplar;
// burası izni sorar, bildirimleri kurar ve iptal eder. Tarayıcıda hiçbir şey yapmaz.
//
// Testler için: adreste ?debug=1&fakeNotify=1 varsa tarayıcıda sahte bir bildirim katmanı kullanılır; izin ve
// kurulan bildirimler window.__bcNotifications'a yazılır (izin cevabı: localStorage barista-clicker-fake-notify).

import { IS_NATIVE } from './native.js';
import { REMINDER_IDS } from '../game/reminders.js';

const CHANNEL = 'dukkan';
const IDS = Object.values(REMINDER_IDS).map((id) => ({ id }));

const fakeEnabled = () =>
  typeof window !== 'undefined' && /[?&]debug=1\b/.test(window.location.search) && /[?&]fakeNotify=1\b/.test(window.location.search);

function makeFake() {
  const log = (window.__bcNotifications = { permission: 'prompt', scheduled: [], calls: [] });
  const answer = () => {
    try {
      return window.localStorage.getItem('barista-clicker-fake-notify') || 'granted';
    } catch {
      return 'granted';
    }
  };
  return {
    checkPermissions: async () => ({ display: log.permission }),
    requestPermissions: async () => {
      log.permission = answer();
      log.calls.push('request');
      return { display: log.permission };
    },
    createChannel: async () => log.calls.push('channel'),
    schedule: async ({ notifications }) => {
      log.calls.push('schedule');
      log.scheduled = notifications.map((n) => ({ ...n, at: n.schedule.at.getTime() }));
    },
    cancel: async () => {
      log.calls.push('cancel');
      log.scheduled = [];
    },
    addListener: async () => ({ remove() {} }),
  };
}

let pluginPromise = null;
const load = () => {
  pluginPromise ??= fakeEnabled()
    ? Promise.resolve(makeFake())
    : import('@capacitor/local-notifications').then((m) => m.LocalNotifications);
  return pluginPromise;
};

export const notificationsSupported = () => IS_NATIVE || fakeEnabled();

// 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
export async function notificationPermission() {
  return (await (await load()).checkPermissions()).display;
}

export async function requestNotificationPermission() {
  return (await (await load()).requestPermissions()).display === 'granted';
}

// Arka plana geçmeden önce eklentiyi hazır tut (arka planda dinamik içe aktarma beklemesin)
export const preloadNotifications = () => load().catch(() => {});

let channel = null;
const ensureChannel = (plugin) => {
  channel ??= Promise.resolve(
    plugin.createChannel({
      id: CHANNEL,
      name: 'Dükkân hatırlatmaları',
      description: 'Depo dolunca ve günün siparişleri gelince',
      importance: 3,
      visibility: 1,
    }),
  ).catch(() => {});
  return channel;
};

// plan: game/reminders.js'in çıktısı. Öncekiler iptal edilir, yenileri kurulur.
// Kesin alarm istenmez (isExactNotification: false): sistem "Alarmlar ve hatırlatıcılar" ayarını açmaz,
// bildirim birkaç dakika gecikebilir.
export async function scheduleReminders(plan) {
  const plugin = await load();
  await plugin.cancel({ notifications: IDS });
  if (!plan.length) return;
  await ensureChannel(plugin);
  await plugin.schedule({
    notifications: plan.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: new Date(n.at), allowWhileIdle: true },
      channelId: CHANNEL,
      smallIcon: 'ic_stat_cup',
      iconColor: '#9C5F1E',
      autoCancel: true,
      isExactNotification: false,
      extra: { kind: n.kind },
    })),
  });
}

export async function cancelReminders() {
  await (await load()).cancel({ notifications: IDS });
}

// Oyuncu bir bildirime dokunup oyunu açınca cb(kind)
export function onReminderOpen(cb) {
  let handle = null;
  let removed = false;
  load()
    .then((plugin) => plugin.addListener('localNotificationActionPerformed', (e) => cb(e?.notification?.extra?.kind || 'unknown')))
    .then((h) => {
      if (removed) h?.remove();
      else handle = h;
    })
    .catch(() => {});
  return () => {
    removed = true;
    handle?.remove();
  };
}
