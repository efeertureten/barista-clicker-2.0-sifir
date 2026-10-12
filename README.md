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

Her alımda fiyat %15 artar. Bütün bu değerler `src/game/config.js` dosyasında.

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
- Sesler: her tıklamada kahve damlası ve altında yumuşak bir kaşık sesi, her yükseltmenin kendi satın alma sesi, dükkân büyüyünce kapı zili ve kutlama melodisi, son seviyede fanfar, bir yükseltme alınabilir hale gelince ince belli bardak "ting"i.
- Arka plan müziği: ilk açılışta girişiyle başlar, sonra kesintisiz döngüye girer; dükkân büyürken kutlama duyulsun diye kısılır, sekme arka plandayken durur.
- Alttaki **Ses** ve **Müzik** düğmeleriyle ikisi ayrı ayrı kapatılabiliyor, tercih hatırlanıyor.
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
  BaristaClicker.jsx     arayüz ve oyun döngüsü; aşağıdaki modülleri birbirine bağlar
  game/
    config.js            ayarlanabilir bütün denge değerleri (fiyatlar, artış oranı, dükkân eşikleri)
    content.js           yükseltme ve dükkân adları, açıklamaları, görselleri
    economy.js           saf oyun mantığı: tık, üretim, satın alma, seviye hesabı
    save.js              oyun kaydını okuma, doğrulama ve yazma
    meta.js              kurulum tarihi, oturum sayısı, oyun süresi, ilk deneyim adımları
    format.js            sayı ve para biçimleri
  audio/
    soundEngine.js       Web Audio ses motoru (efekt ve müzik kanalları, müzik kısma)
    sounds.js            ses dosyalarının listesi ve müzik döngü noktaları
  analytics/
    analytics.js         ölçüm katmanı: izin, olay sırası, Firebase ve hata ayıklama çıkışı
    firebaseConfig.js    Firebase yapılandırması (boşken hiçbir yere veri gitmez)
  ui/                    stiller, ses düğmesi, veri izni bandı
  lib/                   localStorage ve dosya yolu yardımcıları
  barista-assets/        oyun görselleri (WebP)
  barista-sounds/        oyun sesleri (MP3)
  main.jsx, index.css    giriş noktası ve Tailwind
public/                  favicon ve uygulama ikonları
docs/                    README ekran görüntüleri
```

Oyun dengesini değiştirmek için yalnızca `src/game/config.js` dosyasına dokunmak yeter; `BaristaClicker` bileşeni farklı bir yapılandırmayı `config` özelliğiyle de alabilir. Bu, ileride değerleri Firebase Remote Config'ten çekip A/B testi yapmanın temeli.

## Ölçüm

Oyun, hangi oyuncuların geri döndüğünü ve nerede takıldığını görmek için oynanış olaylarını Firebase Analytics'e gönderebilir. Varsayılan olarak kapalıdır.

- `src/analytics/firebaseConfig.js` boşken hiçbir yere veri gitmez, veri izni de sorulmaz.
- Yapılandırma girildiğinde oyuncuya ilk tıklamadan sonra köşede bir izin bandı çıkar. "Kabul et" demeden hiçbir olay gönderilmez; o ana kadar biriken olaylar kabul edilirse gönderilir, reddedilirse silinir. Karar, alttaki "Veri izni" bağlantısından her zaman değiştirilebilir.
- Firebase kütüphanesi ayrı bir parça olarak yalnızca izin verildiğinde indirilir; izin vermeyen oyuncunun yükleme süresi değişmez.
- Ad, e-posta gibi kişisel bilgi toplanmaz.

**Firebase'i bağlamak:** [Firebase konsolunda](https://console.firebase.google.com/) bir proje aç, Google Analytics'i etkinleştir, projeye bir web uygulaması ekle ve verilen `firebaseConfig` nesnesini `src/analytics/firebaseConfig.js` dosyasına yapıştır. Bu değerler gizli değildir, her ziyaretçinin tarayıcısına zaten gönderilir.

**Hata ayıklama:** adrese `?debug=1` eklenince olaylar Firebase olmadan da tarayıcı konsoluna `[ölçüm]` önekiyle yazılır ve `window.__bcAnalytics` listesinde birikir. `?debug=0` kapatır.

| Olay | Ne zaman | Başlıca bilgiler |
|---|---|---|
| `session_begin` | oyun açıldığında ya da 30 dakikadan uzun aradan sonra sekmeye dönüldüğünde | oturum numarası, kurulumdan beri geçen gün, kaç dakika uzak kalındığı, dükkân seviyesi |
| `ftue_step` | ilk deneyim adımları, her biri bir kez: `first_brew`, `first_purchase`, `first_level_up` | adım adı ve sırası |
| `level_up` | dükkân büyüdüğünde | yeni seviye ve adı, toplam aktif oyun dakikası |
| `spend_virtual_currency` | yükseltme alındığında | yükseltme, ödenen tutar, alımdan sonraki adet, dükkân seviyesi |
| `settings_change` | ses ya da müzik açılıp kapatıldığında | ayar ve yeni değeri |
| `game_reset` | oyun sıfırlandığında | sıfırlamadan önceki seviye, fincan ve tık sayısı |
| `app_error` | yakalanmamış bir hata olduğunda | hata türü ve kısa mesajı |

Oyuncu özellikleri: `install_cohort` (kurulum günü), `app_version`, `max_shop_level`, `sound`, `music`. Kurulum tarihi ve oturum bilgisi oyun kaydından ayrı tutulur; "Oyunu sıfırla" bunları silmez, böylece geri dönüş oranları bozulmaz. Ölçüm eklenmeden önce oynamaya başlamış oyuncular `legacy_player` olarak işaretlenir, çünkü gerçek kurulum tarihleri bilinmez.

## Görseller ve sesler

Bütün görseller ve sesler Google Gemini ile üretildi. Nesnelerin yeşil zeminleri temizlenip şeffaf yapıldı, dükkân sahneleri aynı ölçekte kırpıldı; böylece dükkân büyüdükçe sahne de büyüyor. Ses efektleri Gemini'nin ürettiği parçaların tekil vuruşlarından kesildi, seviyeleri birbirine göre dengelendi. Müzik döngüsü, parçanın kendini tekrar eden iki bölümü arasından kuruldu ve dikiş noktası yumuşak geçişle birleştirildi; döngü noktaları `src/audio/sounds.js` içindeki `MUSIC_TRACK` sabitinde. Tarayıcılar ilk etkileşimden önce ses çalmaya izin vermediği için sesler ilk tıklamayla başlar; müzik dosyası da sayfa açılışını yavaşlatmasın diye ancak o zaman indirilir.
