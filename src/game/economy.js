// Oyun mantığı: saf fonksiyonlar, arayüzden bağımsız. Hepsi bir denge nesnesiyle (config.js) kurulur;
// Remote Config geldiğinde aynı fonksiyonlar uzaktan gelen sayılarla çalışır.

import { DEFAULT_CONFIG } from './config.js';
import { advanceStreak, bumpOrders, INITIAL_STREAK, makeDailyOrders } from './orders.js';

// Yükseltmelerin kimlikleri içerikle (ad, görsel) sabittir; Remote Config yalnızca sayılarını değiştirir
export const UPGRADE_IDS = Object.keys(DEFAULT_CONFIG.upgrades);
export const emptyOwned = () => Object.fromEntries(UPGRADE_IDS.map((id) => [id, 0]));

export const INITIAL_STATE = {
  money: 0, // kasadaki para
  coffees: 0, // toplam demlenen fincan
  earned: 0, // toplam kazanılan para
  clicks: 0,
  owned: emptyOwned(),
  // Ulaşılan en yüksek dükkan seviyesi (0'dan başlar). Fincan sayısından hesaplanır ama hiç düşmez:
  // eşikler değişse bile (yeni denge, Remote Config) oyuncu kazandığı dükkanı kaybetmez.
  level: 0,
  // Yeni Şube (prestij): itibar puanı (her puan üretimi ve tık gücünü artırır) ve açılmış şube sayısı.
  // Yeni şube açılınca bu ikisi dışında şubeye ait her şey sıfırlanır.
  reputation: 0,
  branches: 1,
  // Günlük siparişler (orders.js): { day, orders: [...], bonusClaimed } · Altın Çekirdek · seri.
  // Bunlar şubeye değil oyuncuya aittir; Yeni Şube'de korunur.
  daily: null,
  gold: 0,
  streak: INITIAL_STREAK,
  // Uzaktayken biriken, henüz toplanmamış üretim:
  // { coffees, seconds (depoya sayılan süre), away (gerçek uzak kalma süresi), capped (depo doldu mu) }
  offline: null,
};

export function createEconomy(config) {
  const { shops, upgrades, costGrowth, offline, milestones, milestoneMultiplier, prestige, orders } = config;

  // Yalnızca fincan sayısına göre seviye
  const levelFromCoffees = (coffees) => {
    let index = 0;
    shops.forEach((shop, i) => {
      if (coffees >= shop.at) index = i;
    });
    return index;
  };
  const levelOf = (state) => Math.max(state.level ?? 0, levelFromCoffees(state.coffees));

  const isProducer = (id) => !('perClick' in upgrades[id]);
  const isUnlocked = (id, level) => level + 1 >= upgrades[id].unlockLevel;
  // Kaç kilometre taşı geçildi ve üretim kaç katına çıktı
  const milestonesPassed = (count) => milestones.filter((m) => count >= m).length;
  const multiplierOf = (id, count) => (isProducer(id) ? milestoneMultiplier ** milestonesPassed(count) : 1);
  const nextMilestone = (count) => milestones.find((m) => count < m) ?? null;

  const perClickOf = (owned) =>
    1 + UPGRADE_IDS.reduce((sum, id) => sum + (upgrades[id].perClick ?? 0) * (owned[id] ?? 0), 0);
  // Bir üreticinin tek biriminin şu anki üretimi (kilometre taşı çarpanı dahil)
  const unitCpsOf = (id, owned) => (upgrades[id].cps ?? 0) * multiplierOf(id, owned[id] ?? 0);
  const cpsOf = (owned) => UPGRADE_IDS.reduce((sum, id) => sum + unitCpsOf(id, owned) * (owned[id] ?? 0), 0);
  const costOf = (id, owned) => Math.ceil(upgrades[id].baseCost * costGrowth ** (owned[id] ?? 0));

  // İtibar çarpanı: puan başına prestige.perPoint (0.1 = %10) daha fazla üretim ve tık gücü
  const boostOf = (state) => 1 + prestige.perPoint * (state.reputation ?? 0);
  const perClickFor = (state) => perClickOf(state.owned) * boostOf(state);
  const cpsFor = (state) => cpsOf(state.owned) * boostOf(state);

  // Yeni Şube: bu şubede demlenen fincana göre kazanılacak itibar = küp kök(fincan / bölen)
  const reputationGainOf = (state) => Math.floor(Math.cbrt(Math.max(0, state.coffees) / prestige.divisor));
  const branchUnlocked = (state) => levelOf(state) + 1 >= prestige.unlockLevel;
  const canOpenBranch = (state) => branchUnlocked(state) && reputationGainOf(state) >= 1;
  // Bir sonraki itibar puanı için bu şubede gereken toplam fincan
  const coffeesForGain = (gain) => gain ** 3 * prestige.divisor;

  function produce(state, amount) {
    if (amount <= 0) return state;
    const level = levelOf(state);
    const income = amount * shops[level].price;
    const coffees = state.coffees + amount;
    return {
      ...state,
      money: state.money + income,
      coffees,
      earned: state.earned + income,
      level: Math.max(level, levelFromCoffees(coffees)),
    };
  }

  function reducer(state, action) {
    switch (action.type) {
      case 'click': {
        const amount = perClickFor(state);
        const next = produce(state, amount);
        return {
          ...next,
          clicks: state.clicks + 1,
          daily: bumpOrders(bumpOrders(state.daily, 'tap', 1), 'brew', amount),
        };
      }
      case 'tick': {
        const amount = cpsFor(state) * action.dt;
        const next = produce(state, amount);
        return next === state ? state : { ...next, daily: bumpOrders(state.daily, 'brew', amount) };
      }
      // Oyuncu action.seconds boyunca uzaktaydı: üretimin bir kısmı depoda birikir, depo dolunca durur.
      // Toplanmamış birikim varsa üstüne eklenir; depo sınırı ikisinin toplamına uygulanır.
      case 'away': {
        const prev = state.offline;
        const stored = prev?.seconds ?? 0;
        const seconds = Math.min(action.seconds, Math.max(0, offline.capSeconds - stored));
        const coffees = cpsFor(state) * offline.efficiency * seconds;
        if (coffees <= 0 && !prev) return state;
        return {
          ...state,
          offline: {
            coffees: (prev?.coffees ?? 0) + coffees,
            seconds: stored + seconds,
            away: (prev?.away ?? 0) + action.seconds,
            capped: stored + action.seconds >= offline.capSeconds,
          },
        };
      }
      // Birikeni kasaya aktar. multiplier: ileride ödüllü reklamla "2 kat topla" için
      case 'collectOffline': {
        if (!state.offline) return state;
        const next = produce({ ...state, offline: null }, state.offline.coffees * (action.multiplier ?? 1));
        return { ...next, daily: bumpOrders(state.daily, 'collect', 1) };
      }
      case 'buy': {
        if (!upgrades[action.id] || !isUnlocked(action.id, levelOf(state))) return state;
        const cost = costOf(action.id, state.owned);
        if (state.money < cost) return state;
        return {
          ...state,
          money: state.money - cost,
          owned: { ...state.owned, [action.id]: (state.owned[action.id] ?? 0) + 1 },
          daily: bumpOrders(state.daily, 'buy', 1),
        };
      }
      // Yeni gün: siparişler o anki güce göre üretilir (aynı gün tekrar çağrılırsa bir şey olmaz)
      case 'newDay': {
        if (state.daily?.day === action.day) return state;
        const cps = cpsFor(state);
        const perClick = perClickFor(state);
        const price = shops[levelOf(state)].price;
        const stats = { cps, perClick, incomePerSec: (cps + perClick * 1.5) * price, hasProducer: cps > 0 };
        return { ...state, daily: makeDailyOrders(action.day, stats, orders) };
      }
      // Tamamlanan siparişi teslim et: para ve Altın Çekirdek; günün ilk teslimi seriyi ilerletir
      case 'claimOrder': {
        const order = state.daily?.orders[action.index];
        if (!order || order.claimed || order.progress < order.target) return state;
        const firstToday = !state.daily.orders.some((o) => o.claimed);
        const s = firstToday ? advanceStreak(state.streak, state.daily.day, orders) : null;
        return {
          ...state,
          money: state.money + order.money,
          earned: state.earned + order.money,
          gold: state.gold + order.gold + (s?.gold ?? 0),
          streak: s ? s.streak : state.streak,
          daily: {
            ...state.daily,
            orders: state.daily.orders.map((o, i) => (i === action.index ? { ...o, claimed: true } : o)),
          },
        };
      }
      // Üç sipariş de teslim edildi: günün bonusu
      case 'claimBonus': {
        if (!state.daily || state.daily.bonusClaimed || !state.daily.orders.every((o) => o.claimed)) return state;
        return { ...state, gold: state.gold + orders.goldAllBonus, daily: { ...state.daily, bonusClaimed: true } };
      }
      // Hızlı demleme: Altın Çekirdekle birkaç saatlik üretimi hemen al (siparişleri ilerletmez)
      case 'instantBrew': {
        const cps = cpsFor(state);
        if (state.gold < orders.instantCost || cps <= 0) return state;
        return { ...produce(state, cps * orders.instantHours * 3600), gold: state.gold - orders.instantCost };
      }
      // Yeni şube: itibar kazanılır; para, fincan, yükseltmeler ve dükkan seviyesi sıfırlanır.
      // Toplam kazanç ve tık sayısı oyuncunun ömür boyu istatistiği olarak kalır.
      case 'newBranch': {
        if (!canOpenBranch(state) || state.offline) return state;
        return {
          ...INITIAL_STATE,
          clicks: state.clicks,
          earned: state.earned,
          reputation: (state.reputation ?? 0) + reputationGainOf(state),
          branches: (state.branches ?? 1) + 1,
          daily: state.daily,
          gold: state.gold,
          streak: state.streak,
        };
      }
      case 'reset':
        return INITIAL_STATE;
      default:
        return state;
    }
  }

  return {
    levelOf,
    levelFromCoffees,
    isProducer,
    isUnlocked,
    multiplierOf,
    nextMilestone,
    perClickOf,
    unitCpsOf,
    cpsOf,
    costOf,
    boostOf,
    perClickFor,
    cpsFor,
    reputationGainOf,
    branchUnlocked,
    canOpenBranch,
    coffeesForGain,
    reducer,
  };
}
