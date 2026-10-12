import { readJSON, writeJSON } from '../lib/storage.js';
import { INITIAL_STATE } from './economy.js';

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

// Kaydı okur ve doğrular: bozuk ya da elle değiştirilmiş değerler sıfıra çekilir
export function loadSave(initialSave) {
  const save = initialSave || readJSON(SAVE_KEY);
  if (!save || typeof save !== 'object') return INITIAL_STATE;
  return {
    money: num(save.money),
    coffees: num(save.coffees),
    earned: num(save.earned),
    clicks: Math.floor(num(save.clicks)),
    owned: {
      beans: Math.floor(num(save.owned?.beans)),
      machine: Math.floor(num(save.owned?.machine)),
      barista: Math.floor(num(save.owned?.barista)),
    },
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
