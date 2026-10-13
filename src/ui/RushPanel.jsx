import React from 'react';
import { Flame, Timer } from 'lucide-react';

import { fmt, fmtDuration } from '../game/format.js';

const multText = (m) => `×${m.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

// Kahve Telaşı: fincanın altında. Hazırken başlatma düğmesi, beklerken ne zaman hazır olacağı,
// telaşta kombo çarpanı, kalan süre ve kazanılan fincan.
export default function RushPanel({ status, readyIn, cfg, run, now, onStart }) {
  if (status === 'active' && run) {
    const left = Math.max(0, (run.endsAt - now) / 1000);
    return (
      <section
        aria-label="Kahve Telaşı"
        className="w-full max-w-xs overflow-hidden rounded-2xl border border-[var(--crema)] bg-[var(--ink)] text-[var(--on-dark)] shadow-[0_18px_40px_-24px_rgba(43,26,17,0.8)]"
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--crema)]">
              <Flame size={13} strokeWidth={2.4} aria-hidden="true" /> Kahve Telaşı
            </p>
            <p className="mt-0.5 text-xs text-[var(--on-dark-muted)]">
              <span className="bc-mono">{run.combo}</span> kombo · <span className="bc-mono">{Math.ceil(left)}</span> sn
            </p>
          </div>
          <p key={run.mult} className="bc-combo bc-mono text-3xl font-semibold text-[var(--crema)]" aria-label={`Çarpan ${multText(run.mult)}`}>
            {multText(run.mult)}
          </p>
        </div>
        <div className="px-4 pb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--espresso-3)]">
            <div className="bc-rush-bar h-full rounded-full bg-[var(--crema)]" style={{ animationDuration: `${cfg.seconds}s` }} />
          </div>
          <p className="mt-2 text-sm">
            <strong className="bc-mono font-semibold">+{fmt(run.coffees)}</strong> fincan
          </p>
        </div>
      </section>
    );
  }

  if (status === 'ready') {
    return (
      <button
        type="button"
        onClick={onStart}
        className="bc-rush-ready group inline-flex items-center gap-3 rounded-full bg-[var(--ink)] py-2.5 pl-3 pr-5 text-left text-[var(--on-dark)] transition hover:bg-[var(--roast)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foam)]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--crema)] text-[var(--espresso)]">
          <Flame size={20} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Kahve Telaşı</span>
          <span className="block text-xs text-[var(--on-dark-muted)]">
            {cfg.seconds} sn hızlı dokun, kombo {multText(cfg.comboMax)}'e kadar
          </span>
        </span>
      </button>
    );
  }

  if (status === 'cooldown') {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
        <Timer size={13} strokeWidth={2.2} aria-hidden="true" />
        Kahve Telaşı {fmtDuration(readyIn)} sonra hazır
      </p>
    );
  }

  return null;
}
