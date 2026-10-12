"""Sentetik beta analizi. Olay verisi Firebase'e gidecek biçimde; "gözlenen" = yalnızca veri iznini verenler.
Çıktı: results.json (belgeye ve panoya gidecek sayılar) ve konsola özet."""
import gzip
import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

RUNS = Path(sys.argv[1])
OUT = Path(sys.argv[2])
SCENARIOS = ['base', 'prestige', 'guideAll', 'noGuide', 'cap4', 'cap8', 'grow200', 'base+market', 'noGuide+market', 'prestige+cap4+market+guideAll']
rng = np.random.default_rng(7)


def load_players(sc):
    p = pd.DataFrame(json.load(open(RUNS / f'players-{sc}.json')))
    p['daylist'] = p['days'].str.split(' ').apply(lambda d: set(map(int, d)))
    return p


def load_events(sc):
    with gzip.open(RUNS / f'events-{sc}.jsonl.gz', 'rt') as f:
        return pd.DataFrame(json.loads(line) for line in f)


def retention(players, days=range(0, 15)):
    return {d: float(players['daylist'].apply(lambda s: d in s).mean()) for d in days}


def prop_ci(k, n, z=1.96):
    if n == 0:
        return (math.nan, math.nan, math.nan)
    p = k / n
    h = z * math.sqrt(p * (1 - p) / n)
    return (p, p - h, p + h)


res = {'scenarios': {}}
players = {sc: load_players(sc) for sc in SCENARIOS}

# ---------- 1. Tutulma: doğru değer ve gözlenen (izin verenler) ----------
for sc, p in players.items():
    obs = p[p.consent == 1]
    res['scenarios'][sc] = {
        'true': {str(k): v for k, v in retention(p).items()},
        'observed': {str(k): v for k, v in retention(obs).items()},
        'n': len(p),
        'n_observed': len(obs),
        'sessions_per_dau': None,
    }
base = players['base']
print('İzin oranı:', round(base.consent.mean(), 3), ' tipe göre:', base.groupby('archetype').consent.mean().round(2).to_dict())
for sc in SCENARIOS:
    t, o = res['scenarios'][sc]['true'], res['scenarios'][sc]['observed']
    print(f"{sc:9s} doğru D1 {t['1']:.3f} D3 {t['3']:.3f} D7 {t['7']:.3f} D14 {t['14']:.3f} | gözlenen D1 {o['1']:.3f} D7 {o['7']:.3f} D14 {o['14']:.3f}")

# ---------- 2. Rehber A/B (base, gözlenen) ----------
obs = base[base.consent == 1]
ab = {}
for v in ['guide', 'control']:
    g = obs[obs.variant == v]
    for d in (1, 7):
        k = int(g.daylist.apply(lambda s: d in s).sum())
        ab[f'{v}_D{d}'] = prop_ci(k, len(g))
    ab[f'{v}_n'] = len(g)
res['ab'] = ab
print('\nRehber A/B (gözlenen):', {k: (tuple(round(x, 3) for x in v) if isinstance(v, tuple) else v) for k, v in ab.items()})


def two_prop_p(k1, n1, k2, n2):
    p = (k1 + k2) / (n1 + n2)
    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    z = (k1 / n1 - k2 / n2) / se
    return z, math.erfc(abs(z) / math.sqrt(2))


g, c = obs[obs.variant == 'guide'], obs[obs.variant == 'control']
kg, kc = int(g.daylist.apply(lambda s: 1 in s).sum()), int(c.daylist.apply(lambda s: 1 in s).sum())
z, pval = two_prop_p(kg, len(g), kc, len(c))
res['ab_test'] = {'z': z, 'p': pval, 'lift_pts': kg / len(g) - kc / len(c)}
print(f'  D1 farkı {100 * (kg / len(g) - kc / len(c)):.1f} puan, z={z:.2f}, p={pval:.4f}')

# Gereken örneklem (D1 %p0 → %p1, %95 güven, %80 güç)
def n_per_arm(p0, p1, za=1.96, zb=0.84):
    pbar = (p0 + p1) / 2
    return math.ceil((za * math.sqrt(2 * pbar * (1 - pbar)) + zb * math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (p1 - p0) ** 2)


p0, p1 = kc / len(c), kg / len(g)
res['power'] = {'p0': p0, 'p1': p1, 'n_per_arm_observed': n_per_arm(p0, p1),
                'installs_per_arm': math.ceil(n_per_arm(p0, p1) / base.consent.mean())}
print('  bu farkı yakalamak için kol başına gözlenen oyuncu:', res['power']['n_per_arm_observed'],
      '→ izin oranıyla kurulum:', res['power']['installs_per_arm'])

# ---------- 3. 40 kişilik beta: ne kadar güvenilir? ----------
draws = []
for _ in range(2000):
    s = base.sample(40, random_state=int(rng.integers(1e9)))
    so = s[s.consent == 1]
    if len(so) == 0:
        continue
    d1 = so.daylist.apply(lambda x: 1 in x).mean()
    gg, cc = so[so.variant == 'guide'], so[so.variant == 'control']
    diff = (gg.daylist.apply(lambda x: 1 in x).mean() - cc.daylist.apply(lambda x: 1 in x).mean()) if len(gg) and len(cc) else np.nan
    draws.append((len(so), d1, diff))
draws = np.array(draws, dtype=float)
res['beta40'] = {
    'observed_n_median': float(np.median(draws[:, 0])),
    'd1_p5': float(np.nanpercentile(draws[:, 1], 5)),
    'd1_p95': float(np.nanpercentile(draws[:, 1], 95)),
    'diff_p5': float(np.nanpercentile(draws[:, 2], 5)),
    'diff_p95': float(np.nanpercentile(draws[:, 2], 95)),
    'diff_wrong_sign': float(np.nanmean(draws[:, 2] <= 0)),
}
print('\n40 kişilik beta (2.000 tekrar):', {k: round(v, 3) for k, v in res['beta40'].items()})

# ---------- 4. Olaylardan: huni, rehber süresi, seviye ilerlemesi, çevrimdışı ----------
ev = load_events('base')
ev = ev[ev.user.isin(obs.user)]  # gözlenen
ev['p'] = ev['params']
inst = obs.set_index('user')

funnel = {}
first = ev[ev.event == 'first_open'].groupby('user').ts.min()
for v in ['guide', 'control']:
    users = obs[obs.variant == v].user
    row = {'installs': len(users)}
    for step in ['first_brew', 'first_purchase', 'first_producer', 'first_level_up']:
        u = ev[(ev.event == 'ftue_step') & ev.p.apply(lambda x: x.get('step') == step) & ev.user.isin(users)]
        s1 = u.merge(ev[ev.event == 'session_begin'][['user', 'ts']].groupby('user').ts.min().rename('t0'), on='user')
        row[step] = len(u)
    # ilk oturum sonunda üreticisi olanlar: ilk oturum içinde first_producer
    sess = ev[(ev.event == 'session_begin') & ev.user.isin(users)].sort_values('ts')
    second = sess.groupby('user').ts.apply(lambda s: s.iloc[1] if len(s) > 1 else np.inf)
    fp = ev[(ev.event == 'ftue_step') & ev.p.apply(lambda x: x.get('step') == 'first_producer') & ev.user.isin(users)].set_index('user').ts
    row['producer_in_first_session'] = int(sum(1 for u_, t in fp.items() if t < second.get(u_, np.inf)))
    funnel[v] = row
res['funnel'] = funnel
print('\nHuni (gözlenen):', funnel)

# rehberli ve rehbersiz oyuncuda üreticisi olmadan biten ilk oturum: cihaza göre
prod = {}
for v in ['guide', 'control']:
    for dev in ['mobile', 'desktop']:
        users = obs[(obs.variant == v) & (obs.device == dev)].user
        fp = ev[(ev.event == 'ftue_step') & ev.p.apply(lambda x: x.get('step') == 'first_producer') & ev.user.isin(users)]
        sess = ev[(ev.event == 'session_begin') & ev.user.isin(users)].sort_values('ts')
        second = sess.groupby('user').ts.apply(lambda s: s.iloc[1] if len(s) > 1 else np.inf)
        ok = sum(1 for _, r in fp.iterrows() if r.ts < second.get(r.user, np.inf))
        prod[f'{v}_{dev}'] = ok / max(len(users), 1)
res['producer_session1'] = prod
print('İlk oturumda üretici alanların payı:', {k: round(v, 3) for k, v in prod.items()})

tc = ev[ev.event == 'tutorial_complete'].copy()
tc['seconds'] = tc.p.apply(lambda x: x['seconds'])
tc['session'] = tc.p.apply(lambda x: x['session_number'])
guide_users = obs[obs.variant == 'guide']
res['tutorial'] = {
    'begin': len(guide_users),
    'complete': len(tc),
    'complete_rate': len(tc) / len(guide_users),
    'complete_in_session1': float((tc.session == 1).mean()),
    'seconds_p25': float(tc[tc.session == 1].seconds.quantile(0.25)),
    'seconds_median': float(tc[tc.session == 1].seconds.median()),
    'seconds_p75': float(tc[tc.session == 1].seconds.quantile(0.75)),
    'seconds_p90': float(tc[tc.session == 1].seconds.quantile(0.9)),
    'skip_rate': float(len(ev[ev.event == 'tutorial_skip']) / len(guide_users)),
}
print('Rehber:', {k: round(v, 3) for k, v in res['tutorial'].items()})
# rehber süresi histogramı (ilk oturumda bitirenler, 15 sn kova)
h = tc[tc.session == 1].seconds.clip(upper=240)
res['tutorial_hist'] = {int(k): int(v) for k, v in (h // 15 * 15).value_counts().sort_index().items()}

# seviyeye ulaşma günü (gözlenen; ulaşan oyuncular arasında medyan) ve ulaşan payı
lv = ev[ev.event == 'level_up'].copy()
lv['level'] = lv.p.apply(lambda x: x['level'])
reach = {}
for L in range(2, 7):
    u = lv[lv.level == L].groupby('user').day.min()
    reach[str(L)] = {'share': len(u) / len(obs), 'median_day': float(u.median()) if len(u) else None,
                'engaged_median_day': float(u[u.index.isin(obs[obs.archetype == 'engaged'].user)].median()) if len(u) else None}
res['level_reach'] = reach
print('Seviyeye ulaşma:', {k: {kk: (round(vv, 3) if isinstance(vv, float) else vv) for kk, vv in v.items()} for k, v in reach.items()})

# son dükkanda (Sv.6) olup bu oturumda hiç ilerlemesi olmayan aktif oyuncu payı, güne göre (doğru veri, kopma tanısı)
churned = base[base.churned == 1]
late = churned[churned.churn_day >= 3]
res['late_churn'] = {
    'n': len(late),
    'at_max_level': float((late.churn_level == 6).mean()),
    'endgame_flag': float(late.churn_endgame.mean()),
    'by_level': {int(k): int(v) for k, v in late.churn_level.value_counts().sort_index().items()},
}
res['churn_level_by_day'] = {
    str(b): {int(k): round(float(v), 3) for k, v in grp.churn_level.value_counts(normalize=True).sort_index().items()}
    for b, grp in churned.groupby(pd.cut(churned.churn_day, [-1, 0, 2, 6, 14], labels=['0', '1-2', '3-6', '7-14']), observed=False)
}
print('3. günden sonra kopanlar:', res['late_churn'])

# çevrimdışı dönüşler
oc = ev[ev.event == 'offline_collect'].copy()
oc['away'] = oc.p.apply(lambda x: x['away_minutes'])
oc['capped'] = oc.p.apply(lambda x: x['capped'])
res['offline'] = {
    'collects': len(oc),
    'capped_share': float(oc.capped.mean()),
    'away_median_min': float(oc.away.median()),
    'away_buckets': {str(k): round(float(v), 3) for k, v in pd.cut(oc.away, [0, 30, 60, 120, 240, 480, 1e9], labels=['<30 dk', '30-60 dk', '1-2 sa', '2-4 sa', '4-8 sa', '8 sa+']).value_counts(normalize=True).sort_index().items()},
}
# depo senaryolarında doluluk ve kaybedilen üretim
for sc, cap in [('base', 2), ('cap4', 4), ('cap8', 8)]:
    e = load_events(sc)
    e = e[e.event == 'offline_collect']
    away = e.params.apply(lambda x: x['away_minutes'])
    stored = e.params.apply(lambda x: x['stored_minutes'])
    res['offline'][f'cap{cap}_capped_share'] = float(e.params.apply(lambda x: x['capped']).mean())
    res['offline'][f'cap{cap}_stored_share_of_away'] = float((stored.sum()) / max(away.sum(), 1))
print('Çevrimdışı:', res['offline'])

# oturum ve süre (gözlenen, base)
sess = ev[ev.event == 'session_begin']
dau = sess.groupby(['user', 'day']).size()
res['engagement'] = {'sessions_per_dau': float(dau.mean())}
print('Günlük aktif oyuncu başına oturum:', round(dau.mean(), 2))

OUT.mkdir(parents=True, exist_ok=True)
json.dump(res, open(OUT / 'results.json', 'w'), ensure_ascii=False, indent=1, default=float)
print('\nyazıldı:', OUT / 'results.json')
