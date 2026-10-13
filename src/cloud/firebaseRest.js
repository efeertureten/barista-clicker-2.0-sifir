// Firebase'e SDK yerine doğrudan REST ile bağlanır: anonim giriş (Identity Toolkit) ve Firestore belgeleri.
// Bulut kaydı ve geri bildirim yalnızca birkaç belge okuyup yazdığı için tam SDK'ya (yüzlerce KB) gerek yok;
// bu dosya yalnızca oyuncu bu özelliklerden birini kullanınca çalışır.

import { FIREBASE_CONFIG } from '../analytics/firebaseConfig.js';
import { readJSON, writeJSON } from '../lib/storage.js';

const AUTH_KEY = 'barista-clicker-cloud-auth-v1';
const TIMEOUT_MS = 12_000;

export const firebaseAvailable = () => Boolean(FIREBASE_CONFIG?.apiKey && FIREBASE_CONFIG?.projectId);

export class CloudError extends Error {
  constructor(status, code, message) {
    super(message || code || `HTTP ${status}`);
    this.status = status; // HTTP durumu; 0 = ağ hatası
    this.code = code; // Google API durum adı: NOT_FOUND, FAILED_PRECONDITION, PERMISSION_DENIED…
  }
}

async function request(url, { method = 'GET', headers = {}, body, keepalive = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { method, headers, body, keepalive, signal: controller.signal });
  } catch (e) {
    throw new CloudError(0, 'NETWORK', e?.message);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = data?.error || {};
    throw new CloudError(res.status, err.status || err.message || `HTTP_${res.status}`, err.message);
  }
  return data;
}

/* ---- Anonim giriş ---- */

let session = null; // { idToken, uid, exp }

async function signUp() {
  const data = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  writeJSON(AUTH_KEY, { uid: data.localId, refreshToken: data.refreshToken });
  return { idToken: data.idToken, uid: data.localId, exp: Date.now() + Number(data.expiresIn || 3600) * 1000 };
}

async function refresh(refreshToken) {
  const data = await request(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  writeJSON(AUTH_KEY, { uid: data.user_id, refreshToken: data.refresh_token });
  return { idToken: data.id_token, uid: data.user_id, exp: Date.now() + Number(data.expires_in || 3600) * 1000 };
}

// Geçerli bir kimlik: bellekte varsa o, yoksa kayıtlı yenileme anahtarıyla, o da yoksa yeni anonim hesap
export async function signIn() {
  if (session && session.exp > Date.now() + 60_000) return session;
  const saved = readJSON(AUTH_KEY);
  if (saved?.refreshToken) {
    try {
      session = await refresh(saved.refreshToken);
      return session;
    } catch (e) {
      if (e.status === 0) throw e; // ağ yoksa yeni hesap açmayı denemenin anlamı yok
    }
  }
  session = await signUp();
  return session;
}

/* ---- Firestore belgeleri ---- */

const base = () =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

// Alan türleri açıkça verilir: { save: ['string', '…'], level: ['int', 3], earned: ['double', 1e15], savedAt: ['time', Date] }
// (büyük sayılar tamsayı olarak gönderilirse 64 bit sınırını aşabilir; bu yüzden kazanç her zaman double)
function encode(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, [type, value]]) => {
      if (type === 'string') return [key, { stringValue: String(value) }];
      if (type === 'int') return [key, { integerValue: String(Math.trunc(value)) }];
      if (type === 'double') return [key, { doubleValue: Number(value) }];
      if (type === 'time') return [key, { timestampValue: new Date(value).toISOString() }];
      throw new Error(`bilinmeyen alan türü: ${type}`);
    }),
  );
}

function decode(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, v]) => {
      if ('stringValue' in v) return [key, v.stringValue];
      if ('integerValue' in v) return [key, Number(v.integerValue)];
      if ('doubleValue' in v) return [key, Number(v.doubleValue)];
      if ('timestampValue' in v) return [key, Date.parse(v.timestampValue)];
      if ('booleanValue' in v) return [key, v.booleanValue];
      return [key, null];
    }),
  );
}

const auth = async () => ({ Authorization: `Bearer ${(await signIn()).idToken}` });

// Belge yoksa null. Dönen: { data, updateTime }
export async function getDoc(path) {
  try {
    const doc = await request(`${base()}/${path}`, { headers: await auth() });
    return { data: decode(doc.fields), updateTime: doc.updateTime };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

// Belgeyi baştan yazar. precondition: { exists: false } (yalnızca yoksa oluştur) ya da { updateTime } (araya
// başka yazma girmediyse). Koşul tutmazsa CloudError, code FAILED_PRECONDITION. Dönen: yeni updateTime
export async function setDoc(path, fields, { precondition, keepalive = false } = {}) {
  const query = precondition
    ? 'exists' in precondition
      ? `?currentDocument.exists=${precondition.exists}`
      : `?currentDocument.updateTime=${encodeURIComponent(precondition.updateTime)}`
    : '';
  const doc = await request(`${base()}/${path}${query}`, {
    method: 'PATCH',
    headers: { ...(await auth()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encode(fields) }),
    keepalive,
  });
  return doc.updateTime;
}

// Koleksiyona otomatik kimlikle yeni belge ekler
export async function addDoc(collection, fields) {
  const doc = await request(`${base()}/${collection}`, {
    method: 'POST',
    headers: { ...(await auth()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encode(fields) }),
  });
  return doc.name;
}

export async function deleteDoc(path) {
  try {
    await request(`${base()}/${path}`, { method: 'DELETE', headers: await auth() });
  } catch (e) {
    if (e.status !== 404) throw e;
  }
}

export const currentUid = () => session?.uid ?? readJSON(AUTH_KEY)?.uid ?? null;
