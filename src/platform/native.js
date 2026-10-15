// Oyun tarayıcıda mı, Android uygulamasının (Capacitor) içinde mi çalışıyor? Uygulamaya özgü olaylar burada
// tek yerde toplanır; oyunun geri kalanı yalnızca bu dosyadaki işlevleri kullanır ve tarayıcıda aynen çalışır.
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export const PLATFORM = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'
export const IS_NATIVE = Capacitor.isNativePlatform();

// @capacitor/app yalnızca uygulamada yüklenir (web paketinde ayrı, hiç inmeyen bir parça olarak kalır)
let appPlugin = null;
const loadApp = () => {
  appPlugin ??= import('@capacitor/app').then((m) => m.App);
  return appPlugin;
};

/* ---- Görünürlük: tarayıcıda sekme, uygulamada ön plan / arka plan ---- */

// Uygulama arka plana geçince WebView'ın visibilitychange göndermesine güvenmek yerine Android'in kendi
// ön plan/arka plan olayı da dinlenir. İkisi birleştirilir; aynı durum iki kez bildirilmez.
let nativeHidden = false;
const subscribers = new Set();
let started = false;

export const isHidden = () => (typeof document !== 'undefined' && document.hidden) || nativeHidden;

const notify = () => subscribers.forEach((fn) => fn());

function start() {
  if (started || typeof document === 'undefined') return;
  started = true;
  document.addEventListener('visibilitychange', notify);
  if (IS_NATIVE) {
    loadApp()
      .then((App) =>
        App.addListener('appStateChange', ({ isActive }) => {
          nativeHidden = !isActive;
          notify();
        }),
      )
      .catch(() => {});
  }
}

// cb(hidden): yalnızca durum değişince çağrılır. Dönen işlev aboneliği kaldırır.
export function onVisibilityChange(cb) {
  start();
  let last = isHidden();
  const fn = () => {
    const hidden = isHidden();
    if (hidden === last) return;
    last = hidden;
    cb(hidden);
  };
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/* ---- Sistem çubukları ---- */

// Koyu zeminde (açılış ekranı) açık renk simgeler, oyunda koyu simgeler. Tarayıcıda hiçbir şey yapmaz.
export function setSystemBarsDark(dark) {
  if (!IS_NATIVE) return;
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
}

/* ---- Android geri tuşu ---- */

// handler(): açık bir pencereyi kapattıysa true döner. Kapatacak bir şey yoksa uygulama arka plana alınır
// (oyun kapanmaz; dönünce kaldığı yerden sürer). Tarayıcıda hiçbir şey yapmaz.
export function onBackButton(handler) {
  if (!IS_NATIVE) return () => {};
  let handle = null;
  let removed = false;
  loadApp()
    .then((App) =>
      App.addListener('backButton', () => {
        if (!handler()) App.minimizeApp();
      }),
    )
    .then((h) => {
      if (removed) h.remove();
      else handle = h;
    })
    .catch(() => {});
  return () => {
    removed = true;
    handle?.remove();
  };
}
