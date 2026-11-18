import { join } from 'path';

import { app, Menu, nativeImage, Tray, type MenuItemConstructorOptions } from 'electron';

import { checkForUpdates, installNow, updateStatus } from './updater';

let tray: Tray | null = null;
let toggleFn: () => void = () => {};
let acceleratorText = '';

// Launched by Windows at sign-in: stay quietly in the tray instead of covering the screen.
export const HIDDEN_ARG = '--hidden';

function updateItem(): MenuItemConstructorOptions {
  const s = updateStatus();
  if (!app.isPackaged) return { label: 'Updates: off in dev mode', enabled: false };
  switch (s.kind) {
    case 'ready':
      return { label: `Restart to update to ${s.version}`, click: installNow };
    case 'downloading':
      return { label: `Downloading ${s.version}…`, enabled: false };
    case 'checking':
      return { label: 'Checking for updates…', enabled: false };
    case 'error':
      return { label: 'Update check failed — retry', click: () => void checkForUpdates() };
    default:
      return { label: 'Check for updates', click: () => void checkForUpdates() };
  }
}

export function refreshTrayMenu(): void {
  if (!tray) return;
  const startsAtLogin = app.getLoginItemSettings({ args: [HIDDEN_ARG] }).openAtLogin;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Measure', accelerator: acceleratorText, click: toggleFn },
      { type: 'separator' },
      {
        label: 'Start with Windows',
        type: 'checkbox',
        checked: startsAtLogin,
        visible: process.platform === 'win32' || process.platform === 'darwin',
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked, args: [HIDDEN_ARG] });
          refreshTrayMenu();
        },
      },
      updateItem(),
      { label: `Version ${app.getVersion()}`, enabled: false },
      { type: 'separator' },
      { label: 'Quit ScreenMeasure', click: () => app.quit() },
    ])
  );
}

export function createTray(onToggle: () => void, accelerator: string): void {
  toggleFn = onToggle;
  acceleratorText = accelerator;
  // tray.png has a tray@2x.png sibling that Electron picks up on scaled displays.
  const icon = nativeImage.createFromPath(join(__dirname, '../../assets/tray.png'));
  tray = new Tray(icon);
  tray.setToolTip(`ScreenMeasure — ${accelerator.replace('Control', 'Ctrl')} to measure`);
  tray.on('click', onToggle);
  refreshTrayMenu();
}
