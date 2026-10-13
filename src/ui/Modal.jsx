import React from 'react';
import { X } from 'lucide-react';

// Ortak pencere kabuğu: karartılmış arka plan, ortada süt rengi kart, başlık ve kapatma düğmesi.
// Arka plana tıklamak ve Esc kapatır (onClose verilmediyse kapatılamaz: oyuncu bir seçim yapmalı).
export default function Modal({ id, eyebrow, title, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(36,21,13,0.55)] p-4 backdrop-blur-[2px]"
      onClick={(e) => onClose && e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => onClose && e.key === 'Escape' && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className={`bc-rise max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[28px] border border-[var(--line)] bg-[var(--milk)] p-5 text-[var(--ink)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ${
          wide ? 'max-w-md' : 'max-w-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--crema-deep)]">{eyebrow}</p>
            )}
            <h2 id={`${id}-title`} className="bc-display mt-1 text-2xl font-extrabold">
              {title}
            </h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="-mr-1 -mt-1 rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--foam)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
            >
              <X size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </section>
    </div>
  );
}

// Pencerelerdeki düğmeler: ana eylem koyu, ikincil çerçeveli
export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--on-dark)] transition hover:bg-[var(--roast)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--milk)]';
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--roast)] transition hover:border-[var(--roast)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]';
