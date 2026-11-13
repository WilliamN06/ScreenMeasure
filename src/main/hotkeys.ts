import { globalShortcut } from 'electron';

export const TOGGLE_ACCELERATOR = process.platform === 'darwin' ? 'Command+Shift+M' : 'Control+Shift+M';

/**
 * Only ONE global shortcut. (The old build also grabbed Ctrl+Q system-wide, which silently
 * broke Ctrl+Q in every other app while ScreenMeasure was running.)
 */
export function registerHotkeys(onToggle: () => void): boolean {
  const ok = globalShortcut.register(TOGGLE_ACCELERATOR, onToggle);
  if (!ok) console.warn(`Could not register ${TOGGLE_ACCELERATOR}; another app owns it. Use the tray icon.`);
  return ok;
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}
