import React from 'react';
import { Check, Coffee, Coins, Flame, Gift, MousePointerClick, ShoppingBag, Snowflake, Zap } from 'lucide-react';

import beanImg from '../barista-assets/bean.webp';
import { src } from '../lib/asset.js';
import { fmt, fmtMoney } from '../game/format.js';

// Altın Çekirdek: oyunun premium parası. Görseli gelene kadar kahve çekirdeği altın tonuna boyanır.
export function GoldBean({ size = 16 }) {
  return (
    <img
      src={src(beanImg)}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="bc-img inline-block shrink-0"
      style={{ width: size, height: size, filter: 'sepia(1) saturate(3.2) hue-rotate(2deg) brightness(1.18)' }}
    />
  );
}

const ORDER_TEXT = {
  tap: { icon: MousePointerClick, label: (n) => `${fmt(n)} kez latteye dokun` },
  brew: { icon: Coffee, label: (n) => `${fmt(n)} fincan demle` },
  buy: { icon: ShoppingBag, label: (n) => `${fmt(n)} yükseltme al` },
  collect: { icon: Coins, label: () => 'Hoş geldin kartından birikeni topla' },
};

// Günün siparişleri: üç sipariş, seri, Altın Çekirdek ve hızlı demleme.
// Sahte geri sayım yok: siparişler gece yarısı yenilenir, bu yalnızca bir kez yazılır.
export default function DailyOrders({ daily, gold, streak, streakAlive, cfg, canInstant, onClaim, onBonus, onInstant }) {
  const claimed = daily.orders.filter((o) => o.claimed).length;
  const allClaimed = claimed === daily.orders.length;
  return (
    <section
      aria-label="Günün siparişleri"
      className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--milk)] p-4 text-left shadow-[0_18px_40px_-28px_rgba(43,26,17,0.55)] sm:p-5 xl:max-w-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="bc-display text-lg font-extrabold leading-tight">Günün siparişleri</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Yarın yeni siparişler gelir</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              streakAlive ? 'bg-[var(--crema-soft)] text-[var(--crema-deep)]' : 'bg-[var(--paper)] text-[var(--muted)]'
            }`}
            title="Seri: sipariş teslim ettiğin gün sayısı. Kaçırdığın bir günü dondurma hakkı karşılar."
            aria-label={`Seri ${streakAlive ? streak.count : 0} gün`}
          >
            <Flame size={14} strokeWidth={2.4} aria-hidden="true" />
            <span className="bc-mono">{streakAlive ? streak.count : 0}</span> gün
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[var(--paper)] px-2 py-1 text-xs font-semibold text-[var(--roast)]"
            title="Dondurma hakkı: kaçırdığın bir gün seriyi bozmaz. Her 7 günde bir hak geri gelir."
            aria-label={`${streak.freezes} dondurma hakkı`}
          >
            <Snowflake size={13} strokeWidth={2.4} aria-hidden="true" />
            <span className="bc-mono">{streak.freezes}</span>
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold text-[var(--on-dark)]"
            aria-label={`${gold} Altın Çekirdek`}
            title="Altın Çekirdek"
          >
            <GoldBean size={14} />
            <span className="bc-mono">{fmt(gold)}</span>
          </span>
        </div>
      </header>

      <ul className="mt-3 space-y-2">
        {daily.orders.map((o, i) => {
          const { icon: Icon, label } = ORDER_TEXT[o.type];
          const ready = !o.claimed && o.progress >= o.target;
          const ratio = Math.min(1, o.progress / o.target);
          return (
            <li
              key={`${o.type}-${i}`}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                o.claimed ? 'bg-[var(--foam)] opacity-60' : ready ? 'bg-[var(--crema-soft)] ring-1 ring-inset ring-[var(--crema)]' : 'bg-[var(--foam)]'
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                  o.claimed ? 'bg-[var(--crema-deep)] text-[var(--on-dark)]' : 'bg-[var(--milk)] text-[var(--roast)]'
                }`}
              >
                {o.claimed ? <Check size={16} strokeWidth={2.8} aria-hidden="true" /> : <Icon size={16} strokeWidth={2.2} aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold leading-snug ${o.claimed ? 'line-through decoration-[var(--line)]' : ''}`}>
                  {label(o.target)}
                </p>
                {!o.claimed && !ready && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--paper)]">
                      <span className="block h-full rounded-full bg-[var(--crema)]" style={{ width: `${ratio * 100}%` }} />
                    </span>
                    <span className="bc-mono shrink-0 text-[11px] text-[var(--muted)]">
                      {fmt(o.progress)}/{fmt(o.target)}
                    </span>
                  </div>
                )}
                {(ready || o.claimed) && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                    +{fmtMoney(o.money)} · +{o.gold} <GoldBean size={11} />
                  </p>
                )}
              </div>
              {ready && (
                <button
                  type="button"
                  onClick={() => onClaim(i)}
                  className="bc-pop shrink-0 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-[var(--on-dark)] transition hover:bg-[var(--roast)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
                >
                  Teslim et
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {daily.bonusClaimed ? (
          <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Check size={14} strokeWidth={2.6} aria-hidden="true" /> Günün bonusu alındı
          </p>
        ) : allClaimed ? (
          <button
            type="button"
            onClick={onBonus}
            className="bc-pop inline-flex items-center gap-1.5 rounded-full bg-[var(--crema)] px-3.5 py-1.5 text-xs font-semibold text-[var(--espresso)] transition hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
          >
            <Gift size={14} strokeWidth={2.4} aria-hidden="true" /> Günün bonusu: +{cfg.goldAllBonus} <GoldBean size={13} />
          </button>
        ) : (
          <p className="flex items-center gap-1 text-xs text-[var(--muted)]">
            Üçünü de teslim et: +{cfg.goldAllBonus} <GoldBean size={12} /> ({claimed}/{daily.orders.length})
          </p>
        )}
        <button
          type="button"
          onClick={onInstant}
          disabled={!canInstant}
          title={`Saniyedeki üretiminle ${fmt(cfg.instantHours)} saatte demleyeceğin kahveyi hemen al`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--roast)] transition enabled:hover:border-[var(--roast)] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
        >
          <Zap size={14} strokeWidth={2.4} aria-hidden="true" />
          Hızlı demleme {fmt(cfg.instantHours)} sa · {cfg.instantCost} <GoldBean size={12} />
        </button>
      </div>
    </section>
  );
}
