/**
 * `npm run dev:auto` — Next dev server + otomatik `git pull`.
 *
 * Her 30 saniyede bir `git pull --ff-only` dener; yeni commit geldiyse Next'in
 * hot reload'u değişen dosyaları kendiliğinden tazeler. Yerel değişiklik varsa
 * (ff mümkün değilse) pull sessizce atlanır — hiçbir şeyin üzerine yazmaz.
 */
import { spawn, execFile } from 'node:child_process';

const PULL_EVERY_MS = 30_000;

const dev = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
dev.on('exit', (code) => process.exit(code ?? 0));

let pulling = false;
setInterval(() => {
  if (pulling) return;
  pulling = true;
  execFile('git', ['pull', '--ff-only', '--quiet'], (err, stdout) => {
    pulling = false;
    if (err) return; // offline ya da yerel değişiklik — sorun değil, sonra tekrar dener
    const out = stdout.trim();
    if (out && !out.includes('Already up to date')) {
      console.log(`\n⬇️  [dev:auto] Yeni commit çekildi — sayfayı yenilemen yeterli.\n`);
    }
  });
}, PULL_EVERY_MS);
