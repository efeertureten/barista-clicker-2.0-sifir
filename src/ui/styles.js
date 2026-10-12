import textureImg from '../barista-assets/texture-foam.webp';
import { src } from '../lib/asset.js';

/* Renk ve yazı tipi tokenları, doku, animasyonlar */
export const STYLES = `
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
