import React from 'react';

// Ses / Müzik aç-kapa düğmesi: kapalıyken soluk, kesik çerçeveli ve üstü çizili
export default function AudioToggle({ on, onClick, label, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={`${label} ${on ? 'açık' : 'kapalı'}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] ${
        on
          ? 'border-[var(--line)] bg-[var(--milk)] text-[var(--roast)] hover:border-[var(--crema)] hover:text-[var(--ink)]'
          : 'border-dashed border-[var(--line)] bg-transparent text-[var(--muted)] hover:text-[var(--roast)]'
      }`}
    >
      <Icon size={14} strokeWidth={2.2} aria-hidden="true" className={on ? '' : 'opacity-60'} />
      <span className={on ? '' : 'line-through decoration-1'}>{label}</span>
    </button>
  );
}
