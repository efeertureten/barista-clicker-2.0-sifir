const nfInt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const nfOne = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const nfTwo = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfCompact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 2 });

export const fmt = (n) => (n < 1e6 ? nfInt.format(Math.floor(n)) : nfCompact.format(n));
export const fmtRate = (n) => (n < 1e6 ? nfOne.format(n) : nfCompact.format(n));
export const fmtMoney = (n) => `₺${fmt(n)}`;
export const fmtPrice = (n) => `₺${nfTwo.format(n)}`;
export const fmtPercent = (ratio) => `%${nfInt.format(Math.round(ratio * 100))}`;
