import React, { useState } from 'react';
import { Check, LoaderCircle, Send, TriangleAlert } from 'lucide-react';

import Modal, { primaryButton, secondaryButton } from './Modal.jsx';
import { FEEDBACK_KINDS, FEEDBACK_MAX } from '../cloud/feedback.js';
import { cloudErrorText } from './CloudPanel.jsx';

const PLACEHOLDERS = {
  bug: 'Ne oldu, ne yapıyordun? Hangi ekranda?',
  idea: 'Oyunda ne görmek isterdin?',
  other: 'Aklındakini yaz.',
};

// Oyun içi geri bildirim formu. onSend(kind, text) bir Promise döner.
export default function FeedbackModal({ onSend, onClose }) {
  const [kind, setKind] = useState('bug');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSend(kind, text);
      setSent(true);
    } catch (err) {
      setError(cloudErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Modal id="bc-feedback" eyebrow="Geri bildirim" title="Aldık, teşekkürler!" onClose={onClose}>
        <p className="mt-2 flex items-start gap-2 text-sm leading-snug text-[var(--roast)]">
          <Check size={18} strokeWidth={2.6} className="mt-0.5 shrink-0 text-[var(--crema-deep)]" aria-hidden="true" />
          Yazdıkların doğrudan geliştiriciye ulaştı. Oyun her sürümde bu notlarla biraz daha iyi oluyor.
        </p>
        <button type="button" autoFocus onClick={onClose} className={`${primaryButton} mt-5 w-full`}>
          Oyuna dön
        </button>
      </Modal>
    );
  }

  return (
    <Modal id="bc-feedback" eyebrow="Geri bildirim" title="Ne düşünüyorsun?" onClose={onClose}>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
        <div role="radiogroup" aria-label="Tür" className="grid grid-cols-3 gap-1 rounded-full bg-[var(--foam)] p-1">
          {FEEDBACK_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)] ${
                kind === k.id ? 'bg-[var(--ink)] text-[var(--on-dark)]' : 'text-[var(--roast)] hover:bg-[var(--paper)]'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="bc-feedback-text">
          Mesaj
        </label>
        <textarea
          id="bc-feedback-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, FEEDBACK_MAX))}
          rows={5}
          autoFocus
          placeholder={PLACEHOLDERS[kind]}
          className="w-full resize-none rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm leading-snug outline-none focus:border-[var(--crema)] focus:ring-2 focus:ring-[var(--crema-soft)]"
        />
        <p className="-mt-1 flex justify-between gap-3 text-[11px] text-[var(--muted)]">
          <span>Ad, e-posta ya da telefon yazma. Sürüm ve dükkân seviyen otomatik eklenir.</span>
          <span className="bc-mono shrink-0">
            {text.length}/{FEEDBACK_MAX}
          </span>
        </p>
        {error && (
          <p role="alert" className="flex items-start gap-2 text-[13px] leading-snug text-[#9a3412]">
            <TriangleAlert size={16} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={busy || !text.trim()} className={`${primaryButton} flex-1`}>
            {busy ? (
              <LoaderCircle size={16} strokeWidth={2.4} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={16} strokeWidth={2.2} aria-hidden="true" />
            )}
            Gönder
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            Vazgeç
          </button>
        </div>
      </form>
    </Modal>
  );
}
