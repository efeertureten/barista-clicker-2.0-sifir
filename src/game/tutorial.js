// İlk deneyim rehberi: yeni oyuncuyu ilk dakikada döngünün dört parçasından geçirir.
// Hangi adımda olunduğu kaydedilmez, oyunun durumundan çıkarılır; böylece sayfa yenilense de,
// oyuncu adımları farklı sırayla yapsa da rehber hep doğru yerden devam eder.

export const TUTORIAL_STEPS = ['brew', 'buy', 'producer', 'grow'];

// Sıradaki tamamlanmamış adım; hepsi bittiyse null
export function currentTutorialStep(state, economy) {
  if (state.clicks === 0) return 'brew';
  if (!Object.values(state.owned).some((n) => n > 0)) return 'buy';
  if (economy.cpsOf(state.owned) === 0) return 'producer';
  if (economy.levelOf(state) < 1) return 'grow';
  return null;
}

// Rehber grubu kurulumda bir kez belirlenir: guide (rehberi görür) · control (görmez, A/B karşılaştırması) ·
// none (rehberden önce oynamaya başlamış oyuncu, deneyin dışında)
export function assignTutorialVariant({ isNewPlayer, share, random = Math.random }) {
  if (!isNewPlayer) return 'none';
  return random() < share ? 'guide' : 'control';
}
