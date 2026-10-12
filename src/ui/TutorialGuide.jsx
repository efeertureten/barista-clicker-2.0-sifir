import React from 'react';
import { ArrowDown, ArrowUp, Check } from 'lucide-react';

// İlk deneyim rehberi kartı. Geniş ekranda fincanın altında durur (market yanda görünür);
// telefonda ve tablette ekranın altına sabitlenir, çünkü market sayfanın aşağısında kalır.
// guide: { index, total, title, text, progress?: { value, max, label }, action?: { label, direction, onClick } }
export default function TutorialGuide({ guide, onSkip }) {
  const { index, total, title, text, progress, action } = guide;
  const ratio = progress ? Math.min(1, progress.value / progress.max) : 0;
  const ActionIcon = action?.direction === 'up' ? ArrowUp : ArrowDown;

  return (
    <section
      aria-label="Rehber"
      aria-live="polite"
      className="bc-toast fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-30 mx-auto max-w-md rounded-2xl border border-[var(--crema)] bg-[var(--milk)] p-4 text-left shadow-[0_24px_48px_-20px_rgba(43,26,17,0.55)] lg:static lg:inset-auto lg:z-auto lg:w-full lg:max-w-sm lg:shadow-[0_18px_40px_-28px_rgba(43,26,17,0.55)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--crema-deep)]">
          Rehber · {index + 1}/{total}
        </p>
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 rounded-full ${i < index ? 'bg-[var(--crema-deep)]' : i === index ? 'bg-[var(--crema)]' : 'bg-[var(--paper)]'}`}
            />
          ))}
        </span>
      </div>
      <h2 className="bc-display mt-1.5 text-lg font-extrabold leading-tight text-[var(--ink)]">{title}</h2>
      {/* Kısa telefon ekranlarında açıklama gizlenir: şerit fincanı örtmesin */}
      <p className="mt-1 text-[13px] leading-snug text-[var(--roast)] [@media(max-height:700px)]:hidden lg:[@media(max-height:700px)]:block">
        {text}
      </p>

      {progress && (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--paper)]"
            role="progressbar"
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
          >
            <div className="h-full rounded-full bg-[var(--crema)] transition-[width] duration-200" style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className="bc-mono mt-1 text-right text-[11px] text-[var(--muted)]">{progress.label}</p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-[var(--muted)] underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--roast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
        >
          Rehberi geç
        </button>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-[var(--on-dark)] transition hover:bg-[var(--roast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] lg:hidden"
          >
            <ActionIcon size={14} strokeWidth={2.4} aria-hidden="true" />
            {action.label}
          </button>
        )}
      </div>
    </section>
  );
}

// Rehber bitince: oyuncuya en önemli şeyi, yokken de kazandığını söyler ve kendiliğinden kapanır
export function TutorialDone({ text, onClose }) {
  return (
    <section
      aria-label="Rehber tamamlandı"
      aria-live="polite"
      className="bc-toast fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-30 mx-auto max-w-md rounded-2xl bg-[var(--ink)] p-4 text-left text-[var(--on-dark)] shadow-[0_24px_48px_-20px_rgba(43,26,17,0.7)] lg:static lg:inset-auto lg:z-auto lg:w-full lg:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--crema)] text-[var(--espresso)]">
          <Check size={18} strokeWidth={2.8} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="bc-display text-lg font-extrabold leading-tight">Dükkan artık senin!</h2>
          <p className="mt-1 text-[13px] leading-snug text-[var(--on-dark-muted)]">{text}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 rounded-full bg-[var(--crema)] px-4 py-1.5 text-xs font-semibold text-[var(--espresso)] transition hover:bg-[var(--on-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--on-dark)]"
          >
            Tamam
          </button>
        </div>
      </div>
    </section>
  );
}
