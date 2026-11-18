import { app, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';

// Installed builds update themselves from the GitHub Releases that CI publishes on every push to
// main (see .github/workflows/release.yml). Updates download in the background and install the
// next time the app quits, or right away via "Restart to update" in the tray.

const CHECK_EVERY_MS = 2 * 60 * 60 * 1000;

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'downloading'; version: string }
  | { kind: 'ready'; version: string }
  | { kind: 'error' };

let status: UpdateStatus = { kind: 'idle' };
let onChange: () => void = () => {};

export function updateStatus(): UpdateStatus {
  return status;
}

function set(next: UpdateStatus): void {
  status = next;
  onChange();
}

export function initUpdater(changed: () => void): void {
  onChange = changed;
  if (!app.isPackaged) return; // `npm run dev` never updates itself

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => set({ kind: 'checking' }));
  autoUpdater.on('update-not-available', () => set({ kind: 'idle' }));
  autoUpdater.on('update-available', (info) => set({ kind: 'downloading', version: info.version }));
  autoUpdater.on('update-downloaded', (info) => {
    set({ kind: 'ready', version: info.version });
    if (Notification.isSupported()) {
      const n = new Notification({
        title: `ScreenMeasure ${info.version} is ready`,
        body: 'Click to restart and update now, or it will update next time you quit.',
      });
      n.on('click', () => installNow());
      n.show();
    }
  });
  autoUpdater.on('error', (err) => {
    console.warn('[updater]', err?.message ?? err);
    set({ kind: 'error' });
  });

  void checkForUpdates();
  setInterval(() => void checkForUpdates(), CHECK_EVERY_MS);
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
  // isSilent = true, forceRunAfter = true: reinstall quietly and reopen.
  autoUpdater.quitAndInstall(true, true);
}
