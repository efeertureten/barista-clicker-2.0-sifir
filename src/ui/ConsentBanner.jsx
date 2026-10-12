import React from 'react';

// Veri izni bandı: oyunu kapatmaz, köşede durur. Yalnızca ölçüm hedefi tanımlıyken ve ilk tıklamadan sonra çıkar.
export default function ConsentBanner({ onAccept, onDecline }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:justify-start sm:px-6 sm:pb-6">
      <section
        role="dialog"
        aria-labelledby="bc-consent-title"
        aria-describedby="bc-consent-text"
        className="bc-toast pointer-events-auto w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--milk)] p-4 text-[var(--ink)] shadow-[0_24px_48px_-24px_rgba(43,26,17,0.6)]"
      >
        <h2 id="bc-consent-title" className="bc-display text-base font-extrabold">
          Oyunu birlikte geliştirelim mi?
        </h2>
        <p id="bc-consent-text" className="mt-1.5 text-[13px] leading-snug text-[var(--roast)]">
          Hangi seviyeye ulaştığın, hangi yükseltmeyi aldığın gibi oynanış verilerini Google Analytics ile toplamak
          istiyoruz. Adın ya da e-postan toplanmaz. Kararını alttaki &ldquo;Veri izni&rdquo; bağlantısından
          değiştirebilirsin.{' '}
          <a
            href="./gizlilik.html"
            target="_blank"
            rel="noopener"
            className="font-semibold text-[var(--crema-deep)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            Ayrıntılar
          </a>
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[var(--on-dark)] transition hover:bg-[var(--roast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--milk)]"
          >
            Kabul et
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--roast)] transition hover:border-[var(--roast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
          >
            Hayır, teşekkürler
          </button>
        </div>
      </section>
    </div>
  );
}
