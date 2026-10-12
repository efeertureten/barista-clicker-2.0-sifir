// Oyun mantığı: saf fonksiyonlar, arayüzden bağımsız. Hepsi bir denge nesnesiyle (config.js) kurulur;
// Remote Config geldiğinde aynı fonksiyonlar uzaktan gelen sayılarla çalışır.

export const INITIAL_STATE = {
  money: 0, // kasadaki para
  coffees: 0, // toplam demlenen fincan
  earned: 0, // toplam kazanılan para
  clicks: 0,
  owned: { beans: 0, machine: 0, barista: 0 },
  // Uzaktayken biriken, henüz toplanmamış üretim:
  // { coffees, seconds (depoya sayılan süre), away (gerçek uzak kalma süresi), capped (depo doldu mu) }
  offline: null,
};

export function createEconomy(config) {
  const { shops, upgrades, costGrowth, offline } = config;

  const shopIndexOf = (coffees) => {
    let index = 0;
    shops.forEach((shop, i) => {
      if (coffees >= shop.at) index = i;
    });
    return index;
  };

  const perClickOf = (owned) => 1 + owned.beans * upgrades.beans.perClick;
  const cpsOf = (owned) => owned.machine * upgrades.machine.cps + owned.barista * upgrades.barista.cps;
  const costOf = (id, owned) => Math.ceil(upgrades[id].baseCost * costGrowth ** owned[id]);

  function produce(state, amount) {
    if (amount <= 0) return state;
    const income = amount * shops[shopIndexOf(state.coffees)].price;
    return {
      ...state,
      money: state.money + income,
      coffees: state.coffees + amount,
      earned: state.earned + income,
    };
  }

  function reducer(state, action) {
    switch (action.type) {
      case 'click':
        return { ...produce(state, perClickOf(state.owned)), clicks: state.clicks + 1 };
      case 'tick':
        return produce(state, cpsOf(state.owned) * action.dt);
      // Oyuncu action.seconds boyunca uzaktaydı: üretimin bir kısmı depoda birikir, depo dolunca durur.
      // Toplanmamış birikim varsa üstüne eklenir; depo sınırı ikisinin toplamına uygulanır.
      case 'away': {
        const prev = state.offline;
        const stored = prev?.seconds ?? 0;
        const seconds = Math.min(action.seconds, Math.max(0, offline.capSeconds - stored));
        const coffees = cpsOf(state.owned) * offline.efficiency * seconds;
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
        return produce({ ...state, offline: null }, state.offline.coffees * (action.multiplier ?? 1));
      }
      case 'buy': {
        const cost = costOf(action.id, state.owned);
        if (state.money < cost) return state;
        return {
          ...state,
          money: state.money - cost,
          owned: { ...state.owned, [action.id]: state.owned[action.id] + 1 },
        };
      }
      case 'reset':
        return INITIAL_STATE;
      default:
        return state;
    }
  }

  return { shopIndexOf, perClickOf, cpsOf, costOf, reducer };
}
