"""Play Store ve paylaşım görsellerini oyunun yazı tipleriyle birleştirir (HTML → Playwright ekran görüntüsü).

    python3 tools/store/compose.py <yakalanan sahneler klasörü> <B1 afiş> <B2 zemin>

Çıktılar (store/ ve public/):
- store/feature-graphic.png   1024×500  Play "öne çıkan görsel"
- public/og-image.jpg         1200×630  WhatsApp / sosyal medya bağlantı önizlemesi
- store/screenshots/NN.jpg    1080×1920 Play ekran görüntüleri (tools/store/capture.py sahneleri + başlık)
- store/icon-512.png          512×512   Play uygulama simgesi (32 bit PNG)
"""
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[2]
CAPS, B1, B2 = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
STORE = REPO / 'store'
(STORE / 'screenshots').mkdir(parents=True, exist_ok=True)
NM = REPO / 'node_modules'
EMBLEM = REPO / 'src' / 'barista-assets' / 'emblem.webp'

CAPTIONS = [
    'Dokun, demle, sat',
    'Seyyar tezgâhtan imparatorluğa',
    '8 üretici, kilometre taşları',
    'Kahve Telaşı: kombo ×2,5',
    'Her gün 3 sipariş, Altın Çekirdek',
    'Sen yokken de demler',
    'İmparatorluktan sonra yeni şube',
    'İlerlemen bulutta güvende',
]

FONTS = f"""
@font-face {{ font-family: 'Bricolage Grotesque'; font-weight: 200 800;
  src: url('{(NM / '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2').as_uri()}') format('woff2'); }}
@font-face {{ font-family: 'Bricolage Grotesque'; font-weight: 200 800; unicode-range: U+0100-024F, U+20BA;
  src: url('{(NM / '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-opsz-normal.woff2').as_uri()}') format('woff2'); }}
@font-face {{ font-family: 'Figtree'; font-weight: 600;
  src: url('{(NM / '@fontsource/figtree/files/figtree-latin-600-normal.woff2').as_uri()}') format('woff2'); }}
@font-face {{ font-family: 'Figtree'; font-weight: 600; unicode-range: U+0100-024F, U+20BA;
  src: url('{(NM / '@fontsource/figtree/files/figtree-latin-ext-600-normal.woff2').as_uri()}') format('woff2'); }}
* {{ box-sizing: border-box; margin: 0; }}
"""


def banner_html(w, h):
    s = w / 1024  # 1024×500 tasarımına göre ölçek
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{FONTS}
body {{ width: {w}px; height: {h}px; overflow: hidden; background: #f0dcbe url('{B1.as_uri()}') center / cover no-repeat; }}
.text {{ position: absolute; left: {56 * s}px; top: 50%; transform: translateY(-50%); width: {430 * s}px; }}
.emblem {{ width: {104 * s}px; height: auto; display: block; margin-left: {-8 * s}px; filter: drop-shadow(0 {10 * s}px {14 * s}px rgba(43,26,17,.25)); }}
h1 {{ font: 800 {62 * s}px/1 'Bricolage Grotesque'; color: #2b1a11; letter-spacing: -0.015em; margin-top: {10 * s}px; }}
.tag {{ font: 600 {27 * s}px/1.2 'Figtree'; color: #6b4029; margin-top: {12 * s}px; }}
.sub {{ font: 600 {17 * s}px/1.3 'Figtree'; color: #86654f; margin-top: {8 * s}px; }}
</style></head><body><div class="text"><img class="emblem" src="{EMBLEM.as_uri()}"><h1>Barista Clicker</h1>
<p class="tag">Demle, sat, büyü.</p><p class="sub">Seyyar tezgâhtan kahve imparatorluğuna</p></div></body></html>"""


def shot_html(caption, image):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{FONTS}
body {{ width: 1080px; height: 1920px; overflow: hidden; background: #f1e6d6 url('{B2.as_uri()}') center / cover no-repeat;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 56px; }}
h1 {{ font: 800 76px/1.04 'Bricolage Grotesque'; color: #2b1a11; letter-spacing: -0.015em; text-align: center;
  max-width: 720px; text-wrap: balance; /* zemindeki köşe çekirdeklerine değmesin, değerse de okunur kalsın */
  text-shadow: 0 0 16px #f6ecdf, 0 0 32px #f6ecdf, 0 0 48px rgba(246,236,223,.8); }}
img {{ width: 880px; height: auto; border-radius: 52px; border: 7px solid #fbf6ee;
  box-shadow: 0 50px 90px -40px rgba(43,26,17,.6), 0 10px 30px -10px rgba(43,26,17,.25); }}
</style></head><body><h1>{caption}</h1><img src="{image.as_uri()}"></body></html>"""


def render(page, html, w, h, out, jpeg=False):
    tmp = STORE / '.compose.html'
    tmp.write_text(html, encoding='utf-8')
    page.set_viewport_size({'width': w, 'height': h})
    page.goto(tmp.as_uri())
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(300)
    if jpeg:
        page.screenshot(path=str(out), type='jpeg', quality=90)
    else:
        page.screenshot(path=str(out))
    tmp.unlink()
    print('  ✓', out.relative_to(REPO), f'{w}×{h}')


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--allow-file-access-from-files'])
        page = browser.new_page()
        render(page, banner_html(1024, 500), 1024, 500, STORE / 'feature-graphic.png')
        render(page, banner_html(1200, 630), 1200, 630, REPO / 'public' / 'og-image.jpg', jpeg=True)
        for i, caption in enumerate(CAPTIONS, 1):
            render(page, shot_html(caption, CAPS / f'{i:02d}.png'), 1080, 1920, STORE / 'screenshots' / f'{i:02d}.jpg', jpeg=True)
        browser.close()
    # Play: öne çıkan görsel saydamlıksız (24 bit), simge 32 bit PNG
    Image.open(STORE / 'feature-graphic.png').convert('RGB').save(STORE / 'feature-graphic.png')
    Image.open(REPO / 'public' / 'icon-512.png').convert('RGBA').save(STORE / 'icon-512.png')
    print('  ✓ store/icon-512.png 512×512')


if __name__ == '__main__':
    main()
