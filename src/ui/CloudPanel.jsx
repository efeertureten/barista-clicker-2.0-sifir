import React, { useState } from 'react';
import { Check, Cloud, Copy, KeyRound, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';

import cloudImg from '../barista-assets/icon-cloud.webp';
import Modal, { primaryButton, secondaryButton } from './Modal.jsx';
import { fmtDuration, fmtMoney } from '../game/format.js';
import { formatCode, normalizeCode } from '../cloud/cloudSave.js';

const PLATFORM_NAMES = { android: 'Android uygulaması', web: 'tarayıcı', ios: 'iPhone' };

export const cloudErrorText = (e) => {
  if (!e) return '';
  if (e.status === 0) return 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.';
  if (e.status === 403 || e.code === 'PERMISSION_DENIED') return 'Bulut kaydı şu an kullanılamıyor. Birazdan tekrar dene.';
  return 'Bir şeyler ters gitti. Birazdan tekrar dene.';
};

const ago = (ms, now) => (!ms ? 'henüz yok' : now - ms < 60_000 ? 'az önce' : `${fmtDuration((now - ms) / 1000)} önce`);

// Bir kaydın kısa özeti: dükkân, şube, toplam kazanç; uzaktaki kayıtta cihaz ve zaman
function SaveSummary({ label, s, shopName, now, tone = 'plain' }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${tone === 'accent' ? 'border border-[var(--crema)] bg-[var(--crema-soft)]' : 'bg-[var(--foam)]'}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">
        Sv.{s.level} {shopName(s.level)}
        {s.branch > 1 ? ` · ${s.branch}. şube` : ''}
      </p>
      <p className="text-xs text-[var(--roast)]">
        {fmtMoney(s.earned)} toplam kazanç
        {s.savedAt ? ` · ${PLATFORM_NAMES[s.platform] || 'başka cihaz'}, ${ago(s.savedAt, now)}` : ''}
      </p>
    </div>
  );
}

const Busy = () => <LoaderCircle size={16} strokeWidth={2.4} className="animate-spin" aria-hidden="true" />;

// Bulut kaydı penceresi. mode: off (kapalı) | on (açık) | conflict (başka cihaz yazmış: hangisi kalsın?)
export default function CloudPanel({
  mode,
  code,
  pushedAt,
  local,
  remote,
  shopName,
  onEnable,
  onPushNow,
  onFind,
  onRestore,
  onDisable,
  onKeepLocal,
  onLoadRemote,
  onClose,
}) {
  const [view, setView] = useState('main'); // main | enter | found
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [found, setFound] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const now = Date.now();

  const run = async (name, fn) => {
    setBusy(name);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(cloudErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    const text = formatCode(code);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Eski WebView'larda pano API'si yok: gizli bir alanla kopyala
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(area);
      area.select();
      document.execCommand?.('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const find = () =>
    run('find', async () => {
      const normalized = normalizeCode(input);
      if (!normalized) {
        setError('Kod 12 karakter: harfler ve 2–9 arası rakamlar (ör. KHV7-PQ3M-…).');
        return;
      }
      const result = await onFind(normalized);
      if (!result) {
        setError('Bu kodla bir kayıt bulunamadı. Kodu kontrol et.');
        return;
      }
      setFound({ code: normalized, remote: result });
      setView('found');
    });

  const errorLine = error && (
    <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] leading-snug text-[#9a3412]">
      <TriangleAlert size={16} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
      {error}
    </p>
  );

  /* ---- Çakışma ---- */
  if (mode === 'conflict' && remote) {
    return (
      <Modal id="bc-cloud" art={cloudImg} eyebrow="Bulut kaydı" title="Hangi kayıt kalsın?">
        <p className="mt-1 text-sm leading-snug text-[var(--roast)]">
          Bu kayıt kodunla başka bir cihazda da oynanmış. İkisi birleşemez; birini seç, öteki silinir.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <SaveSummary label="Bulutta" s={remote} shopName={shopName} now={now} tone={remote.earned > local.earned ? 'accent' : 'plain'} />
          <SaveSummary label="Bu cihazda" s={local} shopName={shopName} now={now} tone={remote.earned > local.earned ? 'plain' : 'accent'} />
        </div>
        {errorLine}
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" disabled={Boolean(busy)} onClick={() => onLoadRemote(remote)} className={primaryButton}>
            Buluttakini yükle
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => run('keep', onKeepLocal)} className={secondaryButton}>
            {busy === 'keep' && <Busy />} Bu cihazdakini kullan
          </button>
        </div>
      </Modal>
    );
  }

  /* ---- Kodla başka cihazdaki kaydı bul ve yükle ---- */
  if (view === 'found' && found) {
    const losing = local.earned > 0;
    return (
      <Modal id="bc-cloud" art={cloudImg} eyebrow="Bulut kaydı" title="Kayıt bulundu" onClose={onClose}>
        <div className="mt-3 flex flex-col gap-2">
          <SaveSummary label={formatCode(found.code)} s={found.remote} shopName={shopName} now={now} tone="accent" />
          {losing && <SaveSummary label="Bu cihazdaki (yerine geçecek)" s={local} shopName={shopName} now={now} />}
        </div>
        {losing && (
          <p className="mt-3 text-[13px] leading-snug text-[var(--roast)]">
            Yüklersen bu cihazdaki ilerleme silinir ve oyun bu kayıttan devam eder.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" autoFocus onClick={() => onRestore(found.code, found.remote)} className={`${primaryButton} flex-1`}>
            Bu kaydı yükle
          </button>
          <button type="button" onClick={() => setView('enter')} className={secondaryButton}>
            Geri
          </button>
        </div>
      </Modal>
    );
  }

  if (view === 'enter') {
    return (
      <Modal id="bc-cloud" art={cloudImg} eyebrow="Bulut kaydı" title="Kayıt kodunu yaz" onClose={onClose}>
        <p className="mt-1 text-sm leading-snug text-[var(--roast)]">
          Öteki cihazda <strong>Bulut kaydı</strong> penceresindeki 12 karakterlik kod.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <label className="sr-only" htmlFor="bc-cloud-code">
            Kayıt kodu
          </label>
          <input
            id="bc-cloud-code"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            placeholder="XXXX-XXXX-XXXX"
            className="bc-mono w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.12em] outline-none focus:border-[var(--crema)] focus:ring-2 focus:ring-[var(--crema-soft)]"
          />
          {errorLine}
          <div className="flex gap-2">
            <button type="submit" disabled={Boolean(busy) || !input.trim()} className={`${primaryButton} flex-1`}>
              {busy === 'find' && <Busy />} Kaydı bul
            </button>
            <button type="button" onClick={() => setView('main')} className={secondaryButton}>
              Geri
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  /* ---- Açık ---- */
  if (mode === 'on') {
    return (
      <Modal id="bc-cloud" art={cloudImg} eyebrow="Bulut kaydı açık" title="Kayıt kodun" onClose={onClose}>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--foam)] py-2 pl-4 pr-2">
          <p className="bc-mono min-w-0 flex-1 text-xl font-semibold tracking-[0.1em]" aria-label="Kayıt kodu">
            {formatCode(code)}
          </p>
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-[var(--on-dark)] transition hover:bg-[var(--roast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
          >
            {copied ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : <Copy size={14} strokeWidth={2.2} aria-hidden="true" />}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
        </div>
        <p className="mt-3 text-sm leading-snug text-[var(--roast)]">
          Telefon değiştirirken, uygulamayı yeniden kurarken ya da tarayıcıdan uygulamaya geçerken orada{' '}
          <strong>Bulut kaydı → Kodum var</strong> deyip bu kodu yaz. Kodu kimseyle paylaşma: bilen kaydını açabilir.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span>Son yedek: {ago(pushedAt, now)}</span>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => run('push', onPushNow)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 font-semibold text-[var(--roast)] transition hover:border-[var(--roast)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crema)]"
          >
            {busy === 'push' ? <Busy /> : <RefreshCw size={13} strokeWidth={2.4} aria-hidden="true" />} Şimdi yedekle
          </button>
        </div>
        {errorLine}
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => (confirmOff ? run('off', onDisable) : setConfirmOff(true))}
            className={`text-xs font-semibold underline underline-offset-2 transition disabled:opacity-50 ${
              confirmOff ? 'text-[#9a3412]' : 'text-[var(--muted)] hover:text-[var(--roast)]'
            }`}
          >
            {confirmOff ? 'Emin misin? Buluttaki kopya silinir, tekrar bas' : 'Bulut kaydını kapat'}
          </button>
        </div>
      </Modal>
    );
  }

  /* ---- Kapalı ---- */
  return (
    <Modal id="bc-cloud" art={cloudImg} eyebrow="Bulut kaydı" title="İlerlemeni koru" onClose={onClose}>
      <p className="mt-1 text-sm leading-snug text-[var(--roast)]">
        İlerlemen şu an yalnızca bu cihazda. Bulut kaydını açarsan sana bir kayıt kodu verilir; telefon değiştirirken,
        uygulamayı yeniden kurarken ya da tarayıcıdan uygulamaya geçerken bu kodla kaldığın yerden devam edersin.
      </p>
      {errorLine}
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" autoFocus disabled={Boolean(busy)} onClick={() => run('enable', onEnable)} className={primaryButton}>
          {busy === 'enable' ? <Busy /> : <Cloud size={16} strokeWidth={2.2} aria-hidden="true" />} Bulut kaydını aç
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => {
            setError('');
            setView('enter');
          }}
          className={secondaryButton}
        >
          <KeyRound size={16} strokeWidth={2.2} aria-hidden="true" /> Kodum var
        </button>
      </div>
      <p className="mt-4 text-[11px] leading-snug text-[var(--muted)]">
        Kayıt, Google'ın Firebase sunucularında anonim olarak saklanır; ad ya da e-posta istenmez.{' '}
        <a href="./gizlilik.html" className="underline underline-offset-2">
          Ayrıntılar
        </a>
      </p>
    </Modal>
  );
}
