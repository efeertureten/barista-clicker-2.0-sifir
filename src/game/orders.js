// Günlük siparişler ve seri. Saf fonksiyonlar; oyun durumu economy.js'teki reducer'da tutulur.
//
// Her takvim günü 3 sipariş gelir (dört türden üçü). Hedefler, sipariş üretildiği andaki oyuncu gücüne göre
// ölçeklenir: kısa bir oturumda yapılabilir olsunlar. Teslim edilen her sipariş para ve Altın Çekirdek verir;
// üçü birden teslim edilince ek Altın Çekirdek gelir.
// Seri: en az bir sipariş teslim edilen her gün sayılır. Kaçırılan gün seriyi sıfırlamaz, dondurma hakkı
// harcanır; hak kalmadıysa seri baştan başlar. Her 7 günde bir hak geri gelir.

export const ORDER_TYPES = ['tap', 'brew', 'buy', 'collect'];

const pad = (n) => String(n).padStart(2, '0');

// Yerel takvim günü: 'YYYY-MM-DD'
export function dayKeyOf(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysBetween(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}

// Günün tohumu: aynı gün herkes aynı sipariş türlerini görür (hedefler kişiye göre)
function seedOf(day) {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Göze hoş gelen yuvarlak sayı: iki anlamlı basamak (1.234 → 1.200, 87.650 → 88.000)
export function niceNumber(n) {
  if (n < 100) return Math.max(1, Math.round(n));
  const p = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

// stats: { cps, perClick, incomePerSec, hasProducer } — siparişin üretildiği andaki oyuncu gücü
export function makeDailyOrders(day, stats, cfg) {
  const pool = ORDER_TYPES.filter((t) => t !== 'collect' || stats.hasProducer);
  let seed = seedOf(day);
  // tohumlu karıştırma
  const types = [...pool];
  for (let i = types.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [types[i], types[j]] = [types[j], types[i]];
  }
  const money = niceNumber(Math.max(100, stats.incomePerSec * cfg.rewardSeconds));
  const targetOf = (type) =>
    ({
      tap: cfg.tapTarget,
      brew: niceNumber(Math.max(300, stats.cps * cfg.brewSeconds + stats.perClick * cfg.brewTaps)),
      buy: cfg.buyTarget,
      collect: 1,
    })[type];
  return {
    day,
    orders: types.slice(0, cfg.perDay).map((type) => ({
      type,
      target: targetOf(type),
      progress: 0,
      money,
      gold: cfg.goldPerOrder,
      claimed: false,
    })),
    bonusClaimed: false,
  };
}

// Oyun içinde olan bir şey ilgili siparişi ilerletir (tamamlanmış ya da teslim edilmiş siparişe dokunmaz)
export function bumpOrders(daily, type, amount) {
  if (!daily || amount <= 0) return daily;
  let changed = false;
  const orders = daily.orders.map((o) => {
    if (o.type !== type || o.claimed || o.progress >= o.target) return o;
    changed = true;
    return { ...o, progress: Math.min(o.target, o.progress + amount) };
  });
  return changed ? { ...daily, orders } : daily;
}

export const INITIAL_STREAK = { count: 0, lastDay: null, freezes: 2, best: 0 };

// Günün ilk teslimi: seriyi günceller. Dönen: { streak, gold (seri ödülü), usedFreezes, reset, milestone }
export function advanceStreak(streak, day, cfg) {
  if (streak.lastDay === day) return { streak, gold: 0, usedFreezes: 0, reset: false, milestone: null };
  let { count, freezes } = streak;
  let usedFreezes = 0;
  let reset = false;
  if (!streak.lastDay) count = 1;
  else {
    const missed = daysBetween(streak.lastDay, day) - 1;
    if (missed <= 0) count += 1;
    else if (missed <= freezes) {
      freezes -= missed;
      usedFreezes = missed;
      count += 1;
    } else {
      count = 1;
      reset = true;
    }
  }
  const reward = cfg.streakRewards.find((r) => r.day === count) ?? null;
  if (count % 7 === 0) freezes = Math.min(cfg.freezesMax, freezes + 1);
  return {
    streak: { count, lastDay: day, freezes, best: Math.max(streak.best ?? 0, count) },
    gold: reward ? reward.gold : 0,
    usedFreezes,
    reset,
    milestone: reward ? count : null,
  };
}

// Seri bugün hâlâ yaşıyor mu? (dün ya da bugün teslim edildiyse ya da kaçan günler haklarla karşılanabiliyorsa)
export function streakAlive(streak, today) {
  if (!streak.lastDay) return false;
  const missed = daysBetween(streak.lastDay, today) - 1;
  return missed <= streak.freezes;
}
