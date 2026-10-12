import React from 'react';
import { Coins } from 'lucide-react';

import { src } from '../lib/asset.js';
import { fmt, fmtDuration, fmtMoney, fmtPercent } from '../game/format.js';

// "Hoş geldin" kartı: oyuncu uzaktayken dükkanın ürettiğini gösterir ve tek dokunuşla kasaya aktarır.
// Kapatmanın her yolu (düğme, Esc, arka plana tıklama) toplar; oyuncu kazancını hiçbir şekilde kaybetmez.
export default function WelcomeBack({ pending, shop, efficiency, capSeconds, onCollect }) {
  const money = pending.coffees * shop.price;
  const fill = Math.min(1, pending.seconds / capSeconds);
  const pace = efficiency === 0.5 ? 'yarım hızla' : `${fmtPercent(efficiency)} hızla`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(36,21,13,0.55)] p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onCollect()}
      onKeyDown={(e) => e.key === 'Escape' && onCollect()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bc-welcome-title"
        aria-describedby="bc-welcome-text"
        className="bc-rise w-full max-w-sm overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--milk)] text-[var(--ink)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
      >
        <div className="relative aspect-[12/5] overflow-hidden border-b border-[var(--line)]" style={{ backgroundColor: shop.tint }}>
          <img
            src={src(shop.image)}
            alt=""
            width={1200}
            height={500}
            draggable={false}
            className="bc-img absolute inset-0 h-full w-full object-contain"
          />
        </div>

        <div className="p-5">
          <h2 id="bc-welcome-title" className="bc-display text-2xl font-extrabold">
            Hoş geldin!
          </h2>
          <p id="bc-welcome-text" className="mt-1 text-sm leading-snug text-[var(--roast)]">
            Sen yokken {shop.name} {pace} çalışmaya devam etti.
          </p>

          <div className="mt-4 rounded-2xl bg-[var(--foam)] px-4 py-3">
            <p className="bc-mono text-3xl font-semibold text-[var(--crema-deep)]">+{fmtMoney(money)}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{fmt(pending.coffees)} fincan demlendi</p>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Kahve deposu</span>
              <span className="bc-mono text-[var(--roast)]">
                {fmtDuration(pending.seconds)} / {fmtDuration(capSeconds)}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--paper)]"
              role="progressbar"
              aria-label="Kahve deposu"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fill * 100)}
            >
              <div
                className={`h-full rounded-full ${pending.capped ? 'bg-[var(--crema-deep)]' : 'bg-[var(--crema)]'}`}
                style={{ width: `${fill * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-snug text-[var(--muted)]">
              {pending.capped ? (
                <>
                  {fmtDuration(pending.away)} uzaktaydın ama depo {fmtDuration(capSeconds)} sonra doldu.{' '}
                  <span className="font-semibold text-[var(--roast)]">Daha sık uğra, kahveler soğumasın.</span>
                </>
              ) : (
                <>{fmtDuration(pending.away)} uzaktaydın.</>
              )}
            </p>
          </div>

          <button
            type="button"
            autoFocus
            onClick={onCollect}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--on-dark)] transition hover:bg-[var(--roast)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--milk)]"
          >
            <Coins size={18} strokeWidth={2.2} aria-hidden="true" />
            Topla
          </button>
        </div>
      </section>
    </div>
  );
}
