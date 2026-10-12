// Remote Config: Firebase konsolundaki "economy" parametresini (JSON) indirir ve bir sonraki açılış için saklar.
// Yalnızca oyuncu veri iznini verdiğinde ve Firebase yüklendiğinde çalışır (analytics.js çağırır).
//
// Parametre yoksa ya da boşsa saklanan değişiklik silinir ve oyun bir sonraki açılışta varsayılan dengeye döner.
// JSON bozuksa önceki geçerli değer korunur. Alan alan doğrulama game/config.js içindeki mergeConfig'te.

import { DEFAULT_CONFIG, mergeConfig } from '../game/config.js';
import { REMOTE_CACHE_KEY } from '../game/activeConfig.js';
import { writeJSON, writeText } from '../lib/storage.js';

export const PARAM = 'economy';
const FETCH_INTERVAL_MS = 60 * 60 * 1000; // aynı tarayıcı en fazla saatte bir sorar

export async function refreshRemoteConfig(app, { debug = false } = {}) {
  const { getRemoteConfig, fetchAndActivate, getValue } = await import('firebase/remote-config');
  const rc = getRemoteConfig(app);
  rc.settings.minimumFetchIntervalMillis = debug ? 0 : FETCH_INTERVAL_MS;
  rc.settings.fetchTimeoutMillis = 10_000;
  await fetchAndActivate(rc);

  const value = getValue(rc, PARAM);
  const raw = value.getSource() === 'remote' ? value.asString().trim() : '';
  if (!raw) {
    writeText(REMOTE_CACHE_KEY, null);
    return { status: 'default' };
  }
  let economy;
  try {
    economy = JSON.parse(raw);
  } catch {
    return { status: 'invalid-json' };
  }
  const { config, rejected } = mergeConfig(DEFAULT_CONFIG, economy);
  writeJSON(REMOTE_CACHE_KEY, { economy, fetchedAt: Date.now() });
  return { status: 'saved', version: config.version, rejected };
}
