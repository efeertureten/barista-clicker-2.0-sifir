// localStorage gizli pencerede, kapalı site verisinde ya da bazı gömülü görünümlerde hata fırlatabilir.
// Buradaki yardımcılar her durumda sessizce geçer; oyun depolama olmadan da çalışır.

export function readJSON(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* depolama kapalıysa sessizce geç */
  }
}

export function readText(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeText(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* depolama kapalıysa sessizce geç */
  }
}

// Açık / kapalı tercihleri: kayıt yoksa açık sayılır
export const readPref = (key) => readText(key) !== 'off';
export const writePref = (key, on) => writeText(key, on ? 'on' : 'off');
