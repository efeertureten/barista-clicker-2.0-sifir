import React, { useEffect, useRef, useState } from 'react';

import emblemImg from '../barista-assets/emblem.webp';
import beanImg from '../barista-assets/bean.webp';
import steamWebm from '../barista-assets/steam.webm';
import steamMp4 from '../barista-assets/steam.mp4';
import { src } from '../lib/asset.js';

const FIRST_MS = 1800; // ilk açılış: slogan da görünür
const RETURN_MS = 900; // dönen oyuncu
const FADE_MS = 450;

// Açılış ekranı ne zaman gösterilir: ?intro=1 her zaman, ?intro=0 hiç; hata ayıklama modunda (?debug=1, testler)
// varsayılan olarak gösterilmez ki oyun hemen tıklanabilsin.
export function introEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('intro') === '1') return true;
    if (params.get('intro') === '0') return false;
    if (params.get('debug') === '1') return false;
    if (params.get('debug') === null && window.localStorage.getItem('barista-clicker-debug') === '1') return false;
  } catch {
    /* adres ya da depolama okunamazsa göster */
  }
  return true;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Açılış: koyu espresso zeminde amblem, arkasından yükselen buhar, oyunun adı ve çekirdeklerden yükleme çizgisi.
// Oyun arkada hazırlanır; süre dolunca ya da dokununca kaybolur. Ekran okuyucular için süsten ibaret (aria-hidden).
export default function Intro({ firstLaunch, onDone }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const still = reducedMotion();

  const leave = () => setLeaving(true);

  useEffect(() => {
    const t = setTimeout(leave, firstLaunch ? FIRST_MS : RETURN_MS);
    const onKey = () => leave();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [firstLaunch]);

  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(() => doneRef.current(), still ? 0 : FADE_MS);
    return () => clearTimeout(t);
  }, [leaving, still]);

  return (
    <div
      aria-hidden="true"
      data-testid="intro"
      onPointerDown={leave}
      className={`bc-intro fixed inset-0 z-[80] grid select-none place-items-center bg-[var(--espresso)] px-6 ${
        leaving ? 'bc-intro-out pointer-events-none' : ''
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative h-56 w-56 sm:h-64 sm:w-64">
          {!still && (
            <video
              className="bc-intro-steam pointer-events-none absolute"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
            >
              <source src={src(steamWebm)} type="video/webm" />
              <source src={src(steamMp4)} type="video/mp4" />
            </video>
          )}
          <img
            src={src(emblemImg)}
            alt=""
            width={475}
            height={480}
            draggable={false}
            className="bc-img bc-intro-emblem relative z-10 h-full w-full object-contain"
          />
        </div>
        <p className="bc-display bc-intro-title mt-3 text-4xl font-extrabold text-[var(--on-dark)] sm:text-5xl">Barista Clicker</p>
        {firstLaunch && <p className="bc-intro-title mt-1.5 text-sm text-[var(--on-dark-muted)]">Demle, sat, büyü.</p>}
        <div className="mt-7 flex items-center gap-2.5">
          {[0, 1, 2].map((i) => (
            <img
              key={i}
              src={src(beanImg)}
              alt=""
              width={96}
              height={96}
              draggable={false}
              className="bc-img bc-intro-bean h-4 w-4"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
