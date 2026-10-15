"""Gemini'nin yeşil zeminde (#00FF00) ürettiği nesne görsellerini şeffaf zemine çevirir.

    python3 tools/assets/key_green.py <girdi> <çıktı.webp> <en uzun kenar px> [kalite]

- Yeşillik = G - max(R, B). Zemin ~240; nesne ≤ 0. Arada yumuşak geçiş: kenarlar ve yarı saydam buhar korunur.
- Yarı saydam piksellerde zemin rengi çıkarılarak nesnenin asıl rengi bulunur (buhar yeşilimsi değil beyaz kalır);
  kalan yeşil yansıma silinir (G en çok max(R, B) olur), kenarlarda yeşil hale kalmaz.
- Nesnenin çevresi kırpılır, %4 boşluk bırakılır, en uzun kenar istenen boyuta küçültülür.
"""
import sys

import numpy as np
from PIL import Image

LOW, HIGH = 28, 120  # bu aralıkta yeşillik arttıkça saydamlık artar


def key(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    # Zeminin gerçek rengi: kenar piksellerinin ortancası (tam #00FF00 olmayabilir)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    excess = g - np.maximum(r, b)
    alpha = 1 - np.clip((excess - LOW) / (HIGH - LOW), 0, 1)
    # Yarı saydam kenarlar ve buhar: gözlenen = a·nesne + (1-a)·zemin → nesne rengini geri çöz
    a = np.maximum(alpha, 0.05)[..., None]
    fg = (rgb - (1 - a) * bg) / a
    fg = np.where(alpha[..., None] > 0.995, rgb, fg).clip(0, 255)
    r, g, b = fg[..., 0], fg[..., 1], fg[..., 2]
    # Hâlâ yeşile çalan pikseller (Gemini buharı yeşilimsi boyayabiliyor): aynı parlaklıkta sıcak krem-griye çevir
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    # yeşil baskın ya da zeytin tonu (R ≈ G, B belirgin düşük) ve açık renk: buhar böyle görünüyor
    greenish = ((g > np.maximum(r, b) + 2) | ((r - g < 7) & (g - b > 18) & (lum > 140)))[..., None]
    warm = np.dstack([lum * 1.03, lum * 0.99, lum * 0.92])
    fg = np.where(greenish, warm, np.dstack([r, np.minimum(g, np.maximum(r, b) + 6), b])).clip(0, 255)
    out = np.dstack([fg, alpha * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    ys, xs = np.nonzero(alpha > 0.03)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = int(max(x1 - x0, y1 - y0) * 0.04)
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def main():
    src, dst, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
    quality = int(sys.argv[4]) if len(sys.argv) > 4 else 90
    img = key(src)
    img.thumbnail((size, size), Image.LANCZOS)
    img.save(dst, quality=quality, method=6)
    print(dst, img.size)


if __name__ == '__main__':
    main()
