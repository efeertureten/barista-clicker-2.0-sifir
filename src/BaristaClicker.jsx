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
import { APP_VERSION, DEFAULT_CONFIG } from './game/config.js';
import { buildShops, buildUpgrades } from './game/content.js';
import { createEconomy } from './game/economy.js';
import { hasSave, loadSave, readLastActiveAt, writeSave } from './game/save.js';
import { createMeta } from './game/meta.js';
import { fmt, fmtMoney, fmtPercent, fmtPrice, fmtRate } from './game/format.js';
import { createSoundEngine } from './audio/soundEngine.js';
import { MUSIC_PREF_KEY, MUSIC_TRACK, SOUND_PREF_KEY, SOUNDS } from './audio/sounds.js';
import * as analytics from './analytics/analytics.js';
import { STYLES } from './ui/styles.js';
import AudioToggle from './ui/AudioToggle.jsx';
import ConsentBanner from './ui/ConsentBanner.jsx';
import WelcomeBack from './ui/WelcomeBack.jsx';

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
// config: oyunun denge sayıları (game/config.js). İleride Remote Config'ten gelen değerler buradan verilecek.
export default function BaristaClicker({ initialSave, onSave, config = DEFAULT_CONFIG } = {}) {
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

  const shopIndex = economy.shopIndexOf(state.coffees);
  const shop = SHOPS[shopIndex];
  const nextShop = SHOPS[shopIndex + 1];
  const perClick = economy.perClickOf(state.owned);
  const cps = economy.cpsOf(state.owned);
  const shopProgress = nextShop
    ? Math.min(1, (state.coffees - shop.at) / (nextShop.at - shop.at))
    : 1;
  const shopIndexRef = useRef(shopIndex);
  shopIndexRef.current = shopIndex;

  // Ölçüm: oyun açılınca başlar. Oturum, kurulumdan beri geçen gün ve ilk deneyim adımları burada izlenir.
  useEffect(() => {
    analytics.init();
    setConsentState(analytics.getConsent());
    const unsubscribe = analytics.subscribe(setConsentState);
    const meta = createMeta({ hadSave: hadSaveAtStart });
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
    analytics.setUserProperties({
      install_cohort: meta.installCohort,
      app_version: APP_VERSION,
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
    const now = UPGRADES.map((u) => state.money >= economy.costOf(u.id, state.owned));
    const prev = affordableRef.current;
    affordableRef.current = now;
    if (prev && now.some((ok, i) => ok && !prev[i])) {
      soundRef.current?.play('ting', { minGap: 0.8, maxVoices: 1 });
    }
  }, [state.money, state.owned, UPGRADES, economy]);

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
      if (shopIndex === 1) markFtue('first_level_up', 3);
      setToast(SHOPS[shopIndex]);
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
    if (shopIndex < prev) setToast(null);
    return undefined;
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
    if (state.money < cost) return;
    dispatch({ type: 'buy', id: upgrade.id });
    sfx(upgrade.sound, { vary: 0.03, maxVoices: 2 });
    // Oyun içi para harcaması için Google Analytics'in önerdiği olay adı
    analytics.track('spend_virtual_currency', {
      virtual_currency_name: 'TL',
      value: cost,
      item_name: upgrade.id,
      owned_after: state.owned[upgrade.id] + 1,
      shop_level: shopIndex + 1,
    });
    markFtue('first_purchase', 2);
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

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    analytics.track('game_reset', { shop_level: shopIndex + 1, coffees: Math.round(state.coffees), clicks: state.clicks });
    setConfirmReset(false);
    setFloaters([]);
    dispatch({ type: 'reset' });
  };

  return (
    <div
      lang="tr"
      onPointerDown={unlockAudio}
      onKeyDown={unlockAudio}
      className="bc-root flex min-h-full w-full flex-col bg-[var(--foam)] text-[var(--ink)] lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_400px]"
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Dükkanın
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

              <div className="mt-4">
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
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4 lg:py-0">
            <div ref={cupWrapRef} className="relative">
              <button
                type="button"
                onClick={handleBrew}
                aria-label={`Kahve demle: tık başına ${perClick} kahve`}
                className="bc-cup relative grid h-64 w-64 select-none place-items-center rounded-full transition-transform duration-100 ease-out hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--foam)] sm:h-72 sm:w-72 lg:[@media(max-height:820px)]:h-56 lg:[@media(max-height:820px)]:w-56"
              >
                <span aria-hidden="true" className="bc-glow pointer-events-none absolute -inset-12 rounded-full" />
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
                    +{fmt(f.amount)}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <div className="text-center">
              <p className="bc-display text-2xl font-extrabold sm:text-3xl">Demle, sat, büyü.</p>
              <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-[var(--roast)]">
                <MousePointerClick size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  Tık başına <strong className="bc-mono font-semibold text-[var(--ink)]">+{fmt(perClick)}</strong> kahve
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
      <aside aria-label="Market" className="bg-[var(--espresso)] text-[var(--on-dark)] lg:h-full lg:overflow-y-auto">
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
            {UPGRADES.map((upgrade) => {
              const owned = state.owned[upgrade.id];
              const cost = economy.costOf(upgrade.id, state.owned);
              const affordable = state.money >= cost;
              const progress = Math.min(1, state.money / cost);

              return (
                <button
                  key={upgrade.id}
                  type="button"
                  disabled={!affordable}
                  onClick={() => handleBuy(upgrade)}
                  aria-label={`${upgrade.name} satın al, ${fmtMoney(cost)}. Sahip olunan: ${owned}`}
                  className="group relative w-full overflow-hidden rounded-2xl border border-[var(--line-dark)] bg-[var(--espresso-2)] p-4 text-left transition duration-150 enabled:hover:border-[var(--crema)] enabled:hover:bg-[var(--espresso-3)] enabled:active:scale-[0.985] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl transition-colors ${
                        affordable
                          ? 'bg-[var(--crema-soft)] ring-1 ring-inset ring-[rgba(208,146,74,0.5)]'
                          : 'bg-[var(--espresso-3)]'
                      }`}
                    >
                      <img
                        key={affordable ? 'ready' : 'locked'}
                        src={src(upgrade.image)}
                        alt=""
                        width={256}
                        height={256}
                        draggable={false}
                        className={`bc-img absolute inset-0 h-full w-full object-contain transition duration-200 ease-out ${
                          upgrade.anchorBottom ? 'origin-bottom object-bottom pt-1' : 'p-1'
                        } ${affordable ? 'bc-pop group-hover:-rotate-3 group-hover:scale-110' : 'opacity-45 grayscale'}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="bc-display text-base font-semibold leading-tight">{upgrade.name}</h3>
                        <span className="bc-mono shrink-0 text-xs text-[var(--on-dark-muted)]">{owned} adet</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-[var(--on-dark-muted)]">{upgrade.desc}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[var(--crema-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--crema)]">
                          {upgrade.effect}
                        </span>
                        <span
                          className={`bc-mono text-base font-semibold ${
                            affordable ? 'text-[var(--crema)]' : 'text-[var(--on-dark-muted)]'
                          }`}
                        >
                          {fmtMoney(cost)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!affordable && (
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[var(--line-dark)]">
                      <span
                        className="block h-full bg-[var(--crema)] opacity-70 transition-[width] duration-300"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </span>
                  )}
                </button>
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

      {/* ---------------- Dükkan büyüdü bildirimi ---------------- */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-50 flex justify-center px-4">
          <div
            role="status"
            className="bc-toast flex items-center gap-3 rounded-2xl bg-[var(--ink)] py-2.5 pl-2.5 pr-4 text-[var(--on-dark)] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
          >
            <span
              className="h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-2 ring-[var(--crema)]"
              style={{ backgroundColor: toast.tint }}
            >
              <img
                src={src(toast.thumb)}
                alt=""
                width={192}
                height={192}
                draggable={false}
                className="bc-img h-full w-full object-cover"
              />
            </span>
            <div>
              <p className="bc-display text-sm font-extrabold">Dükkan büyüdü: {toast.name}</p>
              <p className="text-xs text-[var(--on-dark-muted)]">Fincan fiyatı artık {fmtPrice(toast.price)}</p>
            </div>
          </div>
        </div>
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
