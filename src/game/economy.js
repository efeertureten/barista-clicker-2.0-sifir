// Oyun mantığı: saf fonksiyonlar, arayüzden bağımsız. Hepsi bir denge nesnesiyle (config.js) kurulur;
// Remote Config geldiğinde aynı fonksiyonlar uzaktan gelen sayılarla çalışır.

export const INITIAL_STATE = {
  money: 0, // kasadaki para
  coffees: 0, // toplam demlenen fincan
  earned: 0, // toplam kazanılan para
  clicks: 0,
  owned: { beans: 0, machine: 0, barista: 0 },
};

export function createEconomy(config) {
  const { shops, upgrades, costGrowth } = config;

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
