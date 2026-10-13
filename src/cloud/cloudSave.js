// Bulut kaydı: oyuncu açarsa ilerleme bir "kayıt kodu" altında Firestore'da saklanır. Kod hesap yerine geçer:
// başka bir cihazda (tarayıcı, telefon, Play sürümü) kodu yazan kaldığı yerden devam eder. Belge kimliği kodun
// kendisidir; kurallar listelemeyi yasakladığı için kodlar tahmin edilemez ve sayılamaz (30^12 ≈ 5×10^17).
//
// Çakışma: her yazma, son okunan/yazılan sürüme (updateTime) bağlıdır. Arada başka bir cihaz yazdıysa yazma
// reddedilir ve oyuncuya hangi kaydın kalacağı sorulur; hiçbir ilerleme sessizce ezilmez.

import { readJSON, writeJSON, writeText } from '../lib/storage.js';
import { CloudError, currentUid, deleteDoc, firebaseAvailable, getDoc, setDoc, signIn } from './firebaseRest.js';

const STATE_KEY = 'barista-clicker-cloud-v1';
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // karışan harfler yok: I, L, O, U, 0, 1
const CODE_LENGTH = 12;

export const cloudAvailable = firebaseAvailable;

/* ---- Kod ---- */

export function newCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  // 256 % 30 sapmasını önlemek için 240'ın üstü atılır
  let code = '';
  let i = 0;
  while (code.length < CODE_LENGTH) {
    if (i >= bytes.length) {
      crypto.getRandomValues(bytes);
      i = 0;
    }
    const b = bytes[i++];
    if (b < 240) code += ALPHABET[b % ALPHABET.length];
  }
  return code;
}

export const formatCode = (code) => (code ? code.match(/.{1,4}/g).join('-') : '');

// Oyuncunun yazdığı kod: boşluk ve tireler atılır, küçük harf büyür. Geçersizse null
export function normalizeCode(input) {
  const code = String(input || '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/* ---- Yerel durum ---- */

// { code, updateTime, pushedAt, fingerprint } ya da null (kapalı)
export const cloudState = () => {
  const s = readJSON(STATE_KEY);
  return s && typeof s.code === 'string' && normalizeCode(s.code) ? s : null;
};
const saveState = (s) => (s ? writeJSON(STATE_KEY, s) : writeText(STATE_KEY, null));

/* ---- Belge ---- */

// snapshot: { save, level, branch, earned, coffees, platform, appVersion }
function fields(snapshot) {
  return {
    save: ['string', JSON.stringify(snapshot.save)],
    level: ['int', snapshot.level],
    branch: ['int', snapshot.branch],
    earned: ['double', snapshot.earned],
    coffees: ['double', snapshot.coffees],
    platform: ['string', snapshot.platform],
    appVersion: ['string', snapshot.appVersion],
    savedAt: ['time', Date.now()],
    owner: ['string', currentUid() || ''],
  };
}

// Aynı ilerlemeyi tekrar tekrar yazmamak için kısa bir parmak izi. Üretim kazancı her an artırdığından kazanç
// %1'lik dilimlerle sayılır: yalnızca anlamlı ilerleme (alım, seviye, şube, Altın Çekirdek, seri, ~%1 kazanç) yazılır.
export const fingerprintOf = (snapshot) => {
  const save = snapshot.save || {};
  const owned = Object.values(save.owned || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  return [
    Math.round(Math.log10(1 + Math.max(0, snapshot.earned)) * 200),
    snapshot.level,
    snapshot.branch,
    save.gold ?? 0,
    owned,
    save.streak?.count ?? 0,
  ].join(':');
};

function summaryOf(doc) {
  if (!doc) return null;
  let save = null;
  try {
    save = JSON.parse(doc.data.save);
  } catch {
    save = null;
  }
  return {
    save,
    level: doc.data.level,
    branch: doc.data.branch,
    earned: doc.data.earned,
    coffees: doc.data.coffees,
    platform: doc.data.platform,
    appVersion: doc.data.appVersion,
    savedAt: doc.data.savedAt,
    updateTime: doc.updateTime,
  };
}

const isConflict = (e) =>
  e instanceof CloudError && ['FAILED_PRECONDITION', 'ALREADY_EXISTS', 'ABORTED', 'NOT_FOUND'].includes(e.code);

/* ---- İşlemler ---- */

// Bulut kaydını açar: yeni bir kod üretir ve ilk yedeği yazar. Dönen: kod
export async function enableCloud(snapshot) {
  await signIn();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    try {
      const updateTime = await setDoc(`saves/${code}`, fields(snapshot), { precondition: { exists: false } });
      saveState({ code, updateTime, pushedAt: Date.now(), fingerprint: fingerprintOf(snapshot) });
      return code;
    } catch (e) {
      if (!isConflict(e)) throw e; // aynı kod zaten varsa (neredeyse imkânsız) yenisini dene
    }
  }
  throw new CloudError(0, 'CODE_COLLISION');
}

// Yedekler. force: araya başka cihaz yazmış olsa da bu cihazdakini yaz (oyuncu seçtiyse).
// always: ilerleme değişmemiş olsa da yaz (oyuncu "Şimdi yedekle"ye bastı).
// Dönen: { ok: true } | { skipped: true } | { conflict: uzak kaydın özeti (null = bulutta silinmiş) }
export async function pushCloud(snapshot, { force = false, always = false, keepalive = false } = {}) {
  const state = cloudState();
  if (!state) return { skipped: true };
  const fingerprint = fingerprintOf(snapshot);
  if (!force && !always && state.fingerprint === fingerprint) return { skipped: true };
  await signIn(); // belgeye yazan kimlik (owner) alanlar hazırlanmadan bilinmeli
  try {
    const updateTime = await setDoc(`saves/${state.code}`, fields(snapshot), {
      precondition: force ? undefined : { updateTime: state.updateTime },
      keepalive,
    });
    saveState({ ...state, updateTime, pushedAt: Date.now(), fingerprint });
    return { ok: true };
  } catch (e) {
    if (!isConflict(e)) throw e;
    return { conflict: summaryOf(await getDoc(`saves/${state.code}`)) };
  }
}

// Açılışta: bu cihazın son bildiği sürümden sonra başka bir cihaz yazmış mı?
// Dönen: null (her şey yolunda) | { conflict: özet } | { gone: true } (kayıt başka cihazda kapatılmış)
export async function checkCloud() {
  const state = cloudState();
  if (!state) return null;
  const doc = await getDoc(`saves/${state.code}`);
  if (!doc) {
    saveState(null);
    return { gone: true };
  }
  return doc.updateTime === state.updateTime ? null : { conflict: summaryOf(doc) };
}

// Başka cihazdaki kaydı kodla bulur (yüklemeden önce oyuncuya gösterilir). Yoksa null
export async function findCloud(code) {
  return summaryOf(await getDoc(`saves/${code}`));
}

// Buluttaki kaydı bu cihaza alır: oyun kaydının yerine yazar ve bundan sonra bu kodla yedekler.
// Sayfa ardından yeniden yüklenmeli (oyun durumu kayıttan baştan kurulur).
export function adoptCloud(code, remote, saveKey) {
  writeJSON(saveKey, remote.save);
  saveState({ code, updateTime: remote.updateTime, pushedAt: Date.now(), fingerprint: null });
}

// Bu cihazdaki kaydı koruyup buluttakinin üstüne yazar (çakışmada "bu cihazdaki kalsın")
export const keepLocal = (snapshot) => pushCloud(snapshot, { force: true });

// Bulut kaydını kapatır; remove: buluttaki kopyayı da siler
export async function disableCloud({ remove = true } = {}) {
  const state = cloudState();
  if (state && remove) await deleteDoc(`saves/${state.code}`);
  saveState(null);
}
