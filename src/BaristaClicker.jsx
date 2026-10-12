import React, { useEffect, useReducer, useRef, useState } from 'react';
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

/* Görseller: bu dosyanın yanındaki barista-assets/ klasöründen gelir */
import cupImg from './barista-assets/cup.webp';
import beanImg from './barista-assets/bean.webp';
import textureImg from './barista-assets/texture-foam.webp';
import beansUpgradeImg from './barista-assets/upgrade-beans.webp';
import machineUpgradeImg from './barista-assets/upgrade-machine.webp';
import baristaUpgradeImg from './barista-assets/upgrade-barista.webp';
import shop1Img from './barista-assets/shop-1-tezgah.webp';
import shop1Thumb from './barista-assets/shop-1-tezgah-thumb.webp';
import shop2Img from './barista-assets/shop-2-kose-kafe.webp';
import shop2Thumb from './barista-assets/shop-2-kose-kafe-thumb.webp';
import shop3Img from './barista-assets/shop-3-mahalle.webp';
import shop3Thumb from './barista-assets/shop-3-mahalle-thumb.webp';
import shop4Img from './barista-assets/shop-4-kavurma.webp';
import shop4Thumb from './barista-assets/shop-4-kavurma-thumb.webp';
import shop5Img from './barista-assets/shop-5-zincir.webp';
import shop5Thumb from './barista-assets/shop-5-zincir-thumb.webp';
import shop6Img from './barista-assets/shop-6-imparatorluk.webp';
import shop6Thumb from './barista-assets/shop-6-imparatorluk-thumb.webp';

/* Sesler: bu dosyanın yanındaki barista-sounds/ klasöründen gelir */
import tap1 from './barista-sounds/tap-1.mp3';
import tap2 from './barista-sounds/tap-2.mp3';
import tap3 from './barista-sounds/tap-3.mp3';
import tap4 from './barista-sounds/tap-4.mp3';
import drip1 from './barista-sounds/drip-1.mp3';
import drip2 from './barista-sounds/drip-2.mp3';
import drip3 from './barista-sounds/drip-3.mp3';
import drip4 from './barista-sounds/drip-4.mp3';
import buyBeansSfx from './barista-sounds/buy-beans.mp3';
import buyMachineSfx from './barista-sounds/buy-machine.mp3';
import buyBaristaSfx from './barista-sounds/buy-barista.mp3';
import doorBellSfx from './barista-sounds/door-bell.mp3';
import levelUpSfx from './barista-sounds/level-up.mp3';
import empireSfx from './barista-sounds/empire.mp3';
import ting1 from './barista-sounds/ting-1.mp3';
import ting2 from './barista-sounds/ting-2.mp3';
import musicLoop from './barista-sounds/music-loop.mp3';

// Vite/CRA görsel importunu URL olarak, Next.js ise { src } nesnesi olarak verir; ikisini de destekle.
const src = (asset) => (typeof asset === 'string' ? asset : asset?.src ?? '');

// Her ses adı için bir ya da birkaç varyasyon; çalarken aralarından rastgele biri seçilir.
const SOUNDS = {
  tap: [tap1, tap2, tap3, tap4], // fincana kaşık: her tıklama
  drip: [drip1, drip2, drip3, drip4], // kahve damlası: her tıklama, kaşığın altında
  buyBeans: [buyBeansSfx],
  buyMachine: [buyMachineSfx],
  buyBarista: [buyBaristaSfx],
  bell: [doorBellSfx], // dükkan büyüdü
  levelUp: [levelUpSfx], // dükkan büyüdü: zilin ardından
  empire: [empireSfx], // son seviye: zilin ardından
  ting: [ting1, ting2], // bir yükseltme alınabilir hale geldi
};
// Arka plan müziği: ilk çalışta girişten başlar, sonra [loopStart, loopEnd) arası kesintisiz döner.
// Döngü noktaları (sn) dosyadaki kendini tekrar eden bölümden ölçüldü; dosya değişirse yeniden ölçülmeli.
const MUSIC_TRACK = { src: musicLoop, loopStart: 36.3829, loopEnd: 146.5467 };

const SOUND_PREF_KEY = 'barista-clicker-sound-v1';
const MUSIC_PREF_KEY = 'barista-clicker-music-v1';

/* ------------------------------------------------------------------ */
/*  Oyun verileri                                                      */
/* ------------------------------------------------------------------ */

const SAVE_KEY = 'barista-clicker-save-v1';
const COST_GROWTH = 1.15; // her alımda fiyat %15 artar

const UPGRADES = [
  {
    id: 'beans',
    name: 'Daha İyi Çekirdek',
    desc: 'Tek kökenli, taze kavrulmuş Arabica. Her tıklamada daha çok fincan.',
    effect: '+1 kahve / tık',
    baseCost: 15,
    image: beansUpgradeImg,
    sound: 'buyBeans',
  },
  {
    id: 'machine',
    name: 'Otomatik Espresso Makinesi',
    desc: '9 bar basınçla kendi kendine shot çeker. Sen dinlenirken üretir.',
    effect: '+1 kahve / sn',
    baseCost: 60,
    image: machineUpgradeImg,
    sound: 'buyMachine',
  },
  {
    id: 'barista',
    name: 'Deneyimli Barista',
    desc: 'Latte art ustası. İki gruplu makineyi aynı anda yönetir.',
    effect: '+10 kahve / sn',
    baseCost: 500,
    image: baristaUpgradeImg,
    sound: 'buyBarista',
    anchorBottom: true, // büst görseli kutunun alt kenarına oturur
  },
];

// Dükkan büyüdükçe fincan başına satış fiyatı artar (eşikler: toplam demlenen fincan).
// tint: sahne görselinin zemin rengi; görsel yüklenirken ve geçişte boşluk görünmesin diye.
const SHOPS = [
  { name: 'Seyyar Tezgâh', at: 0, price: 1, image: shop1Img, thumb: shop1Thumb, tint: '#f0dcbe' },
  { name: 'Köşe Kafe', at: 150, price: 1.25, image: shop2Img, thumb: shop2Thumb, tint: '#efddc5' },
  { name: 'Mahalle Kahvecisi', at: 1500, price: 1.5, image: shop3Img, thumb: shop3Thumb, tint: '#f0dfc6' },
  { name: 'Kavurma Atölyesi', at: 15000, price: 2, image: shop4Img, thumb: shop4Thumb, tint: '#eeddc1' },
  { name: 'Kahve Zinciri', at: 150000, price: 3, image: shop5Img, thumb: shop5Thumb, tint: '#f3e0c2' },
  { name: 'Kahve İmparatorluğu', at: 2000000, price: 5, image: shop6Img, thumb: shop6Thumb, tint: '#f1ddc0' },
];

const INITIAL_STATE = {
  money: 0, // kasadaki para
  coffees: 0, // toplam demlenen fincan
  earned: 0, // toplam kazanılan para
  clicks: 0,
  owned: { beans: 0, machine: 0, barista: 0 },
};

// Büyük sahne görseli yalnızca dikey yer olduğunda (geniş ekranda yan yana düzen ya da uzun ekran) görünür;
// diğer durumlarda dükkan adının yanında küçük resim gösterilir, böylece fincan ekranın altına itilmez.
const BANNER_VISIBILITY = 'hidden xl:block [@media(min-height:900px)]:block';
const THUMB_VISIBILITY = 'block xl:hidden [@media(min-height:900px)]:hidden';

/* ------------------------------------------------------------------ */
/*  Yardımcılar                                                        */
/* ------------------------------------------------------------------ */

const nfInt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const nfOne = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const nfTwo = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfCompact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 2 });

const fmt = (n) => (n < 1e6 ? nfInt.format(Math.floor(n)) : nfCompact.format(n));
const fmtRate = (n) => (n < 1e6 ? nfOne.format(n) : nfCompact.format(n));
const fmtMoney = (n) => `₺${fmt(n)}`;
const fmtPrice = (n) => `₺${nfTwo.format(n)}`;

const getShopIndex = (coffees) => {
  let index = 0;
  SHOPS.forEach((shop, i) => {
    if (coffees >= shop.at) index = i;
  });
  return index;
};
const perClickOf = (owned) => 1 + owned.beans;
const cpsOf = (owned) => owned.machine * 1 + owned.barista * 10;
const costOf = (upgrade, owned) => Math.ceil(upgrade.baseCost * Math.pow(COST_GROWTH, owned[upgrade.id]));

function produce(state, amount) {
  if (amount <= 0) return state;
  const income = amount * SHOPS[getShopIndex(state.coffees)].price;
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
      const upgrade = UPGRADES.find((u) => u.id === action.id);
      const cost = costOf(upgrade, state.owned);
      if (state.money < cost) return state;
      return {
        ...state,
        money: state.money - cost,
        owned: { ...state.owned, [upgrade.id]: state.owned[upgrade.id] + 1 },
      };
    }
    case 'reset':
      return INITIAL_STATE;
    default:
      return state;
  }
}

function loadSave(initialSave) {
  let save = initialSave;
  if (!save) {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      save = raw ? JSON.parse(raw) : null;
    } catch {
      save = null;
    }
  }
  if (!save || typeof save !== 'object') return INITIAL_STATE;
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    money: num(save.money),
    coffees: num(save.coffees),
    earned: num(save.earned),
    clicks: Math.floor(num(save.clicks)),
    owned: {
      beans: Math.floor(num(save.owned?.beans)),
      machine: Math.floor(num(save.owned?.machine)),
      barista: Math.floor(num(save.owned?.barista)),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Ses                                                                */
/* ------------------------------------------------------------------ */

function readPref(key) {
  try {
    return window.localStorage.getItem(key) !== 'off';
  } catch {
    return true;
  }
}

function writePref(key, on) {
  try {
    window.localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    /* depolama kapalıysa sessizce geç */
  }
}

async function loadBytes(url) {
  // Tek dosyalık derlemelerde sesler data: URL olarak gömülür; fetch'e gerek kalmadan çöz
  if (url.startsWith('data:')) {
    const binary = atob(url.slice(url.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ses yüklenemedi: ${url}`);
  return response.arrayBuffer();
}

// Bazı tarayıcılar MP3'ün başındaki kodlayıcı boşluğunu bırakır; tıklama sesi gecikmesin diye kırp
function trimLeadingSilence(ctx, buffer, threshold = 0.002) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const limit = Math.min(buffer.length, Math.floor(buffer.sampleRate * 0.2));
  let start = 0;
  while (start < limit && channels.every((data) => Math.abs(data[start]) < threshold)) start += 1;
  start = Math.max(0, start - Math.floor(buffer.sampleRate * 0.001));
  if (start === 0) return buffer;
  const trimmed = ctx.createBuffer(buffer.numberOfChannels, buffer.length - start, buffer.sampleRate);
  channels.forEach((data, c) => trimmed.getChannelData(c).set(data.subarray(start)));
  return trimmed;
}

// Web Audio üstünde küçük bir ses motoru. Tarayıcılar ilk etkileşimden önce ses çalmaya izin vermez;
// bu yüzden AudioContext ilk dokunuşta (unlock) kurulur. Efekt dosyaları önceden indirilir (warm),
// müzik ise ancak ilk etkileşimden sonra indirilir: büyük dosya, sayfa açılışını yavaşlatmasın.
const MUSIC_LEVEL = 0.5; // müziğin efektlere göre seviyesi
const DUCK_LEVEL = 0.3; // dükkan büyürken müzik bu orana iner

function createSoundEngine(files, musicTrack) {
  const bytes = {};
  const buffers = {};
  const decoding = new Set();
  const voices = {};
  const lastStart = {};
  const lastIndex = {};
  let pending = []; // ses henüz çözülmemişken gelen istekler (ör. oyunun ilk tıklaması)
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let sfxOn = true;
  let musicOn = false;
  let musicBytes = null;
  let musicBuffer = null;
  let musicLoading = false;
  let musicVoice = null;
  let musicStartedOnce = false;
  let disposed = false;

  const wanted = () => sfxOn || musicOn;

  const warm = () => {
    Object.entries(files).forEach(([name, urls]) => {
      if (!bytes[name]) bytes[name] = urls.map((url) => loadBytes(src(url)).catch(() => null));
    });
  };

  const decode = (data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));

  const decodeAll = () =>
    Promise.all(
      Object.entries(bytes).map(async ([name, list]) => {
        if (buffers[name] || decoding.has(name)) return;
        decoding.add(name);
        const decoded = await Promise.all(
          list.map(async (request) => {
            const data = await request;
            if (!data || disposed) return null;
            try {
              return trimLeadingSilence(ctx, await decode(data.slice(0)));
            } catch {
              return null;
            }
          }),
        );
        buffers[name] = decoded.filter(Boolean);
        decoding.delete(name);
        flushPending();
      }),
    );

  // Hazır olmayı bekleyen istekleri çal; 350 ms'den eski olanlar artık anlamsız, atılır
  const flushPending = () => {
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    const waiting = pending;
    pending = [];
    waiting.forEach((request) => {
      if (now - request.at > 350) return;
      if (buffers[request.name]) play(request.name, request.options);
      else pending.push(request);
    });
  };

  const fadeOut = (voice, seconds = 0.04) => {
    const now = ctx.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + seconds);
      voice.source.stop(now + seconds + 0.01);
    } catch {
      /* ses zaten bitmiş */
    }
  };

  /* ---- Müzik ---- */

  const loadMusic = async () => {
    if (!musicTrack || musicBuffer || musicLoading || !ctx) return;
    musicLoading = true;
    try {
      if (!musicBytes) musicBytes = loadBytes(src(musicTrack.src)).catch(() => null);
      const data = await musicBytes;
      // Baştaki kodlayıcı boşluğu da kırpılır; döngü noktaları kırpılmış dosyaya göre hesaplandı
      if (data && !disposed) musicBuffer = trimLeadingSilence(ctx, await decode(data.slice(0)));
    } catch {
      /* müzik yüklenemezse oyun sessiz müzikle devam eder */
    }
    musicLoading = false;
    startMusic();
  };

  const startMusic = () => {
    if (!ctx || !musicOn || musicVoice || disposed) return;
    if (!musicBuffer) {
      loadMusic();
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = musicBuffer;
    source.loop = true;
    source.loopStart = musicTrack.loopStart;
    source.loopEnd = Math.min(musicTrack.loopEnd, musicBuffer.duration);
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 2);
    source.connect(gain);
    gain.connect(musicBus);
    // İlk seferde parçanın girişiyle başla; kapatılıp yeniden açılırsa doğrudan döngüden devam et
    source.start(now, musicStartedOnce ? musicTrack.loopStart : 0);
    musicStartedOnce = true;
    musicVoice = { source, gain };
  };

  const stopMusic = () => {
    if (!musicVoice) return;
    fadeOut(musicVoice, 0.6);
    musicVoice = null;
  };

  // Kutlama sesleri çalarken müziği kıs, sonra yavaşça geri getir
  const duckMusic = (seconds) => {
    if (!ctx || !musicBus) return;
    const level = musicBus.gain;
    const now = ctx.currentTime;
    level.cancelScheduledValues(now);
    level.setValueAtTime(level.value, now);
    level.linearRampToValueAtTime(MUSIC_LEVEL * DUCK_LEVEL, now + 0.15);
    level.setValueAtTime(MUSIC_LEVEL * DUCK_LEVEL, now + seconds);
    level.linearRampToValueAtTime(MUSIC_LEVEL, now + seconds + 1.5);
  };

  /* ---- Yaşam döngüsü ---- */

  // Sekme gizlenince her şeyi duraklat, geri gelince sürdür
  const onVisibility = () => {
    if (!ctx || disposed) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (wanted()) ctx.resume().catch(() => {});
  };

  const unlock = () => {
    if (disposed || !wanted() || typeof window === 'undefined') return;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      try {
        ctx = new AudioCtx();
      } catch {
        return;
      }
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = MUSIC_LEVEL;
      musicBus.connect(master);
      ctx.addEventListener?.('statechange', flushPending);
      document.addEventListener('visibilitychange', onVisibility);
      if (sfxOn) {
        warm();
        decodeAll();
      }
    }
    if (ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {});
    startMusic();
  };

  // vary: çalma hızında ± rastgele sapma (aynı ses tekrar tekrar duyulunca kulak yorulmasın)
  // minGap: aynı sesin iki çalışı arasındaki en kısa süre; maxVoices: aynı anda en fazla kaç kopya
  const play = (name, options = {}) => {
    const { volume = 1, vary = 0, minGap = 0, maxVoices = 4, delay = 0 } = options;
    if (!sfxOn || !ctx) return;
    const list = buffers[name];
    if (!list || ctx.state !== 'running') {
      if (pending.length < 8) pending.push({ name, options, at: performance.now() });
      return;
    }
    if (list.length === 0) return;
    const now = ctx.currentTime;
    if (minGap && now - (lastStart[name] ?? -Infinity) < minGap) return;
    lastStart[name] = now;

    let index = Math.floor(Math.random() * list.length);
    if (list.length > 1 && index === lastIndex[name]) index = (index + 1) % list.length;
    lastIndex[name] = index;

    const active = voices[name] || (voices[name] = []);
    while (active.length >= maxVoices) fadeOut(active.shift());

    const source = ctx.createBufferSource();
    source.buffer = list[index];
    if (vary) source.playbackRate.value = 1 + (Math.random() * 2 - 1) * vary;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(sfxBus);
    const voice = { source, gain };
    source.onended = () => {
      const i = active.indexOf(voice);
      if (i >= 0) active.splice(i, 1);
      gain.disconnect();
    };
    source.start(now + delay);
    active.push(voice);
  };

  const setSfx = (value) => {
    sfxOn = value;
    if (value) {
      warm();
      if (ctx) decodeAll();
      return;
    }
    pending = [];
    if (ctx) Object.values(voices).forEach((list) => list.splice(0).forEach((voice) => fadeOut(voice)));
  };

  const setMusic = (value) => {
    musicOn = value;
    if (value) startMusic();
    else stopMusic();
  };

  const dispose = () => {
    disposed = true;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    ctx?.close().catch(() => {});
  };

  return { unlock, play, setSfx, setMusic, duckMusic, dispose };
}

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

/* Renk ve yazı tipi tokenları, doku, animasyonlar */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
.bc-root {
  --foam: #f1e6d6;
  --milk: #fbf6ee;
  --paper: #e9dac5;
  --line: #dcc8ad;
  --ink: #2b1a11;
  --roast: #6b4029;
  --muted: #86654f;
  --crema: #d0924a;
  --crema-deep: #9c5f1e;
  --crema-soft: rgba(208, 146, 74, 0.16);
  --espresso: #24150d;
  --espresso-2: #321f15;
  --espresso-3: #3d281c;
  --line-dark: #4b3123;
  --on-dark: #f5eadb;
  --on-dark-muted: #bba189;
  --font-display: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Figtree', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-family: var(--font-body);
  color-scheme: light;
}
.bc-display { font-family: var(--font-display); letter-spacing: -0.01em; text-wrap: balance; }
.bc-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.bc-paper {
  background-color: var(--foam);
  background-image: url("${src(textureImg)}");
  background-size: 600px 600px;
  background-attachment: local;
}
.bc-cup { -webkit-tap-highlight-color: transparent; }
.bc-img { -webkit-user-drag: none; user-select: none; }
.bc-glow { background: radial-gradient(closest-side, rgba(251, 246, 238, 0.95), rgba(251, 246, 238, 0.65) 62%, rgba(251, 246, 238, 0)); }
.bc-cup-img { filter: drop-shadow(0 20px 22px rgba(43, 26, 17, 0.26)) drop-shadow(0 4px 6px rgba(43, 26, 17, 0.16)); }
.bc-bob { animation: bc-bob 3.2s ease-in-out infinite; }
.bc-ring { animation: bc-ring 0.55s ease-out forwards; }
.bc-float { animation: bc-float 0.9s ease-out forwards; transform: translate(-50%, -50%); }
.bc-bean { animation: bc-bean 0.85s cubic-bezier(0.15, 0.7, 0.35, 1) forwards; transform: translate(-50%, -50%); opacity: 0; }
.bc-toast { animation: bc-toast 0.35s ease-out both; }
.bc-scene-in { animation: bc-scene-in 0.6s ease-out both; }
.bc-pop { animation: bc-pop 0.45s cubic-bezier(0.3, 1.6, 0.5, 1); } /* dolgu yok: bitince hover büyütmesi çalışsın */
@keyframes bc-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes bc-ring { from { transform: scale(1); opacity: 0.8; } to { transform: scale(1.18); opacity: 0; } }
@keyframes bc-float {
  0% { opacity: 0; transform: translate(-50%, -40%) scale(0.85); }
  15% { opacity: 1; transform: translate(-50%, -80%) scale(1.08); }
  100% { opacity: 0; transform: translate(-50%, -280%) scale(1); }
}
@keyframes bc-bean {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) rotate(0deg); }
  12% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(var(--rot)); }
}
@keyframes bc-fade { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }
@keyframes bc-toast { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bc-scene-in { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: scale(1); } }
@keyframes bc-pop { 0% { transform: scale(0.82); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .bc-bob, .bc-ring, .bc-toast, .bc-scene-in, .bc-pop { animation: none; }
  .bc-bean { display: none; }
  .bc-float { animation: bc-fade 0.9s ease-out forwards; }
}
`;

/* ------------------------------------------------------------------ */
/*  Bileşenler                                                         */
/* ------------------------------------------------------------------ */

// Ses / Müzik aç-kapa düğmesi: kapalıyken soluk, kesik çerçeveli ve üstü çizili
function AudioToggle({ on, onClick, label, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={`${label} ${on ? 'açık' : 'kapalı'}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] ${
        on
          ? 'border-[var(--line)] bg-[var(--milk)] text-[var(--roast)] hover:border-[var(--crema)] hover:text-[var(--ink)]'
          : 'border-dashed border-[var(--line)] bg-transparent text-[var(--muted)] hover:text-[var(--roast)]'
      }`}
    >
      <Icon size={14} strokeWidth={2.2} aria-hidden="true" className={on ? '' : 'opacity-60'} />
      <span className={on ? '' : 'line-through decoration-1'}>{label}</span>
    </button>
  );
}

// Not: Kök eleman h-full kullanır; ebeveyni tam yükseklikte olmalı (ya da h-screen'e çevir).
export default function BaristaClicker({ initialSave, onSave } = {}) {
  const [state, dispatch] = useReducer(reducer, initialSave, loadSave);
  const [floaters, setFloaters] = useState([]);
  const [bump, setBump] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [soundOn, setSoundOn] = useState(() => readPref(SOUND_PREF_KEY));
  const [musicOn, setMusicOn] = useState(() => readPref(MUSIC_PREF_KEY));

  const stateRef = useRef(state);
  const onSaveRef = useRef(onSave);
  const cupWrapRef = useRef(null);
  const floaterId = useRef(0);
  const timers = useRef(new Set());
  const soundRef = useRef(null);
  stateRef.current = state;
  onSaveRef.current = onSave;

  const sfx = (name, options) => soundRef.current?.play(name, options);
  const unlockAudio = () => soundRef.current?.unlock();

  const shopIndex = getShopIndex(state.coffees);
  const shop = SHOPS[shopIndex];
  const nextShop = SHOPS[shopIndex + 1];
  const perClick = perClickOf(state.owned);
  const cps = cpsOf(state.owned);
  const shopProgress = nextShop
    ? Math.min(1, (state.coffees - shop.at) / (nextShop.at - shop.at))
    : 1;

  // Oyun döngüsü: geçen gerçek süreye göre üretim (arka planda kısılan sekmelerde de doğru çalışır)
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 3600);
      last = now;
      dispatch({ type: 'tick', dt });
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Otomatik kayıt
  useEffect(() => {
    const save = () => {
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(stateRef.current));
      } catch {
        /* depolama kapalıysa sessizce geç */
      }
    };
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
    const now = UPGRADES.map((u) => state.money >= costOf(u, state.owned));
    const prev = affordableRef.current;
    affordableRef.current = now;
    if (prev && now.some((ok, i) => ok && !prev[i])) {
      soundRef.current?.play('ting', { minGap: 0.8, maxVoices: 1 });
    }
  }, [state.money, state.owned]);

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
      setToast(SHOPS[shopIndex]);
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
    if (shopIndex < prev) setToast(null);
    return undefined;
  }, [shopIndex]);

  // Bir sonraki dükkanın görsellerini önceden yükle; büyüme anında sahne beklemeden açılır
  useEffect(() => {
    const upcoming = SHOPS[shopIndex + 1];
    if (!upcoming || typeof window === 'undefined' || typeof window.Image === 'undefined') return;
    [upcoming.image, upcoming.thumb].forEach((asset) => {
      const img = new window.Image();
      img.src = src(asset);
    });
  }, [shopIndex]);

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
  };

  const toggleMusic = () => {
    const next = !musicOn;
    soundRef.current?.setMusic(next);
    if (next) unlockAudio();
    setMusicOn(next);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
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
              const cost = costOf(upgrade, state.owned);
              const affordable = state.money >= cost;
              const progress = Math.min(1, state.money / cost);

              return (
                <button
                  key={upgrade.id}
                  type="button"
                  disabled={!affordable}
                  onClick={() => {
                    dispatch({ type: 'buy', id: upgrade.id });
                    sfx(upgrade.sound, { vary: 0.03, maxVoices: 2 });
                  }}
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
            <p className="text-xs text-[var(--on-dark-muted)]">Her alımda fiyat %15 artar.</p>
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
    </div>
  );
}
