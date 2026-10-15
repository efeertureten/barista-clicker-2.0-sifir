// Oyunun dengesini belirleyen bütün sayılar burada toplanır. Remote Config bu nesnenin alanlarını
// uzaktan değiştirebilir (bkz. mergeConfig); bu yüzden içinde metin ya da görsel yok, yalnızca sayılar var.
// Metinler ve görseller content.js'te, bu sayılarla birleştirilerek kullanılır.

export const APP_VERSION = '2.10.0';

export const DEFAULT_CONFIG = {
  // Ölçümde hangi dengeyle oynandığını ayırt etmek için (oyuncu özelliği: economy_version)
  version: 'econ-2.1',

  // Her alımda yükseltmenin fiyatı bu katsayıyla çarpılır (1.15 = %15 artış)
  costGrowth: 1.15,

  // perClick: tık başına eklenen kahve · cps: saniyede eklenen kahve · unlockLevel: markette açıldığı dükkan seviyesi
  upgrades: {
    beans: { baseCost: 15, perClick: 1, unlockLevel: 1 },
    machine: { baseCost: 60, cps: 1, unlockLevel: 1 },
    barista: { baseCost: 600, cps: 8, unlockLevel: 1 },
    filter: { baseCost: 8_000, cps: 55, unlockLevel: 2 },
    roaster: { baseCost: 110_000, cps: 380, unlockLevel: 3 },
    truck: { baseCost: 1_600_000, cps: 2_600, unlockLevel: 4 },
    dealers: { baseCost: 24_000_000, cps: 18_000, unlockLevel: 5 },
    plantation: { baseCost: 400_000_000, cps: 130_000, unlockLevel: 6 },
  },

  // Kilometre taşları: bir üreticiden bu adetlere ulaşınca o üreticinin üretimi milestoneMultiplier katına çıkar
  milestones: [25, 50, 100, 150, 200, 300],
  milestoneMultiplier: 2,

  // at: o dükkana geçmek için gereken toplam fincan · price: fincan başına satış fiyatı (₺)
  shops: [
    { at: 0, price: 1 },
    { at: 300, price: 1.25 },
    { at: 12_000, price: 1.5 },
    { at: 400_000, price: 2 },
    { at: 15_000_000, price: 3 },
    { at: 100_000_000_000, price: 5 },
  ],

  // Oyuncu yokken (sekme arka planda ya da oyun kapalı) dükkan çalışmaya devam eder:
  // efficiency: normal üretimin oranı · capSeconds: en çok kaç saniyelik üretim birikir (depo)
  // minSeconds: bundan kısa ayrılıklar "uzakta" sayılmaz, üretim tam hızla eklenir
  // Depo 4 saat: sentetik betada 2 saatlik depo dönüşlerin %61'inde doluydu; 4 saat hiçbir varsayımda
  // 2 saatin gerisinde kalmadı. 2/4/8 saat karşılaştırması soft launch'ta gerçek oyuncularla yapılacak.
  offline: {
    efficiency: 0.5,
    capSeconds: 4 * 3600,
    minSeconds: 60,
  },

  // Yeni Şube (prestij): unlockLevel. dükkan seviyesine ulaşınca açılır; itibar = küp kök(bu şubedeki fincan / divisor);
  // her itibar puanı üretimi ve tık gücünü perPoint kadar artırır. Değerler sentetik betada sınandı (D14 %3,9 → %7,0).
  prestige: {
    unlockLevel: 6,
    divisor: 800_000_000,
    perPoint: 0.1,
  },

  // Günlük siparişler (orders.js). Hedefler sipariş üretildiğinde oyuncunun gücüne göre ölçeklenir:
  // brew = saniyede üretim × brewSeconds + tık gücü × brewTaps; ödül parası = saniyelik gelir × rewardSeconds.
  // Altın Çekirdek: sipariş başına goldPerOrder, üçü birden goldAllBonus, seri günlerinde streakRewards.
  // instantHours / instantCost: "Hızlı demleme" ile bu kadar saatlik üretimi hemen alma ve fiyatı.
  // Değerler sentetik betada seçildi: gündelik oyuncuların %93'ü normal bir günde üçünü bitirebiliyor
  // (turistlerde %65); ödüller ilerlemeyi %16 hızlandırıyor (daha cömert ayar %23'tü).
  orders: {
    perDay: 3,
    tapTarget: 250,
    brewSeconds: 600,
    brewTaps: 200,
    buyTarget: 8,
    rewardSeconds: 300,
    goldPerOrder: 1,
    goldAllBonus: 2,
    streakRewards: [
      { day: 3, gold: 3 },
      { day: 7, gold: 5 },
      { day: 14, gold: 10 },
      { day: 30, gold: 20 },
    ],
    freezesMax: 2,
    instantHours: 1,
    instantCost: 5,
  },

  // Kahve Telaşı: seconds saniyelik aktif mod. Her dokunuş = (tık gücü + saniyelik üretim × tapCpsSeconds) × kombo
  // çarpanı; çarpan ardışık her dokunuşta comboStep artar, comboMax'ta durur, comboWindowMs boyunca dokunulmazsa
  // sıfırlanır. Telaş bitince cooldownSeconds sonra yeniden hazır olur (oyun kapalıyken de süre işler).
  // unlockLevel. dükkanda açılır (bir kez açıldıktan sonra yeni şubelerde de açık kalır).
  // 30 sn'de ~180 dokunuşla iyi bir oyuncu yaklaşık 8–9 dakikalık üretim kazanır.
  rush: {
    unlockLevel: 2,
    seconds: 30,
    cooldownSeconds: 20 * 60,
    tapCpsSeconds: 1,
    comboStep: 0.04,
    comboMax: 2.5,
    comboWindowMs: 700,
  },

  // Seviye yıldızları: iki dükkan arasında perLevel ara hedef. Eşikler fincan sayısında logaritmik aralıklı
  // (üretim katlanarak büyüdüğü için yıldızlar zamanda eşit aralıklara yakın düşer). Her yıldız gold Altın Çekirdek
  // ve rewardSeconds saniyelik kazanç verir. Yeni şubede yıldızlar yeniden kazanılır.
  stars: {
    perLevel: 2,
    gold: 1,
    rewardSeconds: 120,
  },

  // İlk deneyim rehberi. share: yeni oyuncuların rehberi gören payı (1 = herkes, 0.5 = A/B testi).
  // Sentetik betadan sonra rehber herkeste: market kısayoluyla ek etkisi küçüldü ve ölçmek için çok büyük örneklem gerekiyor.
  // Grup kurulumda cihazda belirlenir ve değişmez. Web'de Remote Config yeni oyuncuya ilk açılışta ulaşamaz
  // (izin ilk tıktan sonra sorulur), bu yüzden bu testin oranı şimdilik burada, kodda değiştirilir.
  tutorial: {
    share: 1,
  },
};

// 2.1'den önceki seviye eşikleri: eski kayıtlarda oyuncunun ulaştığı seviyeyi bulmak için
export const LEGACY_SHOP_THRESHOLDS = [0, 150, 1_500, 15_000, 150_000, 2_000_000];

/* ---- Uzaktan gelen değerleri doğrulayarak birleştirme ---- */

const isNum = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

// override: Remote Config'teki "economy" parametresinin JSON'u; yalnızca değişecek alanlar yazılır, örn.
//   { "version": "cap-4h", "offline": { "capSeconds": 14400 } }
// Geçersiz ya da bilinmeyen her alan tek tek atlanır; oyun asla bozuk bir dengeyle açılmaz.
// Dönen değer: { config, rejected: ['offline.capSeconds', …] }
export function mergeConfig(base, override) {
  const config = structuredClone(base);
  const rejected = [];
  if (!override || typeof override !== 'object' || Array.isArray(override)) return { config, rejected };
  const levels = base.shops.length;

  const take = (path, value, ok, apply) => {
    if (value === undefined) return;
    if (ok(value)) apply(value);
    else rejected.push(path);
  };

  take('version', override.version, (v) => typeof v === 'string' && v.length > 0 && v.length <= 40, (v) => {
    config.version = v;
  });
  take('costGrowth', override.costGrowth, (v) => isNum(v, 1.01, 2), (v) => {
    config.costGrowth = v;
  });
  take('milestoneMultiplier', override.milestoneMultiplier, (v) => isNum(v, 1, 10), (v) => {
    config.milestoneMultiplier = v;
  });
  take(
    'milestones',
    override.milestones,
    (v) => Array.isArray(v) && v.length <= 20 && v.every((m, i) => isInt(m, 1, 100_000) && (i === 0 || m > v[i - 1])),
    (v) => {
      config.milestones = [...v];
    },
  );
  take(
    'shops',
    override.shops,
    (v) =>
      Array.isArray(v) &&
      v.length === levels &&
      v.every((s, i) => s && isNum(s.at, 0, 1e18) && isNum(s.price, 0.01, 1e6) && (i === 0 ? s.at === 0 : s.at > v[i - 1].at)),
    (v) => {
      config.shops = v.map(({ at, price }) => ({ at, price }));
    },
  );

  if (override.upgrades && typeof override.upgrades === 'object') {
    Object.entries(override.upgrades).forEach(([id, u]) => {
      const target = config.upgrades[id];
      if (!target || !u || typeof u !== 'object') {
        rejected.push(`upgrades.${id}`);
        return;
      }
      take(`upgrades.${id}.baseCost`, u.baseCost, (v) => isNum(v, 1, 1e18), (v) => {
        target.baseCost = v;
      });
      take(`upgrades.${id}.unlockLevel`, u.unlockLevel, (v) => isInt(v, 1, levels), (v) => {
        target.unlockLevel = v;
      });
      // Bir yükseltmenin türü değişmez: tık yükseltmesi tık, üretici üretici kalır
      const field = 'perClick' in target ? 'perClick' : 'cps';
      take(`upgrades.${id}.${field}`, u[field], (v) => isNum(v, 0, 1e15), (v) => {
        target[field] = v;
      });
    });
  }

  if (override.offline && typeof override.offline === 'object') {
    const o = override.offline;
    take('offline.efficiency', o.efficiency, (v) => isNum(v, 0, 1), (v) => {
      config.offline.efficiency = v;
    });
    take('offline.capSeconds', o.capSeconds, (v) => isNum(v, 60, 7 * 86_400), (v) => {
      config.offline.capSeconds = v;
    });
    take('offline.minSeconds', o.minSeconds, (v) => isNum(v, 0, 600), (v) => {
      config.offline.minSeconds = v;
    });
  }

  if (override.prestige && typeof override.prestige === 'object') {
    const o = override.prestige;
    take('prestige.unlockLevel', o.unlockLevel, (v) => isInt(v, 2, levels), (v) => {
      config.prestige.unlockLevel = v;
    });
    take('prestige.divisor', o.divisor, (v) => isNum(v, 1, 1e18), (v) => {
      config.prestige.divisor = v;
    });
    take('prestige.perPoint', o.perPoint, (v) => isNum(v, 0, 1), (v) => {
      config.prestige.perPoint = v;
    });
  }

  if (override.orders && typeof override.orders === 'object') {
    const o = override.orders;
    const fields = {
      perDay: (v) => isInt(v, 1, 4),
      tapTarget: (v) => isInt(v, 10, 10_000),
      brewSeconds: (v) => isNum(v, 10, 36_000),
      brewTaps: (v) => isNum(v, 0, 10_000),
      buyTarget: (v) => isInt(v, 1, 100),
      rewardSeconds: (v) => isNum(v, 0, 86_400),
      goldPerOrder: (v) => isInt(v, 0, 100),
      goldAllBonus: (v) => isInt(v, 0, 100),
      freezesMax: (v) => isInt(v, 0, 10),
      instantHours: (v) => isNum(v, 0.25, 24),
      instantCost: (v) => isInt(v, 1, 1000),
    };
    Object.entries(fields).forEach(([key, ok]) => {
      take(`orders.${key}`, o[key], ok, (v) => {
        config.orders[key] = v;
      });
    });
  }

  if (override.rush && typeof override.rush === 'object') {
    const o = override.rush;
    const fields = {
      unlockLevel: (v) => isInt(v, 1, levels),
      seconds: (v) => isNum(v, 5, 300),
      cooldownSeconds: (v) => isNum(v, 0, 86_400),
      tapCpsSeconds: (v) => isNum(v, 0, 60),
      comboStep: (v) => isNum(v, 0, 1),
      comboMax: (v) => isNum(v, 1, 20),
      comboWindowMs: (v) => isNum(v, 100, 5_000),
    };
    Object.entries(fields).forEach(([key, ok]) => {
      take(`rush.${key}`, o[key], ok, (v) => {
        config.rush[key] = v;
      });
    });
  }

  if (override.stars && typeof override.stars === 'object') {
    const o = override.stars;
    take('stars.perLevel', o.perLevel, (v) => isInt(v, 0, 4), (v) => {
      config.stars.perLevel = v;
    });
    take('stars.gold', o.gold, (v) => isInt(v, 0, 10), (v) => {
      config.stars.gold = v;
    });
    take('stars.rewardSeconds', o.rewardSeconds, (v) => isNum(v, 0, 3_600), (v) => {
      config.stars.rewardSeconds = v;
    });
  }

  if (override.tutorial && typeof override.tutorial === 'object') {
    take('tutorial.share', override.tutorial.share, (v) => isNum(v, 0, 1), (v) => {
      config.tutorial.share = v;
    });
  }

  return { config, rejected };
}
