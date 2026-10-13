// Kahve Telaşı: ekonomi tarafı (reducer, kilit, bekleme süresi, çarpan sınırı, Remote Config doğrulaması)
import assert from 'node:assert/strict';
const repo = process.argv[2];
const { DEFAULT_CONFIG, mergeConfig } = await import(`${repo}/src/game/config.js`);
const { createEconomy, INITIAL_STATE } = await import(`${repo}/src/game/economy.js`);

const eco = createEconomy(DEFAULT_CONFIG);
const R = DEFAULT_CONFIG.rush;
let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ✓', label); };
const sv2 = { ...INITIAL_STATE, coffees: 500, level: 1, owned: { ...INITIAL_STATE.owned, machine: 10 } };

ok('Sv.1\'de kilitli, Sv.2\'de açık, yeni şubede de açık', () => {
  assert.equal(eco.rushUnlocked(INITIAL_STATE), false);
  assert.equal(eco.rushUnlocked(sv2), true);
  assert.equal(eco.rushUnlocked({ ...INITIAL_STATE, branches: 2 }), true);
});
ok('kilitliyken rushStart bir şey yapmaz', () => {
  assert.equal(eco.reducer(INITIAL_STATE, { type: 'rushStart', now: 1000 }), INITIAL_STATE);
});
ok('rushStart bekleme süresini yazar: şimdi + (30 sn + 20 dk)', () => {
  const s = eco.reducer(sv2, { type: 'rushStart', now: 1_000_000 });
  assert.equal(s.rushReadyAt, 1_000_000 + (R.seconds + R.cooldownSeconds) * 1000);
  assert.equal(eco.reducer(s, { type: 'rushStart', now: 1_000_000 + 60_000 }), s, 'bekleme bitmeden yeniden başlamaz');
});
ok('çarpan: 1 + 0,04 × kombo, ×2,5\'te durur', () => {
  assert.equal(eco.rushMultiplierOf(0), 1);
  assert.equal(eco.rushMultiplierOf(10), 1.4);
  assert.equal(eco.rushMultiplierOf(100), R.comboMax);
});
ok('rushTap: (tık gücü + saniyelik üretim × 1 sn) × çarpan, sipariş sayaçlarına işler', () => {
  const daily = { day: '2026-10-13', orders: [{ type: 'tap', target: 5, progress: 0, claimed: false }], bonusClaimed: false };
  const s0 = { ...sv2, daily };
  const s = eco.reducer(s0, { type: 'rushTap', multiplier: 2 });
  const base = eco.perClickFor(sv2) + eco.cpsFor(sv2) * R.tapCpsSeconds;
  assert.equal(base, 11);
  assert.equal(s.coffees - s0.coffees, 22);
  assert.equal(s.clicks, s0.clicks + 1);
  assert.equal(s.daily.orders[0].progress, 1);
});
ok('rushTap çarpanı sınırlanır (arayüzden 10 gelse de ×2,5)', () => {
  const s = eco.reducer(sv2, { type: 'rushTap', multiplier: 10 });
  assert.equal(s.coffees - sv2.coffees, 11 * R.comboMax);
  const t = eco.reducer(sv2, { type: 'rushTap', multiplier: -3 });
  assert.equal(t.coffees - sv2.coffees, 11);
});
ok('yeni şube bekleme süresini korur', () => {
  const rich = { ...sv2, coffees: 1e12, level: 5, rushReadyAt: 123456 };
  const s = eco.reducer(rich, { type: 'newBranch' });
  assert.equal(s.branches, 2);
  assert.equal(s.rushReadyAt, 123456);
});
ok('Remote Config: geçerli alanlar alınır, geçersizler atlanır', () => {
  const { config, rejected } = mergeConfig(DEFAULT_CONFIG, { rush: { seconds: 3, comboMax: 3, cooldownSeconds: 600 } });
  assert.deepEqual(rejected, ['rush.seconds']);
  assert.equal(config.rush.seconds, 30);
  assert.equal(config.rush.comboMax, 3);
  assert.equal(config.rush.cooldownSeconds, 600);
});
console.log(`\nSONUÇ: ${n} kontrol geçti`);
