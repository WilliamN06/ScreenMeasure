import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

import { app, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';

// Installed builds update themselves from the GitHub Releases that CI publishes on every push to
// main (see .github/workflows/release.yml).
//
// A tray app is almost never quit on purpose (shutdown just kills it), so "install on quit" alone
// means updates never land. Instead, once an update has downloaded it installs itself as soon as
// the overlay is closed (immediately if it already is), then relaunches quietly in the tray.
// It never interrupts while you are measuring or have rulers pinned.

const CHECK_EVERY_MS = 60 * 60 * 1000;
/** Passed by the NSIS installer when it relaunches the app after an update. */
export const UPDATED_ARG = '--updated';

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'downloading'; version: string }
  | { kind: 'ready'; version: string }
  | { kind: 'error' };

let status: UpdateStatus = { kind: 'idle' };
let onChange: () => void = () => {};
let isIdle: () => boolean = () => false;

export function updateStatus(): UpdateStatus {
  return status;
}

function set(next: UpdateStatus): void {
  status = next;
  onChange();
}

function logFile(): string {
  const dir = join(app.getPath('userData'), 'logs');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'updater.log');
}

function log(level: string, ...args: unknown[]): void {
  const line = `${new Date().toISOString()} [${level}] ${args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')}\n`;
  try {
    appendFileSync(logFile(), line);
  } catch {
    /* logging must never break the app */
  }
}

export function initUpdater(opts: { changed: () => void; idle: () => boolean }): void {
  onChange = opts.changed;
  isIdle = opts.idle;
  if (!app.isPackaged) return; // `npm run dev` never updates itself

  autoUpdater.logger = {
    info: (...a: unknown[]) => log('info', ...a),
    warn: (...a: unknown[]) => log('warn', ...a),
    error: (...a: unknown[]) => log('error', ...a),
    debug: () => {},
  };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => set({ kind: 'checking' }));
  autoUpdater.on('update-not-available', () => set({ kind: 'idle' }));
  autoUpdater.on('update-available', (info) => set({ kind: 'downloading', version: info.version }));
  autoUpdater.on('update-downloaded', (info) => {
    set({ kind: 'ready', version: info.version });
    installWhenIdle();
  });
  autoUpdater.on('error', (err) => {
    log('error', err);
    set({ kind: 'error' });
  });

  log('info', `started ${app.getVersion()} args=${process.argv.slice(1).join(' ')}`);
  if (process.argv.includes(UPDATED_ARG) && Notification.isSupported()) {
    new Notification({ title: `ScreenMeasure updated to ${app.getVersion()}`, body: 'Ready in the tray — Ctrl+Shift+M to measure.' }).show();
  }

  void checkForUpdates();
  setInterval(() => void checkForUpdates(), CHECK_EVERY_MS);
}

/** Call when the overlay closes: applies a downloaded update if one is waiting. */
export function installWhenIdle(): void {
  if (status.kind !== 'ready' || !isIdle()) return;
  log('info', `installing ${status.version}`);
  // Give the overlay a moment to finish hiding, then reinstall silently and relaunch.
  setTimeout(() => {
    if (status.kind === 'ready' && isIdle()) installNow();
  }, 1500);
}

export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged || status.kind === 'downloading' || status.kind === 'ready') return;
  try {
    await autoUpdater.checkForUpdates();
  } catch {
    /* reported through the 'error' event */
  }
}

export function installNow(): void {
  // isSilent = true, forceRunAfter = true: reinstall quietly and reopen (with --updated).
  autoUpdater.quitAndInstall(true, true);
}
