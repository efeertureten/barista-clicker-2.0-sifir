// Web Audio üstünde küçük bir ses motoru: efektler, varyasyonlar, müzik döngüsü ve müziği kısma.
import { src } from '../lib/asset.js';

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

export function createSoundEngine(files, musicTrack) {
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
