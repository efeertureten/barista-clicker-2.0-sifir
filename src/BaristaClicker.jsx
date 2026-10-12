import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  MousePointerClick,
  Music,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';

import cupImg from './barista-assets/cup.webp';
import beanImg from './barista-assets/bean.webp';
import { src } from './lib/asset.js';
import { readPref, writePref } from './lib/storage.js';
import { APP_VERSION } from './game/config.js';
import { loadActiveConfig } from './game/activeConfig.js';
import { buildShops, buildUpgrades, districtOf } from './game/content.js';
import { createEconomy } from './game/economy.js';
import { hasSave, loadSave, readLastActiveAt, writeSave } from './game/save.js';
import { createMeta } from './game/meta.js';
import { assignTutorialVariant, currentTutorialStep, TUTORIAL_STEPS } from './game/tutorial.js';
import { fmt, fmtMoney, fmtPercent, fmtPrice, fmtRate } from './game/format.js';
import { createSoundEngine } from './audio/soundEngine.js';
import { MUSIC_PREF_KEY, MUSIC_TRACK, SOUND_PREF_KEY, SOUNDS } from './audio/sounds.js';
import * as analytics from './analytics/analytics.js';
import { STYLES } from './ui/styles.js';
import AudioToggle from './ui/AudioToggle.jsx';
import ConsentBanner from './ui/ConsentBanner.jsx';
import WelcomeBack from './ui/WelcomeBack.jsx';
import { LockedUpgradeCard, UpgradeCard } from './ui/UpgradeCard.jsx';
import TutorialGuide, { TutorialDone } from './ui/TutorialGuide.jsx';
import MarketShortcut from './ui/MarketShortcut.jsx';
import { BranchModal, BranchPanel } from './ui/Branch.jsx';

// Büyük sahne görseli yalnızca dikey yer olduğunda (geniş ekranda yan yana düzen ya da uzun ekran) görünür;
// diğer durumlarda dükkan adının yanında küçük resim gösterilir, böylece fincan ekranın altına itilmez.
const BANNER_VISIBILITY = 'hidden xl:block [@media(min-height:900px)]:block';
const THUMB_VISIBILITY = 'block xl:hidden [@media(min-height:900px)]:hidden';

// Her tıklamada fincandan fırlayan çekirdekler (çoğunlukla yukarı doğru)
function makeBeanBurst() {
  return Array.from({ length: 3 }, () => {
    const angle = ((-90 + (Math.random() - 0.5) * 160) * Math.PI) / 180;
    const dist = 55 + Math.random() * 50;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      rot: (Math.random() - 0.5) * 540,
      size: 16 + Math.random() * 10,
    };
  });
}

// Not: Kök eleman h-full kullanır; ebeveyni tam yükseklikte olmalı (ya da h-screen'e çevir).
// config: oyunun denge sayıları. Verilmezse varsayılan denge + Remote Config'ten en son gelen değişiklikler
// kullanılır (game/activeConfig.js); oturum boyunca değişmez.
export default function BaristaClicker({ initialSave, onSave, config: configProp } = {}) {
  const [{ config, rejected: rejectedConfig }] = useState(() =>
    configProp ? { config: configProp, rejected: [] } : loadActiveConfig(),
  );
  const economy = useMemo(() => createEconomy(config), [config]);
  const UPGRADES = useMemo(() => buildUpgrades(config), [config]);
  const SHOPS = useMemo(() => buildShops(config), [config]);

  // Kayıt var mı, otomatik kayıt ilk kez yazmadan önce öğrenilir (eski oyuncuyu ayırt etmek için)
  const [hadSaveAtStart] = useState(() => Boolean(initialSave) || hasSave());
  const [state, dispatch] = useReducer(economy.reducer, initialSave, loadSave);
  const [floaters, setFloaters] = useState([]);
  const [bump, setBump] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [soundOn, setSoundOn] = useState(() => readPref(SOUND_PREF_KEY));
  const [musicOn, setMusicOn] = useState(() => readPref(MUSIC_PREF_KEY));
  const [consent, setConsentState] = useState(null);
  const [consentOpen, setConsentOpen] = useState(false);
  // Rehber: { variant, status, startedAt } (meta'dan) · tutorialDone: bitiş kartı açık mı
  const [tutorial, setTutorial] = useState(null);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  const stateRef = useRef(state);
  const onSaveRef = useRef(onSave);
  const cupWrapRef = useRef(null);
  const floaterId = useRef(0);
  const timers = useRef(new Set());
  const soundRef = useRef(null);
  const metaRef = useRef(null);
  // Üretimin en son hesaba katıldığı an. Kayıttan gelir; böylece oyun kapalıyken geçen süre de bilinir.
  const activeAtRef = useRef(null);
  if (activeAtRef.current === null) activeAtRef.current = readLastActiveAt(initialSave) ?? Date.now();
  stateRef.current = state;
  onSaveRef.current = onSave;

  const sfx = (name, options) => soundRef.current?.play(name, options);
  const unlockAudio = () => soundRef.current?.unlock();

  const shopIndex = economy.levelOf(state);
  const shop = SHOPS[shopIndex];
  const nextShop = SHOPS[shopIndex + 1];
  // İtibar çarpanı dahil (Yeni Şube)
  const boost = economy.boostOf(state);
  const perClick = economy.perClickFor(state);
  const cps = economy.cpsFor(state);
  // Seviye hiç düşmediği için fincan sayısı o dükkanın eşiğinin altında kalabilir (eski kayıt, yeni denge)
  const shopProgress = nextShop
    ? Math.min(1, Math.max(0, (state.coffees - shop.at) / (nextShop.at - shop.at)))
    : 1;
  // Markette: açılmış yükseltmeler ve bir sonraki dükkanda açılacak ilk üretici (hedef olarak)
  const firstLocked = UPGRADES.find((u) => !economy.isUnlocked(u.id, shopIndex));
  const marketUpgrades = UPGRADES.filter((u) => economy.isUnlocked(u.id, shopIndex) || u === firstLocked);
  const shopIndexRef = useRef(shopIndex);
  shopIndexRef.current = shopIndex;

  // Ölçüm: oyun açılınca başlar. Oturum, kurulumdan beri geçen gün ve ilk deneyim adımları burada izlenir.
  useEffect(() => {
    analytics.init();
    setConsentState(analytics.getConsent());
    const unsubscribe = analytics.subscribe(setConsentState);
    const meta = createMeta({ hadSave: hadSaveAtStart });
    if (rejectedConfig.length) analytics.track('config_rejected', { fields: rejectedConfig.join(',') });
    metaRef.current = meta;

    const beginSession = () => {
      const session = meta.touchSession();
      if (!session.isNew) return;
      analytics.track('session_begin', {
        session_number: session.sessionNumber,
        days_since_install: session.daysSinceInstall,
        away_minutes: session.awayMinutes,
        shop_level: shopIndexRef.current + 1,
        legacy_player: meta.legacy,
      });
    };
    beginSession();

    // Rehber grubu: yeni oyuncuya kurulumda bir kez atanır (A/B testi için rehberli ya da rehbersiz)
    const assigned = meta.tutorial(() =>
      assignTutorialVariant({ isNewPlayer: meta.isNewPlayer, share: config.tutorial.share }),
    );
    setTutorial(assigned);
    if (assigned.justAssigned && assigned.variant === 'guide') analytics.track('tutorial_begin', { variant: 'guide' });

    analytics.setUserProperties({
      tutorial_variant: assigned.variant,
      install_cohort: meta.installCohort,
      app_version: APP_VERSION,
      economy_version: config.version,
      max_shop_level: shopIndexRef.current + 1,
      sound: readPref(SOUND_PREF_KEY) ? 'on' : 'off',
      music: readPref(MUSIC_PREF_KEY) ? 'on' : 'off',
    });

    // Sekme görünürken her 15 saniyede aktif süreyi biriktir; geri dönüşte 30 dakikayı aşan ara yeni oturumdur
    const HEARTBEAT_S = 15;
    const id = setInterval(() => {
      if (!document.hidden) meta.heartbeat(Date.now(), HEARTBEAT_S);
    }, HEARTBEAT_S * 1000);
    const onVisibility = () => {
      if (document.hidden) meta.heartbeat(Date.now(), 0);
      else beginSession();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribe();
    };
    // Yalnızca açılışta bir kez çalışır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadSaveAtStart]);

  const markFtue = (step, stepNumber) => {
    if (metaRef.current?.markFtue(step)) analytics.track('ftue_step', { step, step_number: stepNumber });
  };

  const decideConsent = (value) => {
    analytics.setConsent(value);
    setConsentOpen(false);
  };

  // Oyun döngüsü: üretim yalnızca sekme görünürken tam hızla işler. Sekme arka plandayken saat ilerlemez;
  // geri dönülünce (ya da oyun yeniden açılınca) aradaki süre tek seferde hesaplanır:
  // kısa ayrılık tam hızla eklenir, uzun ayrılık "uzakta" sayılır ve depoya yarım hızla birikir.
  const minAwaySeconds = config.offline.minSeconds;
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      const dt = (now - activeAtRef.current) / 1000;
      activeAtRef.current = now;
      if (dt <= 0) return; // saat geri alındıysa bu adımı atla
      dispatch(dt < minAwaySeconds ? { type: 'tick', dt } : { type: 'away', seconds: dt });
    }, 100);
    return () => clearInterval(id);
  }, [minAwaySeconds]);

  // Otomatik kayıt
  useEffect(() => {
    const save = () => writeSave(stateRef.current, activeAtRef.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    const id = setInterval(save, 2000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', save);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', save);
      save();
    };
  }, []);

  useEffect(() => {
    onSaveRef.current?.(state);
  }, [state]);

  // Ses motoru: bileşenle birlikte kurulur ve kapanır
  useEffect(() => {
    const engine = createSoundEngine(SOUNDS, MUSIC_TRACK);
    soundRef.current = engine;
    return () => {
      engine.dispose();
      soundRef.current = null;
    };
  }, []);

  // Ses ve müzik tercihleri: motora ilet ve bu tarayıcıda hatırla
  useEffect(() => {
    soundRef.current?.setSfx(soundOn);
    writePref(SOUND_PREF_KEY, soundOn);
  }, [soundOn]);

  useEffect(() => {
    soundRef.current?.setMusic(musicOn);
    writePref(MUSIC_PREF_KEY, musicOn);
  }, [musicOn]);

  // Bir yükseltme yeni alınabilir hale geldiğinde ince bir "ting"
  const affordableRef = useRef(null);
  useEffect(() => {
    const level = economy.levelOf(state);
    const now = UPGRADES.map((u) => economy.isUnlocked(u.id, level) && state.money >= economy.costOf(u.id, state.owned));
    const prev = affordableRef.current;
    affordableRef.current = now;
    if (prev && now.some((ok, i) => ok && !prev[i])) {
      soundRef.current?.play('ting', { minGap: 0.8, maxVoices: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.money, state.owned, state.level, UPGRADES, economy]);

  // Kısa bildirim (dükkan büyüdü, kilometre taşı): 3,5 sn sonra kendiliğinden kapanır
  const toastTimer = useRef(null);
  const showToast = (next) => {
    clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Dükkan büyüdüğünde bildirim ve kapı zili; son seviyede melodi yerine fanfar çalar
  const prevShop = useRef(shopIndex);
  useEffect(() => {
    const prev = prevShop.current;
    prevShop.current = shopIndex;
    if (shopIndex > prev) {
      const isFinal = shopIndex === SHOPS.length - 1;
      soundRef.current?.duckMusic(isFinal ? 9.5 : 5.5);
      soundRef.current?.play('bell', { maxVoices: 1 });
      soundRef.current?.play(isFinal ? 'empire' : 'levelUp', { delay: 0.3, maxVoices: 1 });
      analytics.track('level_up', {
        level: shopIndex + 1,
        level_name: SHOPS[shopIndex].name,
        character: 'shop',
        minutes_played: metaRef.current?.activeMinutes,
        session_number: metaRef.current?.sessionNumber,
      });
      analytics.setUserProperties({ max_shop_level: shopIndex + 1 });
      if (prev === 0) markFtue('first_level_up', 4);
      // Bu büyümeyle markette açılan yeni üreticiler
      const unlocked = UPGRADES.filter((u) => u.unlockLevel > prev + 1 && u.unlockLevel <= shopIndex + 1);
      const reached = SHOPS[shopIndex];
      showToast({
        key: `level-${shopIndex}`,
        title: `Dükkan büyüdü: ${reached.name}`,
        subtitle: `Fincan ${fmtPrice(reached.price)}${unlocked.length ? ` · Markette yeni: ${unlocked.map((u) => u.name).join(', ')}` : ''}`,
        image: reached.thumb,
        tint: reached.tint,
      });
    }
    // Yalnızca seviye değişince çalışır; içerideki sesler ve ölçüm her seferinde güncel değerleri okur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopIndex]);

  // Bir sonraki dükkanın görsellerini önceden yükle; büyüme anında sahne beklemeden açılır
  useEffect(() => {
    const upcoming = SHOPS[shopIndex + 1];
    if (!upcoming || typeof window === 'undefined' || typeof window.Image === 'undefined') return;
    [upcoming.image, upcoming.thumb].forEach((asset) => {
      const img = new window.Image();
      img.src = src(asset);
    });
  }, [shopIndex, SHOPS]);

  // Sıfırlama onayı 3 sn sonra kendiliğinden kapanır
  useEffect(() => {
    if (!confirmReset) return undefined;
    const t = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  // Bileşen kapanırken bekleyen zamanlayıcıları temizle
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const handleBrew = (event) => {
    unlockAudio();
    dispatch({ type: 'click' });
    setBump((b) => b + 1);
    sfx('tap', { vary: 0.05, minGap: 0.03, maxVoices: 6 });
    sfx('drip', { vary: 0.08, minGap: 0.06, maxVoices: 3 });
    markFtue('first_brew', 1);
    // Veri izni ilk tıklamadan sonra sorulur: oyunun ilk izlenimi bir izin kutusu olmasın
    if (analytics.needsConsent()) setConsentOpen(true);

    const rect = cupWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fromPointer = event.detail > 0 && event.clientX;
    const x = fromPointer ? event.clientX - rect.left : rect.width / 2;
    const y = fromPointer ? event.clientY - rect.top : rect.height * 0.35;
    const id = ++floaterId.current;
    const jitter = (Math.random() - 0.5) * 36;
    setFloaters((list) => [
      ...list.slice(-14),
      { id, x, y, textX: x + jitter, amount: perClick, beans: makeBeanBurst() },
    ]);
    const t = setTimeout(() => {
      setFloaters((list) => list.filter((f) => f.id !== id));
      timers.current.delete(t);
    }, 900);
    timers.current.add(t);
  };

  // Motor hemen güncellenir (efekt beklemeden), çünkü tarayıcı sesi yalnızca bu tıklama içinde açmaya izin verir
  const toggleSound = () => {
    const next = !soundOn;
    soundRef.current?.setSfx(next);
    if (next) unlockAudio();
    setSoundOn(next);
    analytics.track('settings_change', { setting: 'sound', value: next ? 'on' : 'off' });
    analytics.setUserProperties({ sound: next ? 'on' : 'off' });
  };

  const toggleMusic = () => {
    const next = !musicOn;
    soundRef.current?.setMusic(next);
    if (next) unlockAudio();
    setMusicOn(next);
    analytics.track('settings_change', { setting: 'music', value: next ? 'on' : 'off' });
    analytics.setUserProperties({ music: next ? 'on' : 'off' });
  };

  const handleBuy = (upgrade) => {
    const cost = economy.costOf(upgrade.id, state.owned);
    if (state.money < cost || !economy.isUnlocked(upgrade.id, shopIndex)) return;
    const ownedAfter = state.owned[upgrade.id] + 1;
    dispatch({ type: 'buy', id: upgrade.id });
    sfx(upgrade.sound, { vary: 0.03, maxVoices: 2 });
    // Oyun içi para harcaması için Google Analytics'in önerdiği olay adı
    analytics.track('spend_virtual_currency', {
      virtual_currency_name: 'TL',
      value: cost,
      item_name: upgrade.id,
      owned_after: ownedAfter,
      shop_level: shopIndex + 1,
    });
    markFtue('first_purchase', 2);
    // İlk üretici: artık oyuncu yokken de kazanıyor (çevrimdışı kazancın ve geri dönüşün ön koşulu)
    if (economy.isProducer(upgrade.id) && economy.cpsOf(state.owned) === 0) markFtue('first_producer', 3);

    // Kilometre taşı: bu alımla üreticinin üretimi katlandı
    if (economy.isProducer(upgrade.id) && config.milestones.includes(ownedAfter)) {
      const multiplier = economy.multiplierOf(upgrade.id, ownedAfter);
      sfx('ting', { delay: 0.25, maxVoices: 2 });
      sfx('ting', { delay: 0.45, maxVoices: 2 });
      showToast({
        key: `milestone-${upgrade.id}-${ownedAfter}`,
        title: `${upgrade.name}: ${ownedAfter} adet!`,
        subtitle: `Üretimi ${fmt(config.milestoneMultiplier)} katına çıktı · toplam ×${fmt(multiplier)}`,
        image: upgrade.image,
        icon: upgrade.icon,
      });
      analytics.track('milestone_reached', {
        item_name: upgrade.id,
        count: ownedAfter,
        multiplier,
        shop_level: shopIndex + 1,
      });
    }
  };

  // Hoş geldin kartı: uzaktayken biriken üretimi kasaya aktar
  const handleCollectOffline = () => {
    const pending = state.offline;
    if (!pending) return;
    unlockAudio();
    dispatch({ type: 'collectOffline' });
    sfx('ting', { maxVoices: 1 });
    sfx('drip', { delay: 0.08, maxVoices: 2 });
    analytics.track('offline_collect', {
      away_minutes: Math.round(pending.away / 60),
      stored_minutes: Math.round(pending.seconds / 60),
      capped: pending.capped,
      coffees: Math.round(pending.coffees),
      value: Math.round(pending.coffees * shop.price),
      doubled: false,
      cap_hours: config.offline.capSeconds / 3600,
      shop_level: shopIndex + 1,
    });
  };

  /* ---------------- İlk deneyim rehberi ---------------- */
  const tutorialStep = tutorial?.status === 'active' ? currentTutorialStep(state, economy) : null;

  // Bütün adımlar tamam: bitiş kartı ve ölçüm
  useEffect(() => {
    if (tutorial?.status !== 'active' || tutorialStep !== null) return;
    metaRef.current?.setTutorialStatus('done');
    setTutorial((t) => ({ ...t, status: 'done' }));
    setTutorialDone(true);
    analytics.track('tutorial_complete', {
      seconds: Math.round((Date.now() - tutorial.startedAt) / 1000),
      session_number: metaRef.current?.sessionNumber,
    });
  }, [tutorial, tutorialStep]);

  // Bitiş kartı 12 sn sonra kendiliğinden kapanır
  useEffect(() => {
    if (!tutorialDone) return undefined;
    const t = setTimeout(() => setTutorialDone(false), 12000);
    return () => clearTimeout(t);
  }, [tutorialDone]);

  const skipTutorial = () => {
    analytics.track('tutorial_skip', { step: tutorialStep, step_number: TUTORIAL_STEPS.indexOf(tutorialStep) + 1 });
    metaRef.current?.setTutorialStatus('skipped');
    setTutorial((t) => ({ ...t, status: 'skipped' }));
  };

  // Telefonda market sayfanın aşağısında: rehber hedef karta ya da fincana kaydırır
  const scrollToId = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Fincan ekranda mı (alttaki rehber şeridinin kapladığı yer hariç)? Değilse rehber "Latteye dön" önerir.
  const [cupInView, setCupInView] = useState(true);
  useEffect(() => {
    const el = cupWrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setCupInView(entry.intersectionRatio >= 0.6), {
      threshold: [0, 0.6, 1],
      rootMargin: '0px 0px -200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Telefonda market kısayolu: market ekranın yarısından fazlasını kaplıyorsa "marketteyiz"
  const marketRef = useRef(null);
  const [inMarket, setInMarket] = useState(false);
  useEffect(() => {
    const el = marketRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setInMarket(entry.intersectionRect.height > window.innerHeight * 0.5),
      { threshold: [0, 0.1, 0.25, 0.4, 0.6, 0.8, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const affordableCount = UPGRADES.filter(
    (u) => economy.isUnlocked(u.id, shopIndex) && state.money >= economy.costOf(u.id, state.owned),
  ).length;
  const handleShortcut = () => {
    analytics.track('market_shortcut', { to: inMarket ? 'cup' : 'market', affordable: affordableCount });
    if (inMarket) scrollToId('bc-cup');
    else marketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Rehber başlarken dar ekranda fincanı ortala: alttaki şerit fincanı örtmesin
  const centeredForGuide = useRef(false);
  useEffect(() => {
    if (tutorialStep !== 'brew' || centeredForGuide.current) return;
    centeredForGuide.current = true;
    if (window.innerWidth < 1024) scrollToId('bc-cup');
  }, [tutorialStep]);
  const backToCup = cupInView ? null : { label: 'Latteye dön', direction: 'up', onClick: () => scrollToId('bc-cup') };

  const guideTarget = tutorialStep === 'buy' ? 'beans' : tutorialStep === 'producer' ? 'machine' : null;
  const guide = (() => {
    if (!tutorialStep) return null;
    const index = TUTORIAL_STEPS.indexOf(tutorialStep);
    const base = { index, total: TUTORIAL_STEPS.length };
    if (tutorialStep === 'brew') {
      return {
        ...base,
        title: 'Latteye dokun',
        text: 'Her dokunuş bir fincan kahve demler. Fincanı satarsın, para kasaya girer.',
        action: backToCup,
      };
    }
    if (guideTarget) {
      const target = UPGRADES.find((u) => u.id === guideTarget);
      const cost = economy.costOf(target.id, state.owned);
      const ready = state.money >= cost;
      const why =
        guideTarget === 'beans'
          ? 'Her dokunuşta bir fincan daha demlersin.'
          : 'Sen dokunmasan da, oyundan çıksan da kahve demler.';
      return {
        ...base,
        title: ready ? `${target.name} al` : `${fmtMoney(cost)} biriktir`,
        text: ready ? `Marketteki parlayan karta dokun. ${why}` : `Sonra marketten ${target.name} al. ${why}`,
        progress: ready ? null : { value: state.money, max: cost, label: `${fmtMoney(state.money)} / ${fmtMoney(cost)}` },
        action: ready
          ? { label: 'Markette göster', direction: 'down', onClick: () => scrollToId(`upgrade-${guideTarget}`) }
          : backToCup,
      };
    }
    const goal = SHOPS[1];
    return {
      ...base,
      title: `${fmt(goal.at)} fincana ulaş`,
      text: `Dükkanın büyür: ${goal.name}. Fincan fiyatı ${fmtPrice(goal.price)} olur, markette yeni bir üretici açılır.`,
      progress: { value: state.coffees, max: goal.at, label: `${fmt(state.coffees)} / ${fmt(goal.at)} fincan` },
      action: backToCup,
    };
  })();
  const pace = config.offline.efficiency === 0.5 ? 'yarım hızla' : `${fmtPercent(config.offline.efficiency)} hızla`;

  /* ---------------- Yeni Şube ---------------- */
  const branchInfo = economy.branchUnlocked(state)
    ? (() => {
        const gain = economy.reputationGainOf(state);
        return {
          district: districtOf(state.branches + 1),
          gain,
          boostNow: boost,
          boostAfter: 1 + config.prestige.perPoint * (state.reputation + gain),
          coffees: state.coffees,
          gainAt: economy.coffeesForGain(gain),
          nextAt: economy.coffeesForGain(gain + 1),
          firstAt: economy.coffeesForGain(1),
        };
      })()
    : null;

  const openBranch = () => {
    if (!economy.canOpenBranch(state)) return;
    analytics.track('prestige_view', { reputation_gain: branchInfo.gain, reputation: state.reputation, branch: state.branches });
    setBranchOpen(true);
  };

  const confirmBranch = () => {
    if (!economy.canOpenBranch(state)) return;
    const gain = economy.reputationGainOf(state);
    const reputation = state.reputation + gain;
    const branch = state.branches + 1;
    const district = districtOf(branch);
    unlockAudio();
    dispatch({ type: 'newBranch' });
    setBranchOpen(false);
    setFloaters([]);
    soundRef.current?.duckMusic(5.5);
    sfx('bell', { maxVoices: 1 });
    sfx('levelUp', { delay: 0.3, maxVoices: 1 });
    showToast({
      key: `branch-${branch}`,
      title: `Yeni şube: ${district}`,
      subtitle: `İtibar ${fmt(reputation)} · üretim ve tık gücü ×${fmtRate(1 + config.prestige.perPoint * reputation)}`,
      image: SHOPS[0].thumb,
      tint: SHOPS[0].tint,
    });
    analytics.track('prestige', {
      reputation_gain: gain,
      reputation,
      branch,
      district,
      coffees: Math.round(state.coffees),
      minutes_played: metaRef.current?.activeMinutes,
      session_number: metaRef.current?.sessionNumber,
    });
    analytics.setUserProperties({ branches: branch, reputation });
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    analytics.track('game_reset', { shop_level: shopIndex + 1, coffees: Math.round(state.coffees), clicks: state.clicks });
    setConfirmReset(false);
    setFloaters([]);
    setToast(null);
    dispatch({ type: 'reset' });
  };

  return (
    <div
      lang="tr"
      onPointerDown={unlockAudio}
      onKeyDown={unlockAudio}
      className={`bc-root flex min-h-full w-full flex-col bg-[var(--foam)] text-[var(--ink)] lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_400px] ${
        guide || tutorialDone ? 'pb-56 lg:pb-0' : 'pb-24 lg:pb-0'
      }`}
    >
      <style>{STYLES}</style>

      {/* ---------------- Sol / orta: istatistikler + kahve fincanı ---------------- */}
      <main className="bc-paper flex min-w-0 flex-col gap-6 px-4 py-5 sm:px-8 sm:py-6 lg:overflow-y-auto">
        <div className="flex flex-1 flex-col gap-6 xl:flex-row xl:items-center xl:gap-10">
          <section
            aria-label="Dükkan durumu"
            className="mx-auto w-full max-w-md shrink-0 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--milk)] shadow-[0_18px_40px_-28px_rgba(43,26,17,0.55)] xl:mx-0 xl:max-w-[420px]"
          >
            {/* Dükkan sahnesi: seviye değişince yumuşakça geçer */}
            <div
              className={`relative aspect-[12/5] overflow-hidden border-b border-[var(--line)] ${BANNER_VISIBILITY}`}
              style={{ backgroundColor: shop.tint }}
            >
              <img
                key={shopIndex}
                src={src(shop.image)}
                alt=""
                width={1200}
                height={500}
                draggable={false}
                className="bc-img bc-scene-in absolute inset-0 h-full w-full object-contain"
              />
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--line)] ${THUMB_VISIBILITY}`}
                    style={{ backgroundColor: shop.tint }}
                  >
                    <img
                      key={shopIndex}
                      src={src(shop.thumb)}
                      alt=""
                      width={192}
                      height={192}
                      draggable={false}
                      className="bc-img bc-scene-in h-full w-full object-cover"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      {districtOf(state.branches) ? `${districtOf(state.branches)} şubesi` : 'Dükkanın'}
                      {state.reputation > 0 && (
                        <span className="text-[var(--crema-deep)]"> · itibar ×{fmtRate(boost)}</span>
                      )}
                    </p>
                    <p className="bc-display truncate text-lg font-extrabold leading-tight">{shop.name}</p>
                  </div>
                </div>
                <span className="bc-mono shrink-0 rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--roast)]">
                  Sv. {shopIndex + 1}/{SHOPS.length}
                </span>
              </div>

              <div className="mt-5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  <Wallet size={14} strokeWidth={2.2} /> Kasa
                </p>
                <p className="bc-mono mt-1 text-4xl font-semibold tracking-tight sm:text-[2.75rem]">
                  {fmtMoney(state.money)}
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="min-w-0 rounded-2xl bg-[var(--paper)] p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    <TrendingUp size={14} strokeWidth={2.2} /> Saniyede üretim
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-1.5">
                    <span className="bc-mono text-xl font-semibold">{fmtRate(cps)}</span>
                    <span className="text-xs font-medium text-[var(--roast)]">CPS</span>
                  </dd>
                  <dd className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    kahve/sn · ≈ ₺{fmtRate(cps * shop.price)}/sn
                  </dd>
                </div>
                <div className="min-w-0 rounded-2xl bg-[var(--paper)] p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    <Sparkles size={14} strokeWidth={2.2} /> Toplam kazanç
                  </dt>
                  <dd className="bc-mono mt-1 truncate text-xl font-semibold">{fmtMoney(state.earned)}</dd>
                  <dd className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    {fmt(state.coffees)} fincan demlendi
                  </dd>
                </div>
              </dl>

              {branchInfo && <BranchPanel info={branchInfo} onOpen={openBranch} />}
              <div className={`mt-4 ${branchInfo ? 'hidden' : ''}`}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-[var(--roast)]">
                    {nextShop ? `Sonraki dükkan: ${nextShop.name}` : 'En büyük dükkana ulaştın'}
                  </span>
                  {nextShop && (
                    <span className="bc-mono shrink-0 text-[var(--muted)]">
                      {fmt(state.coffees)} / {fmt(nextShop.at)}
                    </span>
                  )}
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--paper)]"
                  role="progressbar"
                  aria-label="Sonraki dükkana ilerleme"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(shopProgress * 100)}
                >
                  <div
                    className="h-full rounded-full bg-[var(--crema)] transition-[width] duration-300"
                    style={{ width: `${shopProgress * 100}%` }}
                  />
                </div>
                {nextShop && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Büyüyünce fincan fiyatı {fmtPrice(shop.price)} → {fmtPrice(nextShop.price)}
                    {shopIndex + 2 === config.prestige.unlockLevel && ' · orada yeni şube açabilirsin'}
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4 lg:py-0">
            <div ref={cupWrapRef} id="bc-cup" className="relative scroll-mt-24">
              <button
                type="button"
                onClick={handleBrew}
                aria-label={`Kahve demle: tık başına ${perClick} kahve`}
                className="bc-cup relative grid h-64 w-64 select-none place-items-center rounded-full transition-transform duration-100 ease-out hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--foam)] sm:h-72 sm:w-72 lg:[@media(max-height:820px)]:h-56 lg:[@media(max-height:820px)]:w-56"
              >
                <span aria-hidden="true" className="bc-glow pointer-events-none absolute -inset-12 rounded-full" />
                {tutorialStep === 'brew' && (
                  <span
                    aria-hidden="true"
                    className="bc-hint pointer-events-none absolute -inset-1 rounded-full border-4 border-[var(--crema)]"
                  />
                )}
                {bump > 0 && (
                  <span
                    key={bump}
                    aria-hidden="true"
                    className="bc-ring pointer-events-none absolute -inset-1 rounded-full border-2 border-[var(--crema)]"
                  />
                )}
                <img
                  src={src(cupImg)}
                  alt=""
                  width={640}
                  height={640}
                  draggable={false}
                  className="bc-img bc-bob bc-cup-img relative h-full w-full"
                />
              </button>

              {floaters.map((f) => (
                <React.Fragment key={f.id}>
                  {f.beans.map((b, i) => (
                    <img
                      key={i}
                      src={src(beanImg)}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="bc-img bc-bean pointer-events-none absolute"
                      style={{
                        left: f.x,
                        top: f.y,
                        width: b.size,
                        height: b.size,
                        '--dx': `${b.dx}px`,
                        '--dy': `${b.dy}px`,
                        '--rot': `${b.rot}deg`,
                      }}
                    />
                  ))}
                  <span
                    aria-hidden="true"
                    className="bc-float bc-mono pointer-events-none absolute whitespace-nowrap rounded-full bg-[var(--milk)] px-2.5 py-0.5 text-lg font-semibold text-[var(--crema-deep)] shadow-[0_6px_14px_-6px_rgba(43,26,17,0.45)]"
                    style={{ left: f.textX, top: f.y }}
                  >
                    +{fmtRate(f.amount)}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* Geniş ekranda rehber bu alanda durur; telefonda alta sabitlenir ve bu yazı yerinde kalır */}
            {guide && <TutorialGuide guide={guide} onSkip={skipTutorial} />}
            {!guide && tutorialDone && (
              <TutorialDone
                text={`Makinelerin sen yokken de ${pace} çalışır; geri geldiğinde birikeni toplarsın. Her yeni dükkanda markette yeni bir üretici açılır.`}
                onClose={() => setTutorialDone(false)}
              />
            )}
            <div className={`text-center ${guide || tutorialDone ? 'lg:hidden' : ''}`}>
              <p className="bc-display text-2xl font-extrabold sm:text-3xl">Demle, sat, büyü.</p>
              <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-[var(--roast)]">
                <MousePointerClick size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  Tık başına <strong className="bc-mono font-semibold text-[var(--ink)]">+{fmtRate(perClick)}</strong> kahve
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Fincanı <strong className="bc-mono font-semibold text-[var(--ink)]">{fmtPrice(shop.price)}</strong>
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 xl:mx-0 xl:max-w-none">
          <p className="min-w-0 text-xs text-[var(--muted)]">
            {fmt(state.clicks)} tık · İlerlemen bu tarayıcıda otomatik kaydedilir.
            {analytics.isConfigured() && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => setConsentOpen(true)}
                  className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--roast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
                >
                  Veri izni: {consent === 'granted' ? 'açık' : consent === 'denied' ? 'kapalı' : 'sorulmadı'}
                </button>
              </>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <AudioToggle on={soundOn} onClick={toggleSound} label="Ses" icon={soundOn ? Volume2 : VolumeX} />
            <AudioToggle on={musicOn} onClick={toggleMusic} label="Müzik" icon={Music} />
          </div>
        </div>
      </main>

      {/* ---------------- Sağ: Market ---------------- */}
      <aside
        ref={marketRef}
        id="bc-market"
        aria-label="Market"
        className="bg-[var(--espresso)] text-[var(--on-dark)] lg:h-full lg:overflow-y-auto"
      >
        <div className="flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
          <header className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--on-dark-muted)]">
                Yükseltmeler
              </p>
              <h2 className="bc-display mt-1 flex items-center gap-2 text-2xl font-extrabold">
                <ShoppingBag size={22} strokeWidth={2} aria-hidden="true" /> Market
              </h2>
            </div>
            <p className="bc-mono rounded-full bg-[var(--espresso-2)] px-3 py-1.5 text-sm font-semibold text-[var(--crema)]">
              {fmtMoney(state.money)}
            </p>
          </header>

          <div className="flex flex-col gap-3">
            {marketUpgrades.map((upgrade) => {
              if (!economy.isUnlocked(upgrade.id, shopIndex)) {
                return (
                  <LockedUpgradeCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    shopName={SHOPS[upgrade.unlockLevel - 1].name}
                    cps={(upgrade.cps ?? 0) * boost}
                  />
                );
              }
              const owned = state.owned[upgrade.id];
              const cost = economy.costOf(upgrade.id, state.owned);
              const producer = economy.isProducer(upgrade.id);
              const next = economy.nextMilestone(owned);
              return (
                <UpgradeCard
                  key={upgrade.id}
                  upgrade={upgrade}
                  owned={owned}
                  cost={cost}
                  affordable={state.money >= cost}
                  progress={Math.min(1, state.money / cost)}
                  effect={
                    producer
                      ? `+${fmtRate(economy.unitCpsOf(upgrade.id, state.owned) * boost)} kahve / sn`
                      : `+${fmtRate(upgrade.perClick * boost)} kahve / tık`
                  }
                  highlight={guideTarget === upgrade.id}
                  milestone={
                    producer
                      ? {
                          next,
                          prev: [...config.milestones].reverse().find((m) => owned >= m) ?? 0,
                          multiplier: economy.multiplierOf(upgrade.id, owned),
                          step: config.milestoneMultiplier,
                        }
                      : null
                  }
                  onBuy={() => handleBuy(upgrade)}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-dark)] pt-4">
            <p className="text-xs text-[var(--on-dark-muted)]">
              Her alımda fiyat {fmtPercent(config.costGrowth - 1)} artar.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] ${
                confirmReset
                  ? 'border-[var(--crema)] bg-[var(--crema)] text-[var(--espresso)]'
                  : 'border-[var(--line-dark)] text-[var(--on-dark-muted)] hover:border-[var(--on-dark-muted)] hover:text-[var(--on-dark)]'
              }`}
            >
              <RotateCcw size={14} strokeWidth={2.2} aria-hidden="true" />
              {confirmReset ? 'Emin misin? Tekrar bas' : 'Oyunu sıfırla'}
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- Bildirim: dükkan büyüdü, kilometre taşı ---------------- */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-50 flex justify-center px-4">
          <div
            key={toast.key}
            role="status"
            className="bc-toast flex max-w-md items-center gap-3 rounded-2xl bg-[var(--ink)] py-2.5 pl-2.5 pr-4 text-[var(--on-dark)] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
          >
            <span
              className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--espresso-3)] text-[var(--crema)] ring-2 ring-[var(--crema)]"
              style={toast.tint ? { backgroundColor: toast.tint } : undefined}
            >
              {toast.image ? (
                <img
                  src={src(toast.image)}
                  alt=""
                  width={192}
                  height={192}
                  draggable={false}
                  className={`bc-img h-full w-full ${toast.tint ? 'object-cover' : 'object-contain p-1'}`}
                />
              ) : (
                toast.icon && <toast.icon size={24} strokeWidth={1.8} aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="bc-display text-sm font-extrabold">{toast.title}</p>
              <p className="text-xs text-[var(--on-dark-muted)]">{toast.subtitle}</p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Telefonda market kısayolu (rehber açıkken rehberin kendi düğmeleri var) ---------------- */}
      {!guide && !tutorialDone && (
        <MarketShortcut affordable={affordableCount} inMarket={inMarket} onClick={handleShortcut} />
      )}

      {/* ---------------- Yeni şube onayı ---------------- */}
      {branchOpen && branchInfo && branchInfo.gain >= 1 && (
        <BranchModal
          info={branchInfo}
          reputation={state.reputation}
          onConfirm={confirmBranch}
          onCancel={() => setBranchOpen(false)}
        />
      )}

      {/* ---------------- Hoş geldin: uzaktayken biriken üretim ---------------- */}
      {state.offline && (
        <WelcomeBack
          pending={state.offline}
          shop={shop}
          efficiency={config.offline.efficiency}
          capSeconds={config.offline.capSeconds}
          onCollect={handleCollectOffline}
        />
      )}

      {/* ---------------- Veri izni ---------------- */}
      {consentOpen && analytics.isConfigured() && (
        <ConsentBanner onAccept={() => decideConsent('granted')} onDecline={() => decideConsent('denied')} />
      )}
    </div>
  );
}
