// Barista Clicker sentetik beta: oyunun GERÇEK kodunu (economy.js, config.js, tutorial.js) oynayan sentetik oyuncular.
// Oyun mekaniği koddan gelir; oyuncu davranışı (tıklama hızı, oturum düzeni, satın alma, dönüp dönmeme) aşağıdaki
// varsayımlardan. Aynı oyuncular (aynı tohum) farklı senaryolarda oynatılır: farklar yalnızca senaryodan kaynaklanır.
//
// Kullanım: node sim.mjs <senaryo> <oyuncu sayısı> <çıktı klasörü> [--calib t,g,b,ilk,alışkanlık] [--urge k] [--caploss v] [--tag ad]
// Senaryo bayrakları "+" ile birleşir: base · prestige · guideAll · noGuide · cap4 · cap8 · grow200 · market
//   örn. node sim.mjs prestige+cap4+market+guideAll 4000 runs

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const REPO = new URL('../../src/game', import.meta.url).href;
const { createEconomy, INITIAL_STATE } = await import(`${REPO}/economy.js`);
const { DEFAULT_CONFIG, mergeConfig } = await import(`${REPO}/config.js`);
const { currentTutorialStep, TUTORIAL_STEPS } = await import(`${REPO}/tutorial.js`);

const [scenario = 'base', nArg = '1000', outDir = '.'] = process.argv.slice(2);
const N = Number(nArg);
const calibArg = process.argv.indexOf('--calib');
const CALIB = calibArg > 0 ? process.argv[calibArg + 1].split(',').map(Number) : null;
const DAYS = 15; // kurulum günü + 14 gün (D14 için)
const DAY = 86400;
const START_EPOCH = Date.UTC(2026, 9, 19, 0, 0, 0) / 1000; // kurulumlar 19 Ekim 2026'dan itibaren 14 güne yayılır (UTC, İstanbul saati +3 sayılmadan)

/* ---------------- tohumlu rastgele sayı ---------------- */
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const stream = (player, salt) => mulberry32(player * 7919 + salt * 104729 + 12345);
const normal = (rng) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/* ---------------- senaryo → denge ---------------- */
// Senaryo adları "+" ile birleştirilebilir, örn. prestige+cap4+market+guideAll
const FLAGS = new Set(scenario.split('+'));
function scenarioConfig() {
  let over = {};
  if (FLAGS.has('cap4')) over = { ...over, offline: { capSeconds: 4 * 3600 } };
  if (FLAGS.has('cap8')) over = { ...over, offline: { capSeconds: 8 * 3600 } };
  if (FLAGS.has('grow200')) over = { ...over, shops: DEFAULT_CONFIG.shops.map((s, i) => (i === 1 ? { ...s, at: 200 } : s)) };
  // --set yol=değer,yol=değer: denge değerlerini dene, örn. --set orders.tapTarget=200,orders.rewardSeconds=300
  const setArg = process.argv.indexOf('--set');
  if (setArg > 0) {
    process.argv[setArg + 1].split(',').forEach((pair) => {
      const [key, value] = pair.split('=');
      const parts = key.split('.');
      let node = over;
      parts.slice(0, -1).forEach((k) => {
        node[k] = { ...(node[k] ?? {}) };
        node = node[k];
      });
      node[parts.at(-1)] = Number(value);
    });
  }
  const { config, rejected } = mergeConfig(DEFAULT_CONFIG, over);
  if (rejected.length) throw new Error(`geçersiz --set alanları: ${rejected.join(', ')}`);
  return config;
}
const BASE_CONFIG = scenarioConfig();
const GUIDE_SHARE = FLAGS.has('guideAll') ? 1 : FLAGS.has('noGuide') ? 0 : 0.5;
const PRESTIGE = FLAGS.has('prestige'); // oyuncular Yeni Şube'yi kullanır (oyunun gerçek kodu)
// market: telefonda sabit market kısayolu → telefon oyuncusu marketi masaüstündeki kadar çabuk fark eder
const MARKET_BUTTON = FLAGS.has('market');
// orders: günlük siparişler (oyunun gerçek kodu): oyuncu tamamlananı teslim eder, Altın Çekirdeği hızlı demlemeye harcar
const ORDERS = FLAGS.has('orders');

/* ---------------- davranış varsayımları ---------------- */
// Oyuncu tipleri: payı, tıklama hızı (tık/sn), oturumda tıklayarak geçen pay, günlük oturum, oturum süresi (dk, medyan),
// satın alma kontrol aralığı (sn), izin verme olasılığı, dönüş eğilimi (logit)
const ARCH = {
  tourist: { share: 0.55, tap: [2.2, 0.6], active: 0.7, perDay: 1.3, minutes: 1.8, buyEvery: 8, consent: 0.45, base: -3.2 },
  casual: { share: 0.33, tap: [2.3, 0.6], active: 0.55, perDay: 3.0, minutes: 4.5, buyEvery: 6, consent: 0.6, base: -0.5 },
  engaged: { share: 0.12, tap: [3.3, 0.7], active: 0.7, perDay: 5.0, minutes: 8, buyEvery: 3, consent: 0.72, base: 0.5 },
};

// Katsayılar, içeriği bitmeyen bir oyunun (prestige senaryosu) tür kıyaslarını vermesi için ayarlandı:
// D1 %35,5, D3 %22,8, D7 %12,3, D14 %7,0 (casual/idle türünün medyan-üstü bandı).
// Dönüş modelinin katsayıları (logit): ilk oturum sonunda ve her günün son oturumunda "devam eder mi?"
const W = {
  firstSession: 1.8, // ilk izlenim kararına eklenen sabit (ilk oturumdan sonra gelir mi?)
  moment: 0.32, // oturumdaki ilerleme anı başına (seviye, kilometre taşı, anlamlı çevrimdışı toplama), en çok 4
  producer: 0.75, // bir üreticisi var: "geri gelince birikmiş olacak" beklentisi
  tutorialDone: 0.45, // ilk oturumda rehberi bitirdi: döngüyü anladı
  boredom: -0.03, // son ilerleme anından beri aktif dakika başına, en çok 30 dk
  endgame: -1.0, // son dükkanda ve bu oturumda hiç ilerleme yok
  habit: 0.1, // kurulumdan beri gün başına alışkanlık (en çok 10 gün): kalanların kopma hızı zamanla azalır
  cappedLoss: -0.15, // dönüşte depo sınırın 3 katından uzun süre dolu beklemişti
  prestige: 0.6, // Yeni Şube açtı (yeni hedef)
};
// Ayar: --calib turist,gündelik,bağlı,ilkOturum,alışkanlık
if (CALIB) [ARCH.tourist.base, ARCH.casual.base, ARCH.engaged.base, W.firstSession, W.habit] = CALIB;
// "Kahveler soğumasın" dürtüsü: üreticisi olan oyuncunun depo dolunca ekstra uğrama olasılığı (depo süresine göre)
const URGE_BASE = (capH) => (capH <= 2 ? 0.22 : capH <= 4 ? 0.12 : 0.05);
// Hassasiyet: --urge <çarpan> (kısa deponun geri çağırma etkisi), --caploss <logit> (dolu depoda hissedilen kayıp)
const urgeArg = process.argv.indexOf('--urge');
const URGE_MULT = urgeArg > 0 ? Number(process.argv[urgeArg + 1]) : 1;
const URGE = (capH) => Math.min(0.95, URGE_BASE(capH) * URGE_MULT);
// --streakw <logit/gün>: serinin kendisinin oyuncuyu geri çağırma etkisi (varsayım; varsayılan 0, en çok 7 gün)
const streakArg = process.argv.indexOf('--streakw');
const STREAK_W = streakArg > 0 ? Number(process.argv[streakArg + 1]) : 0;
// --orderw <0..1>: teslim edilen siparişin bir ilerleme anı olarak ağırlığı (1 = seviye atlama kadar, varsayılan 1)
const orderwArg = process.argv.indexOf('--orderw');
const ORDER_W = orderwArg > 0 ? Number(process.argv[orderwArg + 1]) : 1;
const capLossArg = process.argv.indexOf('--caploss');
if (capLossArg > 0) W.cappedLoss = Number(process.argv[capLossArg + 1]);
const tagArg = process.argv.indexOf('--tag');
const TAG = tagArg > 0 ? process.argv[tagArg + 1] : '';

// Oyuncunun yerel takvim günü (YYYY-MM-DD): kurulum günü + kurulumdan beri geçen gün
function dayKey(p, day) {
  const d = new Date((START_EPOCH + (p.installDay + day) * DAY) * 1000);
  return d.toISOString().slice(0, 10);
}

/* ---------------- olay kaydı ---------------- */
const events = [];
const players = [];
function emit(p, t, name, params = {}) {
  p.lastEventT = t;
  events.push({ user: p.id, ts: p.installEpoch + t, day: Math.floor((p.installTod + t) / DAY), event: name, params });
}

/* ---------------- oturum takvimi ---------------- */
function makeSchedule(p, rng) {
  const a = ARCH[p.arch];
  const sessions = [];
  const lenOf = (first) =>
    clamp(Math.exp(Math.log(a.minutes * 60) + 0.6 * normal(rng)) * (first ? 1.6 : 1), 45, 25 * 60);
  sessions.push({ start: 0, len: lenOf(true) });
  for (let d = 0; d < DAYS; d += 1) {
    const dayStart = d * DAY - p.installTod; // kurulum anına göre bu takvim gününün başlangıcı
    const k = Math.max(0, Math.round(a.perDay + normal(rng) * 0.8));
    const times = Array.from({ length: k }, () => dayStart + (7.5 + rng() * 16) * 3600).sort((x, y) => x - y);
    times.forEach((t) => {
      const last = sessions[sessions.length - 1];
      if (t > last.start + last.len + 20 * 60) sessions.push({ start: t, len: lenOf(false) });
    });
  }
  return sessions;
}

/* ---------------- tek oyuncu ---------------- */
function simulatePlayer(i) {
  const tr = stream(i, 1);
  const r = tr();
  const arch = r < ARCH.tourist.share ? 'tourist' : r < ARCH.tourist.share + ARCH.casual.share ? 'casual' : 'engaged';
  const a = ARCH[arch];
  const p = {
    id: `u${String(i).padStart(5, '0')}`,
    arch,
    device: tr() < 0.75 ? 'mobile' : 'desktop',
    tapRate: clamp(a.tap[0] + a.tap[1] * normal(tr), 1, 6),
    consent: tr() < a.consent,
    variant: tr() < GUIDE_SHARE ? 'guide' : 'control',
    installDay: Math.floor(tr() * 14),
    installTod: (9 + tr() * 14) * 3600,
    tapFocused: tr() < 0.35, // tık yükseltmesini üreticiye tercih eder
    skipsGuide: tr() < 0.08,
  };
  p.installEpoch = START_EPOCH + p.installDay * DAY + p.installTod;
  const schedule = makeSchedule(p, stream(i, 2));
  const dec = stream(i, 3); // dönüş kararları: senaryolar arasında aynı sırayla çekilir
  // Kopma kararları: ilk oturum sonunda "ilk izlenim", sonra her günün son oturumunda "yarın gelir mi?".
  // Gün içindeki ek oturumlar kopma şansı eklemez (gerçekte sık uğramak alışkanlığı güçlendirir).
  const U1 = dec();
  const Ud = Array.from({ length: DAYS + 1 }, () => dec());
  const U = Array.from({ length: 400 }, () => [dec(), dec(), dec()]);
  const disc = stream(i, 4);
  // Rehbersiz oyuncu marketi ne zaman fark eder (sn)? Telefonda market sayfanın aşağısında.
  const discFirst = disc();
  const discoverAt =
    p.device === 'desktop' || MARKET_BUTTON
      ? -Math.log(1 - discFirst) * 25
      : disc() < 0.55
        ? -Math.log(1 - discFirst) * 90
        : Infinity;
  const discoverLater = disc(); // sonraki oturumlarda fark etme
  const buyR = stream(i, 5);

  const config = BASE_CONFIG;
  const economy = createEconomy(config);
  let state = INITIAL_STATE;
  const dispatch = (action) => {
    state = economy.reducer(state, action);
  };

  let tutorial = p.variant === 'guide' ? 'active' : 'off';
  let tutorialStart = 0;
  const ftue = {};
  let discovered = false;
  let sessionNo = 0;
  let boredomActive = 0; // son ilerleme anından beri aktif saniye
  let lastSeen = null;
  let churnedAt = null;
  let prestiges = 0;
  const truthDays = new Set();
  let firstMomentGap = 0;
  const capH = config.offline.capSeconds / 3600;
  const extra = []; // dürtüyle eklenen oturumlar

  const markFtue = (t, step, n) => {
    if (ftue[step] !== undefined) return;
    ftue[step] = t;
    emit(p, t, 'ftue_step', { step, step_number: n });
  };
  const playerLevel = () => economy.levelOf(state);

  emit(p, 0, 'first_open', { device: p.device });
  emit(p, 0, 'user_properties', { tutorial_variant: p.variant, app_version: '2.2.0', economy_version: config.version });
  if (p.variant === 'guide') emit(p, 0, 'tutorial_begin', { variant: 'guide' });

  let currentDay = -1;
  let dayMoments = 0;
  let dayCapped = false;
  let dayPrestige = false;
  const queue = schedule.slice();
  let qi = 0;
  while (qi < queue.length || extra.length) {
    // sıradaki oturum: takvimdeki ya da dürtüyle eklenen, hangisi önceyse
    let s;
    if (extra.length && (qi >= queue.length || extra[0].start < queue[qi].start)) s = extra.shift();
    else s = queue[qi++];
    if (lastSeen !== null && s.start < lastSeen + 60) continue;
    if (s.start > (DAYS - 0.0001) * DAY - p.installTod) break;

    // ---- uzakta geçen süre ve Hoş geldin kartı ----
    let moments = 0;
    let cappedLoss = false;
    // seviye takibi Hoş geldin toplamasından önce başlar: toplanan kahveyle gelen seviyeler de sayılır
    let levelBefore = playerLevel();
    if (lastSeen !== null) {
      const away = s.start - lastSeen;
      if (away < config.offline.minSeconds) dispatch({ type: 'tick', dt: away });
      else dispatch({ type: 'away', seconds: away });
    }
    sessionNo += 1;
    const day = Math.floor((p.installTod + s.start) / DAY);
    if (day !== currentDay) {
      currentDay = day;
      dayMoments = 0;
      dayCapped = false;
      dayPrestige = false;
    }
    truthDays.add(day);
    if (ORDERS) dispatch({ type: 'newDay', day: dayKey(p, day) });
    emit(p, s.start, 'session_begin', {
      session_number: sessionNo,
      days_since_install: day,
      away_minutes: lastSeen === null ? null : Math.round((s.start - lastSeen) / 60),
      shop_level: playerLevel() + 1,
    });
    if (state.offline) {
      const o = state.offline;
      const value = o.coffees * config.shops[playerLevel()].price;
      const cpsNow = economy.cpsOf(state.owned);
      emit(p, s.start + 2, 'offline_collect', {
        away_minutes: Math.round(o.away / 60),
        stored_minutes: Math.round(o.seconds / 60),
        capped: o.capped ? 1 : 0,
        coffees: Math.round(o.coffees),
        value: Math.round(value),
        cap_hours: capH,
      });
      if (o.capped && o.away > 3 * config.offline.capSeconds) cappedLoss = true;
      if (o.seconds >= 20 * 60 && cpsNow > 0) moments += 1;
      dispatch({ type: 'collectOffline' });
    }
    if (!discovered && sessionNo > 1 && (p.device === 'desktop' || MARKET_BUTTON || discoverLater < 0.6 + 0.1 * sessionNo)) discovered = true;

    // ---- oturumun içi: saniye saniye ----
    let len = s.len;
    // rehberli oyuncu ilk oturumda rehberi bitirmeye niyetlidir (yarısı süreyi uzatır)
    const stayForGuide = p.variant === 'guide' && sessionNo === 1 && U[0][2] < 0.5;
    let tapAcc = 0;
    let tutorialDoneNow = false;
    for (let t = 0; t < len; t += 1) {
      const now = s.start + t;
      const guiding = tutorial === 'active';
      const activeShare = guiding ? 0.9 : ARCH[arch].active;
      tapAcc += p.tapRate * activeShare;
      while (tapAcc >= 1) {
        tapAcc -= 1;
        const firstClick = state.clicks === 0;
        dispatch({ type: 'click' });
        if (firstClick) markFtue(now, 'first_brew', 1);
      }
      dispatch({ type: 'tick', dt: 1 });
      boredomActive += 1;

      if (!discovered && sessionNo === 1 && t >= discoverAt) discovered = true;
      if (guiding && p.skipsGuide && t === 3) {
        tutorial = 'skipped';
        emit(p, now, 'tutorial_skip', { step: currentTutorialStep(state, economy), step_number: 1 });
      }

      // ---- satın alma ----
      const canShop = guiding || discovered;
      if (canShop && t % (guiding ? 1 : ARCH[arch].buyEvery) === 0) {
        for (let k = 0; k < 6; k += 1) {
          const level = playerLevel();
          let pick = null;
          if (tutorial === 'active') {
            const step = currentTutorialStep(state, economy);
            pick = step === 'buy' ? 'beans' : step === 'producer' ? 'machine' : null;
            if (!pick) {
              // rehberin son adımında oyuncu serbestçe alışveriş yapar (rehber yasaklamaz)
            }
          }
          if (!pick) {
            const tapPerSec = p.tapRate * activeShare;
            let best = null;
            for (const id of Object.keys(config.upgrades)) {
              if (!economy.isUnlocked(id, level)) continue;
              const cost = economy.costOf(id, state.owned);
              const u = config.upgrades[id];
              let gain;
              if ('perClick' in u) gain = u.perClick * tapPerSec * (p.tapFocused ? 2.2 : 1);
              else {
                const owned = state.owned[id];
                gain = economy.unitCpsOf(id, state.owned);
                const next = economy.nextMilestone(owned);
                if (next !== null && next - owned === 1) gain += gain * owned;
              }
              const score = cost / Math.max(gain, 1e-9);
              if (!best || score < best.score) best = { id, cost, score };
            }
            if (best && arch !== 'engaged' && buyR() < 0.25) {
              // ara sıra en ucuz alınabilir şeyi alır (en iyi seçimi hesaplamaz)
              const cheapest = Object.keys(config.upgrades)
                .filter((id) => economy.isUnlocked(id, level))
                .map((id) => ({ id, cost: economy.costOf(id, state.owned) }))
                .sort((x, y) => x.cost - y.cost)[0];
              if (cheapest && state.money >= cheapest.cost) best = cheapest;
            }
            pick = best?.id ?? null;
          }
          if (!pick) break;
          const cost = economy.costOf(pick, state.owned);
          if (state.money < cost) break;
          const producerBefore = economy.cpsOf(state.owned) > 0;
          dispatch({ type: 'buy', id: pick });
          const ownedAfter = state.owned[pick];
          emit(p, now, 'spend_virtual_currency', { item_name: pick, value: cost, owned_after: ownedAfter, shop_level: playerLevel() + 1 });
          markFtue(now, 'first_purchase', 2);
          if (economy.isProducer(pick) && !producerBefore) markFtue(now, 'first_producer', 3);
          if (economy.isProducer(pick) && config.milestones.includes(ownedAfter)) {
            moments += 1;
            boredomActive = 0;
            emit(p, now, 'milestone_reached', { item_name: pick, count: ownedAfter, multiplier: economy.multiplierOf(pick, ownedAfter) });
          }
        }
      }

      // ---- seviye ----
      const level = playerLevel();
      if (level > levelBefore) {
        for (let l = levelBefore + 1; l <= level; l += 1) {
          emit(p, now, 'level_up', { level: l + 1, session_number: sessionNo });
          moments += 1;
        }
        if (levelBefore === 0) markFtue(now, 'first_level_up', 4);
        levelBefore = level;
        boredomActive = 0;
      }

      // ---- günlük siparişler: tamamlananı teslim et, bonusu al, Altın Çekirdeği harca ----
      if (ORDERS && state.daily && t % 5 === 0) {
        state.daily.orders.forEach((o, idx) => {
          if (!o.claimed && o.progress >= o.target) {
            const firstToday = !state.daily.orders.some((x) => x.claimed);
            const before = state.streak.count;
            dispatch({ type: 'claimOrder', index: idx });
            moments += ORDER_W;
            boredomActive = 0;
            p.ordersDone = (p.ordersDone ?? 0) + 1;
            emit(p, now, 'daily_order_complete', { type: o.type, target: o.target, streak: state.streak.count, first_today: firstToday ? 1 : 0 });
            if (firstToday && state.streak.count !== before + 1 && before > 0) emit(p, now, 'streak_reset', { from: before });
          }
        });
        if (!state.daily.bonusClaimed && state.daily.orders.every((o) => o.claimed)) {
          dispatch({ type: 'claimBonus' });
          emit(p, now, 'daily_bonus', { streak: state.streak.count });
        }
        if (state.gold >= config.orders.instantCost && economy.cpsFor(state) > 0 && buyR() < 0.5) {
          const c0 = state.coffees;
          dispatch({ type: 'instantBrew' });
          p.instant = (p.instant ?? 0) + 1;
          emit(p, now, 'gold_spend', { item: 'instant_brew', coffees: Math.round(state.coffees - c0) });
        }
      }

      // ---- rehber ----
      if (tutorial === 'active' && currentTutorialStep(state, economy) === null) {
        tutorial = 'done';
        tutorialDoneNow = true;
        emit(p, now, 'tutorial_complete', { seconds: now - tutorialStart, session_number: sessionNo });
      }
      if (t === len - 1 && stayForGuide && tutorial === 'active' && len < s.len + 150) len += 1;
    }

    // ---- Yeni Şube (senaryo): oyunun gerçek newBranch işlemi; oyuncu itibarını en az ikiye katlayacaksa
    // ya da en az 5 puan kazanacaksa açar ----
    let prestigedNow = false;
    if (PRESTIGE && economy.branchUnlocked(state)) {
      const gain = economy.reputationGainOf(state);
      if (gain >= Math.max(5, state.reputation) && !state.offline) {
        dispatch({ type: 'newBranch' });
        prestiges += 1;
        prestigedNow = true;
        emit(p, s.start + len, 'prestige', { reputation_gain: gain, reputation: state.reputation, branch: state.branches });
        boredomActive = 0;
      }
    }

    lastSeen = s.start + len;
    const activeMin = len / 60;
    dayMoments += moments;
    if (cappedLoss) dayCapped = true;
    if (prestigedNow) dayPrestige = true;
    const u = U[Math.min(sessionNo - 1, U.length - 1)];
    const hasProducer = economy.cpsOf(state.owned) > 0 || prestigedNow;

    // ---- depo dolunca ekstra uğrama (gün içinde) ----
    if (hasProducer && arch !== 'tourist' && u[1] < URGE(capH)) {
      const at = lastSeen + config.offline.capSeconds * (0.9 + 0.3 * u[2]);
      const tod = (p.installTod + at) % DAY;
      if (tod > 7.5 * 3600) extra.push({ start: at, len: clamp(ARCH[arch].minutes * 60 * 0.6, 45, 600) }), extra.sort((x, y) => x.start - y.start);
    }

    const churn = (logit, info) => {
      churnedAt = lastSeen;
      p.churnInfo = { level: playerLevel() + 1, boredom_min: Math.round(boredomActive / 60), moments: dayMoments, day, logit: +logit.toFixed(2), ...info };
    };
    // ---- ilk izlenim ----
    if (sessionNo === 1) {
      const logit1 =
        ARCH[arch].base + W.firstSession + W.moment * Math.min(moments, 4) + (hasProducer ? W.producer : 0) + (tutorialDoneNow ? W.tutorialDone : 0);
      if (U1 > sigmoid(logit1)) {
        churn(logit1, { endgame: 0, first: 1 });
        break;
      }
    }
    // ---- gün sonu: yarın gelir mi? ----
    const nextQ = qi < queue.length ? queue[qi].start : Infinity;
    const nextStart = Math.min(nextQ, extra.length ? extra[0].start : Infinity);
    const nextDay = Number.isFinite(nextStart) ? Math.floor((p.installTod + nextStart) / DAY) : Infinity;
    if (nextDay > day) {
      const endgame = playerLevel() === config.shops.length - 1 && dayMoments === 0;
      const logit =
        ARCH[arch].base +
        W.moment * Math.min(dayMoments, 4) +
        (hasProducer ? W.producer : 0) +
        W.boredom * Math.min(boredomActive / 60, 30) +
        (endgame ? W.endgame : 0) +
        W.habit * Math.min(day, 10) +
        (ORDERS && state.streak.lastDay === dayKey(p, day) ? STREAK_W * Math.min(state.streak.count, 7) : 0) +
        (dayCapped ? W.cappedLoss : 0) +
        (dayPrestige ? W.prestige : 0);
      if (Ud[Math.min(day, DAYS)] > sigmoid(logit)) {
        churn(logit, { endgame: endgame ? 1 : 0, first: 0 });
        break;
      }
    }
    void activeMin;
    void firstMomentGap;
  }

  const lastDay = Math.max(...truthDays);
  players.push({
    user: p.id,
    archetype: p.arch,
    device: p.device,
    variant: p.variant,
    consent: p.consent ? 1 : 0,
    install_day: p.installDay,
    sessions: sessionNo,
    last_active_day: lastDay,
    churned: churnedAt !== null ? 1 : 0,
    max_level: playerLevel() + 1,
    prestiges,
    orders_done: p.ordersDone ?? 0,
    instant_brews: p.instant ?? 0,
    gold: state.gold ?? 0,
    streak: state.streak?.count ?? 0,
    best_streak: state.streak?.best ?? 0,
    clicks: state.clicks,
    coffees: Math.round(state.coffees),
    tutorial_status: tutorial,
    first_purchase_s: ftue.first_purchase ?? null,
    first_producer_s: ftue.first_producer ?? null,
    first_level_up_s: ftue.first_level_up ?? null,
    days: [...truthDays].sort((x, y) => x - y).join(' '),
    ...(p.churnInfo ? Object.fromEntries(Object.entries(p.churnInfo).map(([k, v]) => [`churn_${k}`, v])) : {}),
  });
}

for (let i = 0; i < N; i += 1) simulatePlayer(i);

fs.mkdirSync(outDir, { recursive: true });
// Parça parça yaz (çok sayıda olay tek bir metne sığmaz); art arda gzip parçaları geçerli bir gzip dosyasıdır
const evPath = path.join(outDir, `events-${scenario}${TAG}.jsonl.gz`);
fs.writeFileSync(evPath, Buffer.alloc(0));
for (let i = 0; i < events.length; i += 100_000) {
  const chunk = events.slice(i, i + 100_000).map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(evPath, zlib.gzipSync(chunk));
}
fs.writeFileSync(path.join(outDir, `players-${scenario}${TAG}.json`), JSON.stringify(players));
// hızlı özet (doğru değer, izin vermeyenler dahil)
const ret = (n) => players.filter((p) => p.days.split(' ').map(Number).includes(n)).length / players.length;
const byV = (v, n) => {
  const g = players.filter((p) => p.variant === v);
  return g.length ? g.filter((p) => p.days.split(' ').map(Number).includes(n)).length / g.length : NaN;
};
console.log(
  JSON.stringify({
    scenario: scenario + TAG,
    players: N,
    events: events.length,
    D1: +ret(1).toFixed(3),
    D3: +ret(3).toFixed(3),
    D7: +ret(7).toFixed(3),
    D14: +ret(14).toFixed(3),
    D1_guide: +byV('guide', 1).toFixed(3),
    D1_control: +byV('control', 1).toFixed(3),
    D7_guide: +byV('guide', 7).toFixed(3),
    D7_control: +byV('control', 7).toFixed(3),
  }),
);
