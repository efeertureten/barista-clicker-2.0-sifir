// Oyunun metinleri ve görselleri. Sayılar config.js'ten gelir; build* fonksiyonları ikisini birleştirir,
// böylece Remote Config bir fiyatı ya da üretimi değiştirdiğinde arayüzdeki metin de kendiliğinden güncellenir.

import { Coffee, Flame, MapPinned, Sprout, Truck } from 'lucide-react';
import beansUpgradeImg from '../barista-assets/upgrade-beans.webp';
import machineUpgradeImg from '../barista-assets/upgrade-machine.webp';
import baristaUpgradeImg from '../barista-assets/upgrade-barista.webp';
import filterUpgradeImg from '../barista-assets/upgrade-filter.webp';
import roasterUpgradeImg from '../barista-assets/upgrade-roaster.webp';
import truckUpgradeImg from '../barista-assets/upgrade-truck.webp';
import dealersUpgradeImg from '../barista-assets/upgrade-dealers.webp';
import plantationUpgradeImg from '../barista-assets/upgrade-plantation.webp';
import kadikoyImg from '../barista-assets/district-kadikoy.webp';
import kadikoyNightImg from '../barista-assets/district-kadikoy-night.webp';
import balatImg from '../barista-assets/district-balat.webp';
import balatNightImg from '../barista-assets/district-balat-night.webp';
import besiktasImg from '../barista-assets/district-besiktas.webp';
import besiktasNightImg from '../barista-assets/district-besiktas-night.webp';
import modaImg from '../barista-assets/district-moda.webp';
import modaNightImg from '../barista-assets/district-moda-night.webp';
import shop1Img from '../barista-assets/shop-1-tezgah.webp';
import shop1Thumb from '../barista-assets/shop-1-tezgah-thumb.webp';
import shop2Img from '../barista-assets/shop-2-kose-kafe.webp';
import shop2Thumb from '../barista-assets/shop-2-kose-kafe-thumb.webp';
import shop3Img from '../barista-assets/shop-3-mahalle.webp';
import shop3Thumb from '../barista-assets/shop-3-mahalle-thumb.webp';
import shop4Img from '../barista-assets/shop-4-kavurma.webp';
import shop4Thumb from '../barista-assets/shop-4-kavurma-thumb.webp';
import shop5Img from '../barista-assets/shop-5-zincir.webp';
import shop5Thumb from '../barista-assets/shop-5-zincir-thumb.webp';
import shop6Img from '../barista-assets/shop-6-imparatorluk.webp';
import shop6Thumb from '../barista-assets/shop-6-imparatorluk-thumb.webp';

const UPGRADE_CONTENT = [
  {
    id: 'beans',
    name: 'Daha İyi Çekirdek',
    desc: 'Tek kökenli, taze kavrulmuş Arabica. Her tıklamada daha çok fincan.',
    image: beansUpgradeImg,
    sound: 'buyBeans',
  },
  {
    id: 'machine',
    name: 'Otomatik Espresso Makinesi',
    desc: '9 bar basınçla kendi kendine shot çeker. Sen dinlenirken üretir.',
    image: machineUpgradeImg,
    sound: 'buyMachine',
  },
  {
    id: 'barista',
    name: 'Deneyimli Barista',
    desc: 'Latte art ustası. İki gruplu makineyi aynı anda yönetir.',
    image: baristaUpgradeImg,
    sound: 'buyBarista',
    anchorBottom: true, // büst görseli kutunun alt kenarına oturur
  },
  // Ekonomi 2.1 üreticileri. icon: image null yapılırsa (yeni bir üreticinin görseli henüz yokken) gösterilen yedek
  {
    id: 'filter',
    name: 'Filtre Kahve İstasyonu',
    desc: 'Yavaş demleme, hızlı satış. Sabah kuyruğunu tek başına eritir.',
    image: filterUpgradeImg,
    icon: Coffee,
    sound: 'buyMachine',
  },
  {
    id: 'roaster',
    name: 'Kavurma Makinesi',
    desc: 'Çekirdeği artık kendin kavuruyorsun. Mahalle bu kokuyu tanır.',
    image: roasterUpgradeImg,
    icon: Flame,
    sound: 'buyMachine',
  },
  {
    id: 'truck',
    name: 'Kahve Kamyoneti',
    desc: 'İskelelere, kampüslere, festivallere. Kahve müşteriye gider.',
    image: truckUpgradeImg,
    icon: Truck,
    sound: 'buyBarista',
  },
  {
    id: 'dealers',
    name: 'Bayi Ağı',
    desc: 'Şehrin dört bir yanında senin tarifinle açılan dükkanlar.',
    image: dealersUpgradeImg,
    icon: MapPinned,
    sound: 'bell',
  },
  {
    id: 'plantation',
    name: 'Kahve Plantasyonu',
    desc: 'Çekirdek kendi tarlandan. Fidandan fincana her şey senin.',
    image: plantationUpgradeImg,
    icon: Sprout,
    sound: 'buyBeans',
  },
];

// tint: sahne görselinin zemin rengi; görsel yüklenirken ve geçişte boşluk görünmesin diye
const SHOP_CONTENT = [
  { name: 'Seyyar Tezgâh', image: shop1Img, thumb: shop1Thumb, tint: '#f0dcbe' },
  { name: 'Köşe Kafe', image: shop2Img, thumb: shop2Thumb, tint: '#efddc5' },
  { name: 'Mahalle Kahvecisi', image: shop3Img, thumb: shop3Thumb, tint: '#f0dfc6' },
  { name: 'Kavurma Atölyesi', image: shop4Img, thumb: shop4Thumb, tint: '#eeddc1' },
  { name: 'Kahve Zinciri', image: shop5Img, thumb: shop5Thumb, tint: '#f3e0c2' },
  { name: 'Kahve İmparatorluğu', image: shop6Img, thumb: shop6Thumb, tint: '#f1ddc0' },
];

// İçerik + denge sayıları (baseCost, cps ya da perClick, unlockLevel). Etki metni arayüzde,
// kilometre taşı çarpanıyla birlikte hesaplanır.
export function buildUpgrades(config) {
  return UPGRADE_CONTENT.map((content) => ({ ...content, ...config.upgrades[content.id] }));
}

export function buildShops(config) {
  return config.shops.map((balance, i) => ({ ...SHOP_CONTENT[i], ...balance }));
}

// Yeni şubelerin açıldığı semtler, sırayla. İlk dükkanın semti yok; 2. şube Kadıköy'de açılır.
export const DISTRICTS = ['Kadıköy', 'Balat', 'Beşiktaş', 'Moda', 'Cihangir', 'Üsküdar', 'Karaköy', 'Kuzguncuk', 'Arnavutköy', 'Bebek', 'Fener', 'Nişantaşı'];

// Yeni Şube penceresindeki semt sahneleri. 20:00–06:00 arası gece hali gösterilir; sahnesi olmayan semtte pencere
// sahnesiz açılır.
const DISTRICT_SCENES = {
  Kadıköy: { day: kadikoyImg, night: kadikoyNightImg },
  Balat: { day: balatImg, night: balatNightImg },
  Beşiktaş: { day: besiktasImg, night: besiktasNightImg },
  Moda: { day: modaImg, night: modaNightImg },
};

export function districtScene(district, date = new Date()) {
  const scene = DISTRICT_SCENES[district];
  if (!scene) return null;
  const hour = date.getHours();
  const night = hour >= 20 || hour < 6;
  return { image: night ? scene.night : scene.day, night };
}

// branch: şube numarası (1 = ilk dükkan). Liste bitince "N. şube" olarak devam eder.
export function districtOf(branch) {
  if (branch <= 1) return null;
  return DISTRICTS[branch - 2] ?? `${branch}. şube`;
}
