"""Play Store ekran görüntüleri için oyundan sahneler yakalar (gerçek oyun, derlenmiş sürüm).

    npm run build && python3 tools/store/capture.py <çıktı klasörü> [sahne ...]   (ör. 01 04; boşsa hepsi)

Her sahne kendi kaydıyla açılır (?debug=1: açılış ekranı ve izin bandı yok, ölçüm dışarı gitmez). Bulut kaydı
sahnesi için Firebase uç noktaları taklit edilir. Çıktı: 01.png … 08.png (400×672 görünüm, 2,2 piksel yoğunluğu).
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1])
ONLY = set(sys.argv[2:])
OUT.mkdir(parents=True, exist_ok=True)
SAVE_KEY = 'barista-clicker-save-v1'
VIEW = {'width': 400, 'height': 672}
NOW_MS = int(time.time() * 1000)
TODAY = time.strftime('%Y-%m-%d')


def save(**s):
    base = {'money': 0, 'coffees': 0, 'earned': 0, 'clicks': 0, 'level': 0, 'gold': 0, 'stars': None, 'owned': {}}
    base.update(s)
    if base['stars'] is None:
        base.pop('stars')
    return base


def fake_firebase(route):
    url = route.request.url
    if 'identitytoolkit' in url:
        return route.fulfill(json={'idToken': 'tok1', 'refreshToken': 'ref1', 'expiresIn': '3600', 'localId': 'uid1'})
    if 'firestore.googleapis.com' in url:
        body = json.loads(route.request.post_data or '{}')
        return route.fulfill(json={'name': 'x', 'fields': body.get('fields', {}), 'updateTime': '2026-10-13T12:00:00.000001Z'})
    if any(h in url for h in ('googleapis', 'gstatic', 'googletagmanager', 'google-analytics')):
        return route.abort()
    return route.continue_()


def main():
    server = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4193', '--strictPort'], cwd=REPO,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(3)
        with sync_playwright() as p:
            browser = p.chromium.launch()

            def scene(name, s, prepare, init=''):
                if ONLY and name not in ONLY:
                    return
                ctx = browser.new_context(viewport=VIEW, device_scale_factor=2.2)
                seed = ("localStorage.clear(); localStorage.setItem('barista-clicker-consent-v1', 'granted');"
                        f"localStorage.setItem('{SAVE_KEY}', {json.dumps(json.dumps(s))});")
                ctx.add_init_script(f"if (!sessionStorage.getItem('__s')) {{ {seed} sessionStorage.setItem('__s', '1'); }}")
                if init:
                    ctx.add_init_script(init)
                ctx.route('**/*', fake_firebase)
                page = ctx.new_page()
                page.goto('http://localhost:4193/?debug=1')
                page.wait_for_timeout(900)
                prepare(page)
                page.screenshot(path=str(OUT / f'{name}.png'))
                print('  ✓', name)
                ctx.close()

            cup = lambda page: page.get_by_role('button', name=re.compile('^Kahve demle'))

            def center(page, selector, offset=0):
                page.evaluate(f"""() => {{ const el = document.querySelector({json.dumps(selector)});
                  const r = el.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY - (innerHeight - r.height) / 2 + {offset}); }}""")
                page.wait_for_timeout(250)

            # 1) Dokun, demle, sat
            def s1(page):
                center(page, '#bc-cup', 40)
                box = cup(page).bounding_box()
                for i in range(6):  # fincanın farklı yerlerine: sayılar ve çekirdekler dağılsın
                    page.mouse.click(box['x'] + box['width'] * (0.22 + 0.11 * i), box['y'] + box['height'] * (0.3 + 0.08 * (i % 3)))
                    page.wait_for_timeout(25)
                # Fotoğraf çekilirken animasyon sürmesin: sayılar ve çekirdekler en canlı anlarında dondurulur
                page.evaluate("""() => document.getAnimations().forEach((a, i) => {
                  const el = a.effect && a.effect.target;
                  if (!el || !(el.classList.contains('bc-float') || el.classList.contains('bc-bean'))) return;
                  a.pause(); a.currentTime = 170 + (i % 6) * 55; })""")
                page.wait_for_timeout(60)
            # Sayılar 900 ms sonra zamanlayıcıyla silinir; fotoğraf çekilene kadar silinmesinler
            keep_floaters = ("const st = window.setTimeout;"
                             "window.setTimeout = (f, d, ...a) => (d === 900 ? 0 : st(f, d, ...a));")
            scene('01', save(money=42, coffees=180, earned=180, clicks=180, owned={'beans': 2, 'machine': 1}, stars=2), s1,
                  init=keep_floaters)

            # 2) Seyyar tezgâhtan kahve imparatorluğuna: dükkan kartı
            scene('02', save(money=268_400, coffees=1_850_000, earned=2_100_000, clicks=2400, level=3, stars=7,
                             owned={'beans': 38, 'machine': 64, 'barista': 41, 'filter': 33, 'roaster': 14}),
                  lambda page: page.wait_for_timeout(300))

            # 3) 8 üretici, kilometre taşları: market
            def s3(page):
                page.evaluate("document.getElementById('bc-market').scrollIntoView()")
                page.wait_for_timeout(300)
            scene('03', save(money=52_000_000, coffees=40_000_000, earned=60_000_000, clicks=5000, level=4, stars=8,
                             owned={'beans': 52, 'machine': 104, 'barista': 58, 'filter': 49, 'roaster': 31, 'truck': 12, 'dealers': 2}), s3)

            # 4) Kahve Telaşı
            def s4(page):
                center(page, '#bc-cup', 130)
                page.get_by_role('button', name=re.compile('^Kahve Telaşı')).click()
                for _ in range(46):
                    cup(page).click(delay=10)
                    page.wait_for_timeout(30)
                page.wait_for_timeout(150)
            scene('04', save(money=900, coffees=20_000, earned=26_000, clicks=900, level=2, stars=4,
                             owned={'beans': 12, 'machine': 22, 'barista': 6}), s4)

            # 5) Günün siparişleri
            orders = [
                {'type': 'tap', 'target': 250, 'progress': 250, 'money': 1800, 'gold': 1, 'claimed': True},
                {'type': 'buy', 'target': 8, 'progress': 8, 'money': 1800, 'gold': 1, 'claimed': False},
                {'type': 'brew', 'target': 24_000, 'progress': 15_400, 'money': 1800, 'gold': 1, 'claimed': False},
            ]
            def s5(page):
                center(page, '[aria-label="Günün siparişleri"]', 0)
            scene('05', save(money=3200, coffees=30_000, earned=40_000, clicks=1500, level=2, stars=4, gold=7,
                             owned={'beans': 14, 'machine': 25, 'barista': 8},
                             daily={'day': TODAY, 'orders': orders, 'bonusClaimed': False},
                             streak={'count': 5, 'lastDay': TODAY, 'freezes': 2, 'best': 5}), s5)

            # 6) Sen yokken de demler: Hoş geldin kartı
            scene('06', save(money=5_000, coffees=600_000, earned=700_000, clicks=2000, level=3, stars=6, lastActiveAt=NOW_MS - 3 * 3600_000,
                             owned={'beans': 20, 'machine': 50, 'barista': 30, 'filter': 25, 'roaster': 6}),
                  lambda page: page.wait_for_timeout(500))

            # 7) Yeni şube
            def s7(page):
                page.get_by_role('region', name='Dükkan durumu').get_by_role('button', name='Şubeyi aç').click()
                page.wait_for_timeout(600)
            scene('07', save(money=9e9, coffees=350_000_000_000, earned=4e11, clicks=9000, level=5, stars=10,
                             owned={'beans': 80, 'machine': 160, 'barista': 120, 'filter': 104, 'roaster': 60, 'truck': 50, 'dealers': 30, 'plantation': 12}), s7)

            # 8) Bulut kaydı
            def s8(page):
                page.get_by_role('button', name=re.compile('^Bulut kaydı')).click()
                page.get_by_role('dialog').get_by_role('button', name='Bulut kaydını aç').click()
                page.wait_for_timeout(800)
            scene('08', save(money=12_000, coffees=900_000, earned=1_000_000, clicks=3000, level=3, stars=6,
                             owned={'beans': 25, 'machine': 55, 'barista': 33, 'filter': 28, 'roaster': 8}), s8)
            browser.close()
    finally:
        server.terminate()


if __name__ == '__main__':
    main()
