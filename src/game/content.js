// Oyunun metinleri ve görselleri. Sayılar config.js'ten gelir; build* fonksiyonları ikisini birleştirir,
// böylece Remote Config bir fiyatı ya da üretimi değiştirdiğinde arayüzdeki metin de kendiliğinden güncellenir.

import beansUpgradeImg from '../barista-assets/upgrade-beans.webp';
import machineUpgradeImg from '../barista-assets/upgrade-machine.webp';
import baristaUpgradeImg from '../barista-assets/upgrade-barista.webp';
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

const effectText = (balance) =>
  balance.perClick ? `+${balance.perClick} kahve / tık` : `+${balance.cps} kahve / sn`;

export function buildUpgrades(config) {
  return UPGRADE_CONTENT.map((content) => {
    const balance = config.upgrades[content.id];
    return { ...content, baseCost: balance.baseCost, effect: effectText(balance) };
  });
}

export function buildShops(config) {
  return config.shops.map((balance, i) => ({ ...SHOP_CONTENT[i], ...balance }));
}
