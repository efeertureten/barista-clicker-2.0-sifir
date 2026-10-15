import React from 'react';

import bellImg from '../barista-assets/icon-bell.webp';
import Modal, { primaryButton, secondaryButton } from './Modal.jsx';

// İlk "Hoş geldin" toplamasından sonra bir kez sorulur: oyuncu çevrimdışı birikimi o an tanımış olur.
// "Evet" sistemin izin penceresini açar; "Şimdi değil" bir daha kendiliğinden sormaz (ayardan açılabilir).
export default function NotifyPrompt({ capHours, onAccept, onDecline, onClose }) {
  return (
    <Modal id="bc-notify" art={bellImg} eyebrow="Bildirimler" title="Depo dolunca haber verelim mi?" onClose={onClose}>
      <div className="mt-3 rounded-2xl bg-[var(--foam)] px-4 py-3">
        <p className="text-sm leading-snug text-[var(--roast)]">
          Sen yokken dükkân demlemeye devam ediyor ama depo {capHours} saatte doluyor. Dolunca ve yeni siparişler gelince kısa
          bir bildirim gönderelim: günde en fazla iki, gece hiç.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" autoFocus onClick={onAccept} className={primaryButton}>
          Evet, haber ver
        </button>
        <button type="button" onClick={onDecline} className={secondaryButton}>
          Şimdi değil
        </button>
      </div>
    </Modal>
  );
}
