const nfInt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const nfOne = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const nfTwo = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfCompact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 2 });

export const fmt = (n) => (n < 1e6 ? nfInt.format(Math.floor(n)) : nfCompact.format(n));
export const fmtRate = (n) => (n < 1e6 ? nfOne.format(n) : nfCompact.format(n));
export const fmtMoney = (n) => `₺${fmt(n)}`;
export const fmtPrice = (n) => `₺${nfTwo.format(n)}`;
export const fmtPercent = (ratio) => `%${nfInt.format(Math.round(ratio * 100))}`;

// Süre: "45 sn", "12 dk", "1 sa 5 dk", "2 sa", "3 gün 4 sa"
export function fmtDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} sa ${m % 60} dk` : `${h} sa`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} gün ${h % 24} sa` : `${d} gün`;
}
