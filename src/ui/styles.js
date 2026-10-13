import textureImg from '../barista-assets/texture-foam.webp';
import { src } from '../lib/asset.js';
// Yazı tipleri pakete gömülü: oyun çevrimdışı (Android uygulamasında) da aynı görünür ve izin verilmeden
// Google'a istek gitmez. Türkçe için latin + latin-ext alt kümeleri yeterli (ğ, ş, İ, ₺ latin-ext'te).
import bricolageLatin from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2';
import bricolageLatinExt from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-opsz-normal.woff2';
import figtree400 from '@fontsource/figtree/files/figtree-latin-400-normal.woff2';
import figtree400Ext from '@fontsource/figtree/files/figtree-latin-ext-400-normal.woff2';
import figtree500 from '@fontsource/figtree/files/figtree-latin-500-normal.woff2';
import figtree500Ext from '@fontsource/figtree/files/figtree-latin-ext-500-normal.woff2';
import figtree600 from '@fontsource/figtree/files/figtree-latin-600-normal.woff2';
import figtree600Ext from '@fontsource/figtree/files/figtree-latin-ext-600-normal.woff2';
import figtree700 from '@fontsource/figtree/files/figtree-latin-700-normal.woff2';
import figtree700Ext from '@fontsource/figtree/files/figtree-latin-ext-700-normal.woff2';
import plexMono500 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2';
import plexMono500Ext from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-ext-500-normal.woff2';
import plexMono600 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2';
import plexMono600Ext from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-ext-600-normal.woff2';

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const face = (family, weight, latin, latinExt) =>
  [
    [latin, LATIN],
    [latinExt, LATIN_EXT],
  ]
    .map(
      ([file, range]) =>
        `@font-face { font-family: '${family}'; font-style: normal; font-display: swap; font-weight: ${weight}; src: url('${src(file)}') format('woff2'); unicode-range: ${range}; }`,
    )
    .join('\n');

const FONTS = [
  face('Bricolage Grotesque', '200 800', bricolageLatin, bricolageLatinExt),
  face('Figtree', 400, figtree400, figtree400Ext),
  face('Figtree', 500, figtree500, figtree500Ext),
  face('Figtree', 600, figtree600, figtree600Ext),
  face('Figtree', 700, figtree700, figtree700Ext),
  face('IBM Plex Mono', 500, plexMono500, plexMono500Ext),
  face('IBM Plex Mono', 600, plexMono600, plexMono600Ext),
].join('\n');

/* Renk ve yazı tipi tokenları, doku, animasyonlar */
export const STYLES = `
${FONTS}
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
.bc-rise { animation: bc-rise 0.45s cubic-bezier(0.2, 1.2, 0.4, 1) both; }
/* Rehber: dokunulacak yeri gösteren nabız halkası ve parlayan market kartı */
.bc-hint { animation: bc-hint 1.6s ease-out infinite; }
@keyframes bc-hint { 0% { transform: scale(0.96); opacity: 0.85; } 100% { transform: scale(1.22); opacity: 0; } }
.bc-guide-card { box-shadow: 0 0 0 2px var(--crema), 0 0 0 6px rgba(208, 146, 74, 0.18); animation: bc-guide-glow 1.6s ease-in-out infinite; }
@keyframes bc-guide-glow { 50% { box-shadow: 0 0 0 2px var(--crema), 0 0 0 10px rgba(208, 146, 74, 0.06); } }
@keyframes bc-rise { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .bc-bob, .bc-ring, .bc-toast, .bc-scene-in, .bc-pop, .bc-rise, .bc-guide-card { animation: none; }
  .bc-hint { animation: none; opacity: 0.7; transform: scale(1.06); }
  .bc-bean { display: none; }
  .bc-float { animation: bc-fade 0.9s ease-out forwards; }
}
`;
