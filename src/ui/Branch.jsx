import React from 'react';
import { Award, Check, RotateCcw, Store } from 'lucide-react';

import { districtScene } from '../game/content.js';
import { fmt, fmtRate } from '../game/format.js';
import { src } from '../lib/asset.js';

const mult = (boost) => `×${fmtRate(boost)}`;

// Son dükkanda ilerleme çubuğunun yerine geçer: yeni şubenin semti, kazanılacak itibar ve bir sonraki puana ilerleme.
// info: { district, gain, boostNow, boostAfter, coffees, nextAt, firstAt }
export function BranchPanel({ info, onOpen }) {
  const { district, gain, boostNow, boostAfter, coffees, nextAt, firstAt } = info;
  const target = gain >= 1 ? nextAt : firstAt;
  const prevAt = gain >= 1 ? info.gainAt : 0;
  const ratio = Math.min(1, Math.max(0, (coffees - prevAt) / (target - prevAt)));
  return (
    <div className="mt-4 rounded-2xl border border-[var(--crema)] bg-[var(--foam)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--crema-deep)]">
            <Store size={14} strokeWidth={2.2} aria-hidden="true" /> Yeni şube
          </p>
          <p className="bc-display mt-1 text-lg font-extrabold leading-tight">{district}</p>
          <p className="mt-1 text-xs leading-snug text-[var(--roast)]">
            {gain >= 1 ? (
              <>
                <strong className="bc-mono font-semibold text-[var(--ink)]">+{fmt(gain)} itibar</strong> · üretim{' '}
                {mult(boostNow)} → <strong className="bc-mono font-semibold text-[var(--ink)]">{mult(boostAfter)}</strong>
              </>
            ) : (
              <>İlk itibar puanı için bu dükkanda {fmt(firstAt)} fincan demle.</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          disabled={gain < 1}
          className="shrink-0 rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[var(--on-dark)] transition enabled:hover:bg-[var(--roast)] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foam)]"
        >
          Şubeyi aç
        </button>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2 text-[11px] text-[var(--muted)]">
          <span title="Şubeyi ne kadar geç açarsan o kadar çok itibar kazanırsın">
            {gain >= 1 ? 'Sonraki itibar puanı' : 'İlk itibar puanı'}
          </span>
          <span className="bc-mono">
            {fmt(coffees)} / {fmt(target)}
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--paper)]"
          role="progressbar"
          aria-label="Bir sonraki itibar puanına ilerleme"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
        >
          <div className="h-full rounded-full bg-[var(--crema)]" style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// Onay: ne kazanılır, ne sıfırlanır, ne kalır. Kazanılan itibar kalıcıdır, geri alınamaz.
export function BranchModal({ info, reputation, onConfirm, onCancel }) {
  const { district, gain, boostAfter } = info;
  const scene = districtScene(district);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(36,21,13,0.55)] p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bc-branch-title"
        className="bc-rise max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[28px] border border-[var(--line)] bg-[var(--milk)] text-[var(--ink)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
      >
        {scene && (
          <div
            className="relative aspect-[16/9] overflow-hidden border-b border-[var(--line)]"
            style={{ backgroundColor: scene.night ? '#091224' : '#dec29c' }}
          >
            <img
              src={src(scene.image)}
              alt=""
              width={880}
              height={492}
              draggable={false}
              data-testid="branch-scene"
              data-night={scene.night ? 'true' : 'false'}
              className="bc-img bc-scene-in absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--crema-deep)]">Yeni şube</p>
          <h2 id="bc-branch-title" className="bc-display mt-1 text-2xl font-extrabold">
            {district}
          </h2>
          <p className="mt-1 text-sm leading-snug text-[var(--roast)]">
            İmparatorluğun başka bir semtte, seyyar bir tezgâhla yeniden başlıyor. Bu sefer itibarın seninle.
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[var(--foam)] px-4 py-3">
            <Award size={28} strokeWidth={1.8} className="shrink-0 text-[var(--crema-deep)]" aria-hidden="true" />
            <div>
              <p className="bc-mono text-2xl font-semibold text-[var(--crema-deep)]">+{fmt(gain)} itibar</p>
              <p className="text-xs text-[var(--muted)]">
                Toplam {fmt(reputation + gain)} · üretim ve tık gücü {mult(boostAfter)}
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-[13px] leading-snug">
            <li className="flex gap-2">
              <Check size={16} strokeWidth={2.6} className="mt-0.5 shrink-0 text-[var(--crema-deep)]" aria-hidden="true" />
              <span>
                <strong>Kalır:</strong> itibar, toplam kazanç, tık sayısı
              </span>
            </li>
            <li className="flex gap-2">
              <RotateCcw size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden="true" />
              <span>
                <strong>Sıfırlanır:</strong> kasa, fincanlar, yükseltmeler, dükkan seviyesi
              </span>
            </li>
          </ul>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              autoFocus
              onClick={onConfirm}
              className="flex-1 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--on-dark)] transition hover:bg-[var(--roast)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--milk)]"
            >
              Şubeyi aç
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--roast)] transition hover:border-[var(--roast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
            >
              Vazgeç
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
