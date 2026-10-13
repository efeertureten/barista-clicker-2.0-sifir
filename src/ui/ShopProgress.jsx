import React from 'react';
import { Star } from 'lucide-react';

import { fmt } from '../game/format.js';

// Sonraki dükkana ilerleme: çubuk yıldız eşiklerinde bölümlere ayrılır, her bölüm kendi aralığında dolar.
// Eşikler logaritmik olduğu için bölümler zamanda eşite yakın ilerler; düz bir çubukta ilk yıldızlar en başa sıkışırdı.
// points: [bu dükkanın eşiği, ...yıldız eşikleri, sonraki dükkanın eşiği]
export default function ShopProgress({ coffees, points, label }) {
  const segments = points.slice(1).map((end, i) => {
    const start = points[i];
    return Math.min(1, Math.max(0, (coffees - start) / (end - start)));
  });
  const overall = segments.reduce((sum, f) => sum + f, 0) / segments.length;
  const stars = points.slice(1, -1);

  return (
    <div
      className="mt-2 flex items-center gap-1"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(overall * 100)}
    >
      {segments.map((fill, i) => (
        <React.Fragment key={i}>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--paper)]">
            <div className="h-full rounded-full bg-[var(--crema)] transition-[width] duration-300" style={{ width: `${fill * 100}%` }} />
          </div>
          {i < stars.length && (
            <Star
              size={15}
              strokeWidth={2.2}
              aria-label={coffees >= stars[i] ? `Yıldız alındı (${fmt(stars[i])} fincan)` : `Yıldız: ${fmt(stars[i])} fincan`}
              className={`shrink-0 transition-colors ${
                coffees >= stars[i] ? 'fill-[var(--crema)] text-[var(--crema-deep)]' : 'fill-transparent text-[var(--line)]'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
