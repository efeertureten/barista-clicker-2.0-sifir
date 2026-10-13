// Hatırlatma planı: sessiz saatler, sipariş durumu, üretim yokken depo bildirimi olmaması
import assert from 'node:assert/strict';
const repo = process.argv[2];
const { planReminders, outsideQuietHours, REMINDER_IDS } = await import(`${repo}/src/game/reminders.js`);
const { dayKeyOf } = await import(`${repo}/src/game/orders.js`);

const fmtMoney = (n) => `₺${Math.round(n)}`;
const offline = { efficiency: 0.5, capSeconds: 4 * 3600 };
const T = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime(); // Ekim 2026, yerel saat
const hhmm = (ms) => { const d = new Date(ms); return `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const daily = (now, claimed) => ({ day: dayKeyOf(now), orders: [0, 1, 2].map((i) => ({ claimed: i < claimed })) });
let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ✓', label); };

ok('üretim yokken depo bildirimi yok', () => {
  const p = planReminders({ now: T(13, 14), cps: 0, price: 1, offline, daily: daily(T(13, 14), 0), fmtMoney });
  assert.equal(p.find((x) => x.kind === 'storage'), undefined);
  assert.equal(p.length, 2);
});
ok('14:00: depo 18:00, siparişler 19:00, uzun ara 3 gün sonra 19:00', () => {
  const now = T(13, 14);
  const p = planReminders({ now, cps: 10, price: 1.5, offline, daily: daily(now, 1), streak: 4, fmtMoney });
  const by = Object.fromEntries(p.map((x) => [x.kind, x]));
  assert.equal(hhmm(by.storage.at), '13 18:00');
  assert.equal(by.storage.body, '₺108000 değerinde kahve seni bekliyor. Daha fazlası birikmiyor; gel topla.');
  assert.equal(hhmm(by.orders_left.at), '13 19:00');
  assert.equal(by.orders_left.title, 'Serin 4 gün, bugün bozulmasın');
  assert.equal(by.orders_left.body, 'Bugün teslim edilmeyi bekleyen 2 sipariş var.');
  assert.equal(hhmm(by.comeback.at), '16 19:00');
  assert.deepEqual(p.map((x) => x.id), [REMINDER_IDS.storage, REMINDER_IDS.orders, REMINDER_IDS.comeback]);
});
ok('20:00: depo gece dolar → sabah 09:00; siparişler yarın 10:00', () => {
  const now = T(13, 20);
  const p = planReminders({ now, cps: 10, price: 1, offline, daily: daily(now, 0), fmtMoney });
  const by = Object.fromEntries(p.map((x) => [x.kind, x]));
  assert.equal(hhmm(by.storage.at), '14 09:00');
  assert.equal(hhmm(by.orders_new.at), '14 10:00');
  assert.equal(by.orders_new.title, 'Günün siparişleri hazır');
});
ok('18:45 ve sipariş kaldı: akşam hatırlatması çok yakın → yarın sabah', () => {
  const now = T(13, 18, 45);
  const p = planReminders({ now, cps: 1, price: 1, offline, daily: daily(now, 0), streak: 1, fmtMoney });
  const o = p.find((x) => x.id === REMINDER_IDS.orders);
  assert.equal(o.kind, 'orders_new');
  assert.equal(o.body, 'Serin 1 gün. Bugünkü siparişlerle uzat, Altın Çekirdek kazan.');
});
ok('siparişler bittiyse yarın sabah yenileri', () => {
  const now = T(13, 11);
  const p = planReminders({ now, cps: 1, price: 1, offline, daily: daily(now, 3), fmtMoney });
  assert.equal(p.find((x) => x.id === REMINDER_IDS.orders).kind, 'orders_new');
});
ok('dünkü siparişler kayıtlıysa bugün 3 sipariş bekliyor sayılır', () => {
  const now = T(13, 11);
  const p = planReminders({ now, cps: 1, price: 1, offline, daily: daily(T(12, 11), 3), fmtMoney });
  const o = p.find((x) => x.id === REMINDER_IDS.orders);
  assert.equal(o.kind, 'orders_left');
  assert.match(o.body, / 3 sipariş/);
});
ok('sessiz saatler: 03:00 → 09:00, 22:30 → ertesi 09:00, 21:59 değişmez', () => {
  assert.equal(hhmm(outsideQuietHours(T(13, 3))), '13 09:00');
  assert.equal(hhmm(outsideQuietHours(T(13, 22, 30))), '14 09:00');
  assert.equal(hhmm(outsideQuietHours(T(13, 21, 59))), '13 21:59');
});
ok('hiçbir bildirim 22:00–09:00 arasına düşmüyor (günün her saati)', () => {
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) {
    const now = T(13, h, m);
    for (const x of planReminders({ now, cps: 5, price: 1, offline, daily: daily(now, h % 4), streak: 2, fmtMoney })) {
      const hr = new Date(x.at).getHours();
      assert.ok(hr >= 9 && hr < 22, `${x.kind} ${hhmm(x.at)} (şimdi ${h}:${m})`);
      assert.ok(x.at > now, `${x.kind} geçmişte`);
    }
  }
});
console.log(`\nSONUÇ: ${n} kontrol geçti`);
