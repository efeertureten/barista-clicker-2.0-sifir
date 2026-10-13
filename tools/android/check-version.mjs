// package.json (Android versionName/versionCode buradan gelir) ile oyunun içindeki APP_VERSION aynı mı?
// Etiketle derlemede etiketin (v2.5.0) de aynı olması gerekir. Uymazsa derleme durur.
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
const config = readFileSync(new URL('../../src/game/config.js', import.meta.url), 'utf8');
const app = config.match(/APP_VERSION = '([^']+)'/)?.[1];
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME?.replace(/^v/, '') : null;

const problems = [];
if (!/^\d+\.\d{1,2}\.\d{1,2}$/.test(pkg)) problems.push(`package.json sürümü x.y.z biçiminde olmalı (y, z ≤ 99): ${pkg}`);
if (app !== pkg) problems.push(`APP_VERSION (${app}) ile package.json (${pkg}) farklı`);
if (tag && tag !== pkg) problems.push(`etiket (v${tag}) ile package.json (${pkg}) farklı`);

if (problems.length) {
  problems.forEach((p) => console.error(`::error::${p}`));
  process.exit(1);
}
const [major, minor, patch] = pkg.split('.').map(Number);
console.log(`sürüm ${pkg} · versionCode ${major * 10000 + minor * 100 + patch}`);
