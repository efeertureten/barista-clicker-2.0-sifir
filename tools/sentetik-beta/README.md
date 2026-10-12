# Sentetik beta

Gerçek oyuncu verisi gelmeden önce karar almak için: sentetik oyuncular oyunun **gerçek kodunu** (`src/game/economy.js`, `config.js`, `tutorial.js`) 14 gün boyunca oynar ve Firebase'e gidecek olayların aynısını üretir. Oyun mekaniği koddan gelir; oyuncu davranışı `sim.mjs` içindeki varsayımlardan.

## Çalıştırma

```bash
cd tools/sentetik-beta
node sim.mjs base 4000 runs                            # bugünkü sürüm, rehber %50/%50
node sim.mjs prestige+cap4+market+guideAll 4000 runs   # bayraklar birleşir
pip install pandas numpy
python3 analyze.py runs analysis                       # analysis/results.json
```

Senaryo bayrakları: `prestige` (oyuncular Yeni Şube'yi oyunun gerçek koduyla kullanır; itibarını en az ikiye katlayacak ya da en az 5 puan kazanacaksa açar), `guideAll` / `noGuide`, `cap4` / `cap8` (çevrimdışı depo), `grow200` (Köşe Kafe eşiği), `market` (telefonda market kısayolu). Aynı oyuncu numarası her senaryoda aynı kişidir (aynı tip, cihaz, takvim ve rastgele kararlar); senaryolar arasındaki fark yalnızca oyundan gelir.

`orders`: günlük siparişler (oyunun gerçek kodu); oyuncu tamamlananı teslim eder, bonusu alır, Altın Çekirdeği hızlı demlemeye harcar. `--orderw <0..1>` teslimin ilerleme anı olarak ağırlığı (1 = seviye atlama kadar), `--streakw <logit>` serinin kendisinin oyuncuyu geri çağırma etkisi (gün başına, en çok 7 gün; varsayılan 0). `--set yol=değer,…` denge değerlerini Remote Config'teki gibi değiştirir, örn. `--set orders.tapTarget=300,orders.rewardSeconds=300`.

Duyarlılık: `--urge 2` (kısa deponun oyuncuyu geri çağırma etkisini 2 katına çıkarır), `--caploss 0` (dolu depoda hissedilen kaybı kapatır), `--tag ad` (çıktı dosya adına ek).

## Davranış modeli

- **Oyuncu tipleri:** bir kez deneyip bırakan %55, gündelik %33, bağlı %12. Tıklama hızı, oturum sayısı ve süresi, satın alma sıklığı ve veri izni verme olasılığı tipe göre değişir.
- **Satın alma:** en iyi geri dönüşlü yükseltme (bağlı olmayanlar ara sıra en ucuzunu alır); tık odaklı oyuncular çekirdeği üreticiye tercih eder.
- **Market:** rehbersiz telefon oyuncusunun yarısı marketi ilk oturumda fark etmez (market sayfanın aşağısında); masaüstünde ~25 sn'de fark edilir.
- **Kopma:** ilk oturum sonunda "ilk izlenim" ve her günün son oturumunda "yarın gelir mi?" kararı. Olumlu etkenler: ilerleme anları (seviye, kilometre taşı, anlamlı çevrimdışı toplama), üretici sahibi olmak, rehberi bitirmek, alışkanlık (gün geçtikçe), Yeni Şube. Olumsuz: son ilerleme anından beri geçen aktif süre, uzun süre dolu bekleyen depo.
- **Ayar:** katsayılar, içeriği bitmeyen oyunun (`prestige`) türün tipik tutulmasını vermesi için ayarlandı: D1 %35,5, D3 %22,8, D7 %12,3, D14 %7,0.

Mutlak sayılar varsayımlara dayanır; kararlarda senaryolar arası farklar ve bunların varsayım değişikliklerine dayanıklılığı kullanılır. Gerçek veri geldiğinde katsayılar Firebase'deki ölçümlerle yeniden ayarlanmalıdır.
