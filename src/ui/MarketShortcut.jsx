import React from 'react';
import { ArrowUp, ShoppingBag } from 'lucide-react';

// Telefonda ve tablette market sayfanın aşağısında kalır: bu düğme markete götürür, marketteyken latteye döndürür.
// Sentetik betada rehbersiz telefon oyuncularının yarısı marketi ilk oturumda bulamıyordu.
export default function MarketShortcut({ affordable, inMarket, onClick }) {
  const label = inMarket
    ? 'Latteye dön'
    : `Markete git${affordable > 0 ? `, ${affordable} yükseltme alınabilir` : ''}`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 z-30 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-[0_16px_32px_-12px_rgba(0,0,0,0.55)] transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 lg:hidden ${
        inMarket
          ? 'bg-[var(--crema)] text-[var(--espresso)] focus-visible:ring-[var(--on-dark)] focus-visible:ring-offset-[var(--espresso)]'
          : 'bg-[var(--ink)] text-[var(--on-dark)] focus-visible:ring-[var(--crema)] focus-visible:ring-offset-[var(--foam)]'
      }`}
    >
      {inMarket ? (
        <ArrowUp size={18} strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <ShoppingBag size={18} strokeWidth={2.2} aria-hidden="true" />
      )}
      {inMarket ? 'Latte' : 'Market'}
      {!inMarket && affordable > 0 && (
        <span
          key={affordable}
          aria-hidden="true"
          className="bc-pop grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-[var(--crema)] px-1 text-[11px] font-bold text-[var(--espresso)]"
        >
          {affordable}
        </span>
      )}
    </button>
  );
}
