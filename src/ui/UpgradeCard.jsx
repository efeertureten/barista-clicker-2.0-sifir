import React from 'react';
import { Flag, Lock } from 'lucide-react';

import { src } from '../lib/asset.js';
import { fmt, fmtMoney, fmtRate } from '../game/format.js';

// Yükseltme görseli; görseli henüz olmayan üreticilerde aynı kutuda ikon durur
function UpgradeArt({ upgrade, active }) {
  if (!upgrade.image) {
    const Icon = upgrade.icon;
    return (
      <span
        className={`absolute inset-0 grid place-items-center transition duration-200 ease-out ${
          active ? 'bc-pop text-[var(--crema)] group-hover:-rotate-3 group-hover:scale-110' : 'text-[var(--on-dark-muted)] opacity-60'
        }`}
      >
        <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      key={active ? 'ready' : 'locked'}
      src={src(upgrade.image)}
      alt=""
      width={256}
      height={256}
      draggable={false}
      className={`bc-img absolute inset-0 h-full w-full object-contain transition duration-200 ease-out ${
        upgrade.anchorBottom ? 'origin-bottom object-bottom pt-1' : 'p-1'
      } ${active ? 'bc-pop group-hover:-rotate-3 group-hover:scale-110' : 'opacity-45 grayscale'}`}
    />
  );
}

// Satın alınabilir (ya da para biriktirilen) yükseltme kartı.
// milestone: { next, prev, multiplier, step } yalnızca üreticilerde; next null ise bütün hedefler tamam.
export function UpgradeCard({ upgrade, owned, cost, affordable, progress, effect, milestone, onBuy }) {
  const showMilestone = milestone && owned > 0;
  return (
    <button
      type="button"
      disabled={!affordable}
      onClick={onBuy}
      aria-label={`${upgrade.name} satın al, ${fmtMoney(cost)}. Sahip olunan: ${owned}`}
      className="group relative w-full overflow-hidden rounded-2xl border border-[var(--line-dark)] bg-[var(--espresso-2)] p-4 text-left transition duration-150 enabled:hover:border-[var(--crema)] enabled:hover:bg-[var(--espresso-3)] enabled:active:scale-[0.985] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
    >
      <div className="flex items-start gap-3">
        <span
          className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl transition-colors ${
            affordable ? 'bg-[var(--crema-soft)] ring-1 ring-inset ring-[rgba(208,146,74,0.5)]' : 'bg-[var(--espresso-3)]'
          }`}
        >
          <UpgradeArt upgrade={upgrade} active={affordable} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="bc-display text-base font-semibold leading-tight">{upgrade.name}</h3>
            <span className="bc-mono shrink-0 text-xs text-[var(--on-dark-muted)]">{owned} adet</span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-[var(--on-dark-muted)]">{upgrade.desc}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate rounded-full bg-[var(--crema-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--crema)]">
                {effect}
              </span>
              {milestone && milestone.multiplier > 1 && (
                <span
                  className="bc-mono shrink-0 rounded-full bg-[var(--crema)] px-2 py-0.5 text-[11px] font-semibold text-[var(--espresso)]"
                  title="Kilometre taşı çarpanı"
                >
                  ×{fmt(milestone.multiplier)}
                </span>
              )}
            </span>
            <span
              className={`bc-mono shrink-0 text-base font-semibold ${
                affordable ? 'text-[var(--crema)]' : 'text-[var(--on-dark-muted)]'
              }`}
            >
              {fmtMoney(cost)}
            </span>
          </div>
          {showMilestone && (
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-[var(--on-dark-muted)]">
              <Flag size={12} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-[var(--crema)]" />
              {milestone.next ? (
                <>
                  <span className="bc-mono shrink-0">
                    {owned}/{milestone.next}
                  </span>
                  <span className="h-1 min-w-[1.5rem] flex-1 overflow-hidden rounded-full bg-[var(--line-dark)]">
                    <span
                      className="block h-full rounded-full bg-[var(--crema)] opacity-80"
                      style={{ width: `${((owned - milestone.prev) / (milestone.next - milestone.prev)) * 100}%` }}
                    />
                  </span>
                  <span className="shrink-0">üretim ×{fmt(milestone.step)}</span>
                </>
              ) : (
                <span>Bütün hedefler tamam</span>
              )}
            </div>
          )}
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
}

// Sıradaki, henüz açılmamış üretici: oyuncuya bir sonraki dükkanda ne bekliyor gösterir
export function LockedUpgradeCard({ upgrade, shopName, cps }) {
  return (
    <div
      role="group"
      aria-label={`${upgrade.name}: ${shopName} dükkanında açılır`}
      className="relative w-full rounded-2xl border border-dashed border-[var(--line-dark)] p-4"
    >
      <div className="flex items-center gap-3">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[var(--espresso-2)]">
          <span className="absolute inset-0 opacity-50 blur-[1px]">
            <UpgradeArt upgrade={upgrade} active={false} />
          </span>
          <span className="absolute inset-0 grid place-items-center text-[var(--on-dark-muted)]">
            <Lock size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="bc-display text-base font-semibold leading-tight text-[var(--on-dark-muted)]">{upgrade.name}</h3>
          <p className="mt-1 text-[13px] leading-snug text-[var(--on-dark-muted)]">
            <span className="font-semibold text-[var(--on-dark)]">{shopName}</span> dükkanında açılır · +{fmtRate(cps)} kahve / sn
          </p>
        </div>
      </div>
    </div>
  );
}
