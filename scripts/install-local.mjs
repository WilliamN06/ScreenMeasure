// Installs the installer just built by `npm run package:win` (used by `npm run install-app`):
// closes a running ScreenMeasure, installs silently, then starts the installed app.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
  console.error('install-app is Windows-only; open the file in dist/ instead.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version, name } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const setup = join(root, 'dist', `ScreenMeasure-Setup-${version}.exe`);
if (!existsSync(setup)) {
  console.error(`Not found: ${setup}`);
  process.exit(1);
}

try {
  execFileSync('taskkill', ['/IM', 'ScreenMeasure.exe', '/F'], { stdio: 'ignore' });
} catch {
  /* not running */
}

console.log(`Installing ScreenMeasure ${version}…`);
execFileSync(setup, ['/S'], { stdio: 'inherit' });

const exe = join(process.env.LOCALAPPDATA ?? '', 'Programs', name, 'ScreenMeasure.exe');
if (existsSync(exe)) {
  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  console.log(`Installed and started: ${exe}`);
} else {
  console.log('Installed. Start it from the Start menu: ScreenMeasure.');
}
