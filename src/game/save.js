import { readJSON, writeJSON } from '../lib/storage.js';
import { INITIAL_STATE } from './economy.js';

export const SAVE_KEY = 'barista-clicker-save-v1';

export const hasSave = () => readJSON(SAVE_KEY) !== null;

// Kaydı okur ve doğrular: bozuk ya da elle değiştirilmiş değerler sıfıra çekilir
export function loadSave(initialSave) {
  const save = initialSave || readJSON(SAVE_KEY);
  if (!save || typeof save !== 'object') return INITIAL_STATE;
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
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
  };
}

export const writeSave = (state) => writeJSON(SAVE_KEY, state);
