// Seviye yıldızları: eşikler, ödül, eski kayıt eşitlemesi, yeni şube, Remote Config
import assert from 'node:assert/strict';
const repo = process.argv[2];
const { DEFAULT_CONFIG, mergeConfig } = await import(`${repo}/src/game/config.js`);
const { createEconomy, INITIAL_STATE } = await import(`${repo}/src/game/economy.js`);

const eco = createEconomy(DEFAULT_CONFIG);
let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ✓', label); };

ok('eşikler: her iki dükkan arası 2, okunur sayılar', () => {
  assert.deepEqual(eco.starThresholds, [100, 200, 1000, 3500, 39000, 120000, 1.3e6, 4.5e6, 280e6, 5.3e9]);
  assert.deepEqual(eco.levelStarsOf(1), [1000, 3500]);
  const shops = DEFAULT_CONFIG.shops.map((s) => s.at);
  eco.starThresholds.forEach((t, i) => {
    const lvl = Math.floor(i / 2);
    assert.ok(t > shops[lvl] && t < shops[lvl + 1], `${t} ${lvl}. aralıkta`);
  });
});
ok('ulaşılan yıldız sayısı', () => {
  assert.equal(eco.starsReachedOf(0), 0);
  assert.equal(eco.starsReachedOf(150), 1);
  assert.equal(eco.starsReachedOf(3500), 4);
  assert.equal(eco.starsReachedOf(1e12), 10);
});
ok('ödül: +1 Altın Çekirdek ve 120 sn\'lik kazanç (fincan fiyatıyla)', () => {
  const s0 = { ...INITIAL_STATE, coffees: 1200, level: 1, stars: 2, owned: { ...INITIAL_STATE.owned, machine: 10 } };
  const s = eco.reducer(s0, { type: 'claimStars' });
  assert.equal(s.stars, 3);
  assert.equal(s.gold, 1);
  assert.equal(s.money - s0.money, 120 * 10 * 1.25);
  assert.equal(s.earned - s0.earned, 120 * 10 * 1.25);
  assert.equal(eco.reducer(s, { type: 'claimStars' }), s, 'aynı yıldız iki kez ödül vermez');
});
ok('üretim yokken ödül tık gücüyle', () => {
  const s0 = { ...INITIAL_STATE, coffees: 120, stars: 0 };
  const s = eco.reducer(s0, { type: 'claimStars' });
  assert.equal(s.money, 120 * 1 * 1);
});
ok('birden çok yıldız aynı anda', () => {
  const s0 = { ...INITIAL_STATE, coffees: 4000, level: 1, stars: 0, owned: { ...INITIAL_STATE.owned, machine: 4 } };
  const s = eco.reducer(s0, { type: 'claimStars' });
  assert.equal(s.stars, 4);
  assert.equal(s.gold, 4);
});
ok('eski kayıt (stars: null) ödülsüz eşitlenir', () => {
  const s0 = { ...INITIAL_STATE, coffees: 50_000, level: 2, stars: null, gold: 3 };
  const s = eco.reducer(s0, { type: 'claimStars' });
  assert.equal(s.stars, 5);
  assert.equal(s.gold, 3);
  assert.equal(s.money, s0.money);
});
ok('yeni şubede yıldızlar sıfırdan', () => {
  const rich = { ...INITIAL_STATE, coffees: 1e12, level: 5, stars: 10 };
  assert.equal(eco.reducer(rich, { type: 'newBranch' }).stars, 0);
});
ok('Remote Config: perLevel 3, geçersiz gold atlanır; perLevel 0 kapatır', () => {
  const { config, rejected } = mergeConfig(DEFAULT_CONFIG, { stars: { perLevel: 3, gold: 50 } });
  assert.deepEqual(rejected, ['stars.gold']);
  assert.equal(createEconomy(config).starThresholds.length, 15);
  const off = mergeConfig(DEFAULT_CONFIG, { stars: { perLevel: 0 } }).config;
  assert.equal(createEconomy(off).starThresholds.length, 0);
});
console.log(`\nSONUÇ: ${n} kontrol geçti`);
