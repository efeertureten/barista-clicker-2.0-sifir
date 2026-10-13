// Oyun içi geri bildirim: Firestore'daki "feedback" koleksiyonuna yalnızca eklenir. Okumak Firebase
// konsolundan (Firestore → feedback) yapılır; oyuncular birbirinin yazdığını göremez.

import { addDoc, currentUid, signIn } from './firebaseRest.js';

export const FEEDBACK_KINDS = [
  { id: 'bug', label: 'Hata' },
  { id: 'idea', label: 'Fikir' },
  { id: 'other', label: 'Diğer' },
];
export const FEEDBACK_MAX = 2000;

// context: { appVersion, platform, level, branch }
export async function sendFeedback(kind, text, context) {
  const body = String(text || '').trim().slice(0, FEEDBACK_MAX);
  if (!body) throw new Error('boş');
  await signIn();
  return addDoc('feedback', {
    kind: ['string', kind],
    text: ['string', body],
    appVersion: ['string', context.appVersion],
    platform: ['string', context.platform],
    level: ['int', context.level],
    branch: ['int', context.branch],
    userAgent: ['string', (typeof navigator !== 'undefined' ? navigator.userAgent : '').slice(0, 200)],
    sentAt: ['time', Date.now()],
    uid: ['string', currentUid() || ''],
  });
}
