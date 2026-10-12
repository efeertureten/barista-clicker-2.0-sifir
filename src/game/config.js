// Oyunun dengesini belirleyen bütün sayılar burada toplanır. İleride Remote Config bu nesnenin
// alanlarını uzaktan değiştirecek; bu yüzden içinde metin ya da görsel yok, yalnızca sayılar var.
// Metinler ve görseller content.js'te, bu sayılarla birleştirilerek kullanılır.

export const APP_VERSION = '2.0.1';

export const DEFAULT_CONFIG = {
  // Her alımda yükseltmenin fiyatı bu katsayıyla çarpılır (1.15 = %15 artış)
  costGrowth: 1.15,

  // perClick: tık başına eklenen kahve · cps: saniyede eklenen kahve
  upgrades: {
    beans: { baseCost: 15, perClick: 1 },
    machine: { baseCost: 60, cps: 1 },
    barista: { baseCost: 500, cps: 10 },
  },

  // at: o dükkana geçmek için gereken toplam fincan · price: fincan başına satış fiyatı (₺)
  shops: [
    { at: 0, price: 1 },
    { at: 150, price: 1.25 },
    { at: 1500, price: 1.5 },
    { at: 15000, price: 2 },
    { at: 150000, price: 3 },
    { at: 2000000, price: 5 },
  ],
};
