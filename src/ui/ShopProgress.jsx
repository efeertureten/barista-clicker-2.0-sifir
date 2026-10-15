import React from 'react';
import { Star } from 'lucide-react';

import starImg from '../barista-assets/star.webp';
import { fmt } from '../game/format.js';
import { src } from '../lib/asset.js';

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
          {i < stars.length &&
            (coffees >= stars[i] ? (
              <img
                src={src(starImg)}
                alt={`Yıldız alındı (${fmt(stars[i])} fincan)`}
                aria-label={`Yıldız alındı (${fmt(stars[i])} fincan)`}
                width={18}
                height={18}
                draggable={false}
                className="bc-img bc-pop h-[18px] w-[18px] shrink-0 object-contain"
              />
            ) : (
              <Star
                size={15}
                strokeWidth={2.2}
                aria-label={`Yıldız: ${fmt(stars[i])} fincan`}
                className="mx-px shrink-0 fill-transparent text-[var(--line)]"
              />
            ))}
        </React.Fragment>
      ))}
    </div>
  );
}
