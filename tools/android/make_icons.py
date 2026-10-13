"""Android simgelerini ve eski cihazlar için açılış ekranını public/icon-512.png'den üretir.

    python3 tools/android/make_icons.py

- Uyarlanabilir simge (Android 8+): arka plan düz krema rengi, ön plan fincan ve tabağı (kaynaktaki daire
  kesilir, altına yumuşak bir gölge eklenir). Tabak 50 dp: 108 dp katmanın güvenli bölgesine (66 dp) rahatça sığar.
- Eski simgeler (Android 7): yuvarlatılmış kare ve daire.
- Açılış ekranı (Android 7–11): köpük renginde zemin, ortada yuvarlak simge. Android 12+ sistemin kendi
  açılış ekranını gösterir (styles.xml: köpük zemin + uygulama simgesi).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public' / 'icon-512.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

CREMA = (206, 138, 67)  # kaynak simgenin zemini (#CE8A43)
FOAM = (241, 230, 214)  # oyunun köpük rengi (#F1E6D6)
SAUCER_CENTER, SAUCER_RADIUS = (252, 252), 152  # kaynakta tabağın dairesi (512 px)

DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
SS = 4  # kenarlar için süper örnekleme


def circle_mask(size, box):
    m = Image.new('L', (size * SS, size * SS), 0)
    ImageDraw.Draw(m).ellipse([v * SS for v in box], fill=255)
    return m.resize((size, size), Image.LANCZOS)


def rounded_mask(size, radius):
    m = Image.new('L', (size * SS, size * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * SS - 1, size * SS - 1], radius=radius * SS, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def saucer_cutout(src):
    """Tabak + fincan, şeffaf zeminde (kare, tabağın çapı kadar)."""
    cx, cy = SAUCER_CENTER
    r = SAUCER_RADIUS
    crop = src.crop((cx - r, cy - r, cx + r, cy + r)).convert('RGBA')
    d = 2 * r
    crop.putalpha(circle_mask(d, (1, 1, d - 1, d - 1)))
    return crop


def foreground(src, px):
    """108 dp ön plan katmanı; tabak 50 dp, ortada, hafif sağ-alt gölgeyle."""
    layer = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    dp = px / 108
    d = round(50 * dp)
    saucer = saucer_cutout(src).resize((d, d), Image.LANCZOS)
    off = (px - d) // 2
    shadow = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    dx, dy = round(1.5 * dp), round(2.5 * dp)
    sd.ellipse([off + dx, off + dy, off + d + dx, off + d + dy], fill=(74, 40, 16, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2.2 * dp))
    layer.alpha_composite(shadow)
    layer.alpha_composite(saucer, (off, off))
    return layer


def legacy(src, px, round_icon):
    img = src.convert('RGBA').resize((px, px), Image.LANCZOS)
    mask = circle_mask(px, (0, 0, px, px)) if round_icon else rounded_mask(px, round(px * 0.18))
    out = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def splash(src, w, h):
    out = Image.new('RGB', (w, h), FOAM)
    d = round(min(w, h) * 0.36)
    icon = legacy(src, d, round_icon=True)
    out.paste(icon, ((w - d) // 2, (h - d) // 2), icon)
    return out


def main():
    src = Image.open(SRC).convert('RGB')
    for name, k in DENSITIES.items():
        folder = RES / f'mipmap-{name}'
        foreground(src, round(108 * k)).save(folder / 'ic_launcher_foreground.png', optimize=True)
        legacy(src, round(48 * k), False).save(folder / 'ic_launcher.png', optimize=True)
        legacy(src, round(48 * k), True).save(folder / 'ic_launcher_round.png', optimize=True)
    # Açılış ekranları: Capacitor şablonundaki boyutlar korunur
    for path in sorted(RES.glob('drawable*/splash.png')):
        w, h = Image.open(path).size
        splash(src, w, h).save(path, optimize=True)
    (RES / 'values' / 'ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="ic_launcher_background">#%02X%02X%02X</color>\n'
        '    <color name="splash_background">#%02X%02X%02X</color>\n</resources>\n' % (CREMA + FOAM))
    print('simgeler ve açılış ekranları güncellendi')


if __name__ == '__main__':
    main()
