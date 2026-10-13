// Android uygulaması arka plana geçerken kurulan hatırlatmalar. Saf fonksiyon: ne zaman, hangi metinle
// bildirim gideceğini hesaplar; kurmak platform/notifications.js'in işi. Oyuncu oyuna dönünce hepsi iptal edilir,
// arka plana her geçişte baştan kurulur. En fazla üç bildirim bekler; gece (22:00–09:00) hiç bildirim gitmez.

import { dayKeyOf } from './orders.js';

export const REMINDER_IDS = { storage: 101, orders: 102, comeback: 103 };

const QUIET_START = 22;
const QUIET_END = 9;
const ORDERS_EVENING = 19;
const ORDERS_MORNING = 10;
const COMEBACK_DAYS = 3;

const atHour = (base, dayOffset, hour) => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

// Sessiz saatlere düşen zamanı sabah 09:00'a kaydırır
export function outsideQuietHours(ms) {
  const h = new Date(ms).getHours();
  if (h >= QUIET_START) return atHour(ms, 1, QUIET_END);
  if (h < QUIET_END) return atHour(ms, 0, QUIET_END);
  return ms;
}

// input: { now, cps, price, offline: { efficiency, capSeconds }, daily, streak (canlı seri, gün), fmtMoney }
export function planReminders({ now, cps, price, offline, daily, streak = 0, fmtMoney }) {
  const plan = [];

  // 1) Depo doldu: üretim varsa, depo dolduğu an (sessiz saatlerdeyse sabah)
  if (cps > 0) {
    const value = cps * offline.efficiency * offline.capSeconds * price;
    plan.push({
      id: REMINDER_IDS.storage,
      kind: 'storage',
      at: outsideQuietHours(now + offline.capSeconds * 1000),
      title: 'Depon doldu',
      body: `${fmtMoney(value)} değerinde kahve seni bekliyor. Daha fazlası birikmiyor; gel topla.`,
    });
  }

  // 2) Siparişler: bugünküler bitmediyse akşam 19:00'da, bittiyse yarın sabah 10:00'da
  const today = dayKeyOf(now);
  const left = daily?.day === today ? daily.orders.filter((o) => !o.claimed).length : 3;
  const evening = atHour(now, 0, ORDERS_EVENING);
  if (left > 0 && now < evening - 30 * 60 * 1000) {
    plan.push({
      id: REMINDER_IDS.orders,
      kind: 'orders_left',
      at: evening,
      title: streak >= 2 ? `Serin ${streak} gün, bugün bozulmasın` : 'Siparişlerin seni bekliyor',
      body: `Bugün teslim edilmeyi bekleyen ${left} sipariş var.`,
    });
  } else {
    plan.push({
      id: REMINDER_IDS.orders,
      kind: 'orders_new',
      at: atHour(now, 1, ORDERS_MORNING),
      title: 'Günün siparişleri hazır',
      body:
        streak >= 1
          ? `Serin ${streak} gün. Bugünkü siparişlerle uzat, Altın Çekirdek kazan.`
          : '3 yeni sipariş geldi: teslim et, Altın Çekirdek kazan.',
    });
  }

  // 3) Uzun ara: üç gün sonra akşam, tek bir kez
  plan.push({
    id: REMINDER_IDS.comeback,
    kind: 'comeback',
    at: atHour(now, COMEBACK_DAYS, ORDERS_EVENING),
    title: 'Dükkânın seni özledi',
    body: 'Baristalar sen yokken de demledi; depo çoktan doldu.',
  });

  return plan.sort((a, b) => a.at - b.at);
}
