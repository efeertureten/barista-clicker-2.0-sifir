import { readJSON, writeJSON } from '../lib/storage.js';
import { LEGACY_SHOP_THRESHOLDS } from './config.js';
import { INITIAL_STATE, UPGRADE_IDS } from './economy.js';

export const SAVE_KEY = 'barista-clicker-save-v1';

export const hasSave = () => readJSON(SAVE_KEY) !== null;

const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);

function loadOffline(offline) {
  if (!offline || typeof offline !== 'object' || !(num(offline.coffees) > 0)) return null;
  return {
    coffees: num(offline.coffees),
    seconds: num(offline.seconds),
    away: num(offline.away),
    capped: Boolean(offline.capped),
  };
}

// 2.1'den önceki kayıtlarda seviye yazılmazdı, fincan sayısından eski eşiklerle hesaplanırdı.
// Eski oyuncu, yeni (daha yüksek) eşikler yüzünden ulaştığı dükkanı kaybetmesin diye o seviye korunur.
function loadLevel(save) {
  const max = LEGACY_SHOP_THRESHOLDS.length - 1;
  if (Number.isInteger(save.level)) return Math.min(Math.max(save.level, 0), max);
  return LEGACY_SHOP_THRESHOLDS.reduce((level, at, i) => (num(save.coffees) >= at ? i : level), 0);
}

// Kaydı okur ve doğrular: bozuk ya da elle değiştirilmiş değerler sıfıra çekilir
export function loadSave(initialSave) {
  const save = initialSave || readJSON(SAVE_KEY);
  if (!save || typeof save !== 'object') return INITIAL_STATE;
  return {
    money: num(save.money),
    coffees: num(save.coffees),
    earned: num(save.earned),
    clicks: Math.floor(num(save.clicks)),
    owned: Object.fromEntries(UPGRADE_IDS.map((id) => [id, Math.floor(num(save.owned?.[id]))])),
    level: loadLevel(save),
    reputation: Math.floor(num(save.reputation)),
    branches: Math.max(1, Math.floor(num(save.branches))),
    offline: loadOffline(save.offline),
  };
}

// Üretimin en son hesaba katıldığı an (ms). Oyun açılınca bu andan bugüne geçen süre "uzakta" sayılır.
// Kayıt yoksa ya da eski sürümden geliyorsa null. Saat geri alınmışsa şimdiye çekilir.
export function readLastActiveAt(initialSave) {
  const save = initialSave || readJSON(SAVE_KEY);
  const at = save?.lastActiveAt;
  return Number.isFinite(at) && at > 0 ? Math.min(at, Date.now()) : null;
}

export const writeSave = (state, lastActiveAt) => writeJSON(SAVE_KEY, { ...state, lastActiveAt });
