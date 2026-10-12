// Oyun içi ölçüm. Olaylar yalnızca iki koşul birlikte sağlanınca gönderilir:
//   1) bir hedef var: Firebase yapılandırması (firebaseConfig.js) ya da hata ayıklama modu (?debug=1)
//   2) oyuncu veri iznine "Kabul et" dedi
// İzin beklenirken olaylar sırada tutulur; kabul edilirse gönderilir, reddedilirse silinir.
// Firebase kütüphanesi ayrı bir parça olarak yalnızca izin verildiğinde indirilir.

import { FIREBASE_CONFIG } from './firebaseConfig.js';
import { readText, writeText } from '../lib/storage.js';

const CONSENT_KEY = 'barista-clicker-consent-v1';
const DEBUG_KEY = 'barista-clicker-debug';
const MAX_QUEUE = 200;

let initialized = false;
let debug = false;
let consent = null; // 'granted' | 'denied' | null (henüz sorulmadı)
let backend = null;
let loading = false;
let queue = [];
const listeners = new Set();

/* ---- Durum ---- */

// ?debug=1 bu tarayıcıda hata ayıklamayı açar, ?debug=0 kapatır
function detectDebug() {
  try {
    const param = new URLSearchParams(window.location.search).get('debug');
    if (param !== null) writeText(DEBUG_KEY, param === '0' ? null : '1');
  } catch {
    /* adres okunamazsa kayıtlı tercihle devam */
  }
  return readText(DEBUG_KEY) === '1';
}

export const isConfigured = () => Boolean(FIREBASE_CONFIG) || debug;
export const needsConsent = () => isConfigured() && consent === null;
export const getConsent = () => consent;
const isEnabled = () => isConfigured() && consent === 'granted';

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ---- Hedefler ---- */

async function loadFirebase() {
  const [{ initializeApp }, lib] = await Promise.all([import('firebase/app'), import('firebase/analytics')]);
  if (!(await lib.isSupported())) return null;
  const instance = lib.getAnalytics(initializeApp(FIREBASE_CONFIG));
  return {
    log: (name, params) => lib.logEvent(instance, name, params),
    setUserProperties: (props) => lib.setUserProperties(instance, props),
    setEnabled: (on) => lib.setAnalyticsCollectionEnabled(instance, on),
  };
}

// Hata ayıklama: olayları konsola yazar ve testler için window.__bcAnalytics listesinde tutar
const consoleSink = () => ({
  log: (name, params) => {
    (window.__bcAnalytics ||= []).push({ name, params });
    console.info('[ölçüm]', name, params);
  },
  setUserProperties: (props) => {
    (window.__bcAnalytics ||= []).push({ name: 'user_properties', params: props });
    console.info('[ölçüm] oyuncu özellikleri', props);
  },
  setEnabled: () => {},
});

function start() {
  if (backend) {
    backend.setEnabled(true);
    flush();
    return;
  }
  if (loading) return;
  loading = true;
  (FIREBASE_CONFIG ? loadFirebase() : Promise.resolve(null))
    .catch(() => null)
    .then((firebase) => {
      loading = false;
      const sinks = [firebase, debug ? consoleSink() : null].filter(Boolean);
      if (sinks.length === 0) return;
      backend = {
        log: (n, p) => sinks.forEach((s) => s.log(n, p)),
        setUserProperties: (p) => sinks.forEach((s) => s.setUserProperties(p)),
        setEnabled: (on) => sinks.forEach((s) => s.setEnabled(on)),
      };
      if (consent === 'granted') flush();
      else backend.setEnabled(false);
    });
}

function flush() {
  if (!backend || !isEnabled()) return;
  const items = queue;
  queue = [];
  items.forEach(([kind, a, b]) => (kind === 'event' ? backend.log(a, b) : backend.setUserProperties(a)));
}

/* ---- Dışarıya açık işlemler ---- */

export function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  debug = detectDebug();
  const saved = readText(CONSENT_KEY);
  consent = saved === 'granted' || saved === 'denied' ? saved : null;

  // Web'de Crashlytics yok; yakalanmamış hatalar ölçüm olayı olarak gelir
  window.addEventListener('error', (e) =>
    track('app_error', { kind: 'error', message: String(e.message || '').slice(0, 100) }),
  );
  window.addEventListener('unhandledrejection', (e) =>
    track('app_error', { kind: 'promise', message: String(e.reason?.message || e.reason || '').slice(0, 100) }),
  );

  if (isEnabled()) start();
}

export function setConsent(value) {
  consent = value;
  writeText(CONSENT_KEY, value);
  if (value === 'granted') {
    start();
  } else {
    queue = [];
    backend?.setEnabled(false);
  }
  listeners.forEach((listener) => listener(consent));
}

// Parametreler: sayılar sonlu ve en çok 2 ondalık, metinler en çok 100 karakter, boş değerler atılır
function sanitize(params) {
  const out = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
    } else if (typeof value === 'boolean') {
      out[key] = value ? 1 : 0;
    } else {
      out[key] = String(value).slice(0, 100);
    }
  });
  return out;
}

export function track(name, params = {}) {
  if (!isConfigured() || consent === 'denied') return;
  const clean = sanitize(params);
  if (backend && isEnabled()) backend.log(name, clean);
  else if (queue.length < MAX_QUEUE) queue.push(['event', name, clean]);
}

export function setUserProperties(props) {
  if (!isConfigured() || consent === 'denied') return;
  const clean = sanitize(props);
  if (backend && isEnabled()) backend.setUserProperties(clean);
  else if (queue.length < MAX_QUEUE) queue.push(['props', clean]);
}
