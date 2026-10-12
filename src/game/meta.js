// Oyuncunun kurulum tarihi, oturum sayısı, aktif oyun süresi ve ilk deneyim adımları.
// Oyun kaydından ayrı tutulur: "Oyunu sıfırla" bunları silmez, böylece D1/D7 ölçümü bozulmaz.

import { readJSON, writeJSON } from '../lib/storage.js';

const META_KEY = 'barista-clicker-meta-v1';
const SESSION_GAP_MS = 30 * 60 * 1000; // 30 dakikadan uzun ara = yeni oturum (Google Analytics ile aynı)
const DAY_MS = 864e5;

const pad = (n) => String(n).padStart(2, '0');
const localDate = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
// Yerel takvim günü sayısı: kurulumdan sonraki "1. gün", saatten bağımsız olarak ertesi takvim günüdür
const dayNumber = (ts) => {
  const d = new Date(ts);
  return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS);
};

function readMeta(now, hadSave) {
  const saved = readJSON(META_KEY);
  if (saved && typeof saved === 'object' && Number.isFinite(saved.installedAt)) {
    return { meta: { sessions: 0, lastSeenAt: 0, activeSeconds: 0, ftue: {}, ...saved }, fresh: false };
  }
  // Ölçümden önce oynamaya başlamış oyuncunun gerçek kurulum tarihini bilemeyiz; "eski oyuncu" diye işaretlenir
  return {
    meta: { installedAt: now, sessions: 0, lastSeenAt: 0, activeSeconds: 0, ftue: {}, legacy: Boolean(hadSave) },
    fresh: true,
  };
}

export function createMeta({ hadSave }) {
  const { meta, fresh } = readMeta(Date.now(), hadSave);
  const persist = () => writeJSON(META_KEY, meta);

  return {
    // Bu açılışta ilk kez oluşturuldu ve oyun kaydı da yoktu: gerçekten yeni bir oyuncu
    isNewPlayer: fresh && !hadSave,

    // Rehber: { variant: guide|control|none, status: active|done|skipped|off, startedAt }
    // İlk çağrıda grup belirlenir ve kaydedilir; sonraki açılışlarda aynısı döner.
    tutorial(assign) {
      if (meta.tutorial) return { ...meta.tutorial, justAssigned: false };
      const variant = assign();
      meta.tutorial = { variant, status: variant === 'guide' ? 'active' : 'off', startedAt: Date.now() };
      persist();
      return { ...meta.tutorial, justAssigned: true };
    },
    setTutorialStatus(status) {
      if (!meta.tutorial) return;
      meta.tutorial.status = status;
      persist();
    },
    // Oyun açıldığında ve sekmeye geri dönüldüğünde çağrılır
    touchSession(now = Date.now()) {
      const away = meta.lastSeenAt ? now - meta.lastSeenAt : null;
      const isNew = away === null || away > SESSION_GAP_MS;
      if (isNew) meta.sessions += 1;
      meta.lastSeenAt = now;
      persist();
      return {
        isNew,
        sessionNumber: meta.sessions,
        awayMinutes: away === null ? null : Math.round(away / 60000),
        daysSinceInstall: dayNumber(now) - dayNumber(meta.installedAt),
      };
    },

    // Sekme görünürken düzenli aralıklarla çağrılır
    heartbeat(now, activeSeconds) {
      meta.lastSeenAt = now;
      meta.activeSeconds += activeSeconds;
      persist();
    },

    // İlk deneyim adımı ilk kez mi gerçekleşti? Evet ise kaydeder ve true döner
    markFtue(step, now = Date.now()) {
      if (meta.ftue[step]) return false;
      meta.ftue[step] = now;
      persist();
      return true;
    },

    get installCohort() {
      return localDate(meta.installedAt);
    },
    get activeMinutes() {
      return Math.round(meta.activeSeconds / 60);
    },
    get sessionNumber() {
      return meta.sessions;
    },
    get legacy() {
      return Boolean(meta.legacy);
    },
  };
}
