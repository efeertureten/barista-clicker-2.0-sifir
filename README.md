# Barista Clicker 2.0

Kahve demle, sat, dükkânını seyyar tezgâhtan kahve imparatorluğuna büyüt. React ile yazılmış, tarayıcıda çalışan bir clicker oyunu.

**[Tarayıcıda oyna](https://efeertureten.github.io/barista-clicker-2.0-sifir/)**

<p>
  <img src="docs/screenshot-desktop.webp" alt="Masaüstü görünüm: solda dükkân kartı ve tıklanan latte, sağda market" width="74%">
  <img src="docs/screenshot-mobile.webp" alt="Telefon görünümü" width="23%">
</p>

## Nasıl oynanır

- Latteye tıkla, her tıklama kahve demler ve kasaya para koyar.
- Marketten yükseltme al: tık başına daha çok kahve ya da sen tıklamazken çalışan otomatik üretim.
- Toplam demlenen fincan sayısı arttıkça dükkânın büyür, büyüdükçe fincan başına satış fiyatı da artar.
- İlerleme tarayıcıda otomatik kaydedilir.

## Dükkân seviyeleri

| | Sv. | Dükkân | Açıldığı an (toplam fincan) | Fincan fiyatı |
|---|---|---|---|---|
| <img src="src/barista-assets/shop-1-tezgah-thumb.webp" width="64" alt=""> | 1 | Seyyar Tezgâh | başlangıç | ₺1,00 |
| <img src="src/barista-assets/shop-2-kose-kafe-thumb.webp" width="64" alt=""> | 2 | Köşe Kafe | 150 | ₺1,25 |
| <img src="src/barista-assets/shop-3-mahalle-thumb.webp" width="64" alt=""> | 3 | Mahalle Kahvecisi | 1.500 | ₺1,50 |
| <img src="src/barista-assets/shop-4-kavurma-thumb.webp" width="64" alt=""> | 4 | Kavurma Atölyesi | 15.000 | ₺2,00 |
| <img src="src/barista-assets/shop-5-zincir-thumb.webp" width="64" alt=""> | 5 | Kahve Zinciri | 150.000 | ₺3,00 |
| <img src="src/barista-assets/shop-6-imparatorluk-thumb.webp" width="64" alt=""> | 6 | Kahve İmparatorluğu | 2.000.000 | ₺5,00 |

## Yükseltmeler

Her alımda fiyat %15 artar.

| | Yükseltme | Etki | Başlangıç fiyatı |
|---|---|---|---|
| <img src="src/barista-assets/upgrade-beans.webp" width="48" alt=""> | Daha İyi Çekirdek | +1 kahve / tık | ₺15 |
| <img src="src/barista-assets/upgrade-machine.webp" width="48" alt=""> | Otomatik Espresso Makinesi | +1 kahve / sn | ₺60 |
| <img src="src/barista-assets/upgrade-barista.webp" width="48" alt=""> | Deneyimli Barista | +10 kahve / sn | ₺500 |

## 2.0'da neler yeni

- İkonların yerini kil görünümlü 3D görseller aldı: tıklanan latte, yükseltme ikonları ve her seviye için ayrı bir izometrik dükkân sahnesi.
- Dükkân kartının üstünde o anki dükkânın sahnesi duruyor; seviye atlayınca yumuşak geçişle değişiyor, sıradaki sahne önceden yükleniyor.
- Her tıklamada fincandan kahve çekirdekleri fırlıyor.
- "Dükkân büyüdü" bildiriminde yeni dükkânın küçük resmi var.
- Alınamayan yükseltmeler gri görünüyor, alınabilir hale gelince zıplıyor.
- Arka planda kahve çizimli bir doku var; geniş ekranda kart ile fincan yan yana diziliyor.
- Sesler: her tıklamada fincana kaşık ve kahve damlası, her yükseltmenin kendi satın alma sesi, dükkân büyüyünce kapı zili ve kutlama melodisi, son seviyede fanfar, bir yükseltme alınabilir hale gelince ince belli bardak "ting"i. Sesler alttaki düğmeyle kapatılabiliyor, tercih hatırlanıyor.
- Hareket azaltma (`prefers-reduced-motion`) açıkken animasyonlar kapanıyor.

## Yerelde çalıştırma

Node.js 18 veya üstü gerekir.

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/ klasörüne üretim derlemesi
npm run preview  # derlemeyi yerelde aç
```

`main` dalına her push'ta `.github/workflows/deploy.yml` siteyi derleyip GitHub Pages'a yayınlar.

## Proje yapısı

```
src/
  BaristaClicker.jsx     oyunun tamamı (durum, döngü, kayıt, ses motoru, arayüz)
  barista-assets/        oyun görselleri (WebP)
  barista-sounds/        oyun sesleri (MP3)
  main.jsx, index.css    giriş noktası ve Tailwind
public/                  favicon ve uygulama ikonları
docs/                    README ekran görüntüleri
```

Bileşen başka bir React projesine de taşınabilir: `BaristaClicker.jsx` ile `barista-assets/` ve `barista-sounds/` klasörlerini aynı yere koyman yeterli. Tailwind CSS 3 ve `lucide-react` gerekir.

## Görseller ve sesler

Bütün görseller ve sesler Google Gemini ile üretildi. Nesnelerin yeşil zeminleri temizlenip şeffaf yapıldı, dükkân sahneleri aynı ölçekte kırpıldı; böylece dükkân büyüdükçe sahne de büyüyor. Ses efektleri Gemini'nin ürettiği parçaların tekil vuruşlarından kesildi, seviyeleri birbirine göre dengelendi. Tarayıcılar ilk etkileşimden önce ses çalmaya izin vermediği için sesler ilk tıklamayla başlar.
