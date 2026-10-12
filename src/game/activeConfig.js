// Bu oturumda kullanılacak denge: varsayılan değerler + Remote Config'ten en son alınan değişiklikler.
// Remote Config oyun sırasında indirilir ama bir sonraki açılışta uygulanır; böylece fiyatlar oyuncunun
// gözü önünde değişmez. İzin verilmemişse önbellek hiç dolmaz ve oyun varsayılan dengeyle açılır.

import { readJSON } from '../lib/storage.js';
import { DEFAULT_CONFIG, mergeConfig } from './config.js';

export const REMOTE_CACHE_KEY = 'barista-clicker-remote-v1';

export function loadActiveConfig() {
  const cached = readJSON(REMOTE_CACHE_KEY);
  const override = cached && typeof cached === 'object' ? cached.economy : null;
  const { config, rejected } = mergeConfig(DEFAULT_CONFIG, override);
  return { config, rejected, remote: Boolean(override) };
}
