// Oyunun ses dosyaları. Her ses adı için bir ya da birkaç varyasyon; çalarken aralarından rastgele biri seçilir.
import popSfx from '../barista-sounds/pop.mp3';
import drip1 from '../barista-sounds/drip-1.mp3';
import drip2 from '../barista-sounds/drip-2.mp3';
import drip3 from '../barista-sounds/drip-3.mp3';
import drip4 from '../barista-sounds/drip-4.mp3';
import buyBeansSfx from '../barista-sounds/buy-beans.mp3';
import buyMachineSfx from '../barista-sounds/buy-machine.mp3';
import buyBaristaSfx from '../barista-sounds/buy-barista.mp3';
import doorBellSfx from '../barista-sounds/door-bell.mp3';
import levelUpSfx from '../barista-sounds/level-up.mp3';
import empireSfx from '../barista-sounds/empire.mp3';
import ting1 from '../barista-sounds/ting-1.mp3';
import ting2 from '../barista-sounds/ting-2.mp3';
import musicLoop from '../barista-sounds/music-loop.mp3';

export const SOUNDS = {
  pop: [popSfx], // fincana dokunma: baloncuk patlaması ve marimba (kaynak dosyanın ilk saniyesi)
  drip: [drip1, drip2, drip3, drip4], // kahve damlası: çevrimdışı toplama ve sipariş teslimi
  buyBeans: [buyBeansSfx],
  buyMachine: [buyMachineSfx],
  buyBarista: [buyBaristaSfx],
  bell: [doorBellSfx], // dükkan büyüdü
  levelUp: [levelUpSfx], // dükkan büyüdü: zilin ardından
  empire: [empireSfx], // son seviye: zilin ardından
  ting: [ting1, ting2], // bir yükseltme alınabilir hale geldi
};

// Arka plan müziği: ilk çalışta girişten başlar, sonra [loopStart, loopEnd) arası kesintisiz döner.
// Döngü noktaları (sn) dosyadaki kendini tekrar eden bölümden ölçüldü; dosya değişirse yeniden ölçülmeli.
export const MUSIC_TRACK = { src: musicLoop, loopStart: 36.3829, loopEnd: 146.5467 };

export const SOUND_PREF_KEY = 'barista-clicker-sound-v1';
export const MUSIC_PREF_KEY = 'barista-clicker-music-v1';
