import { app } from 'electron';

import { registerHotkeys, TOGGLE_ACCELERATOR, unregisterHotkeys } from './hotkeys';
import { destroyOverlays, enterEdit, registerOverlayIpc, toggle } from './overlay';
import { createTray } from './tray';

// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require('electron-squirrel-startup')) app.quit();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Launching the app again (e.g. from the Start menu) just opens the ruler.
  app.on('second-instance', () => void enterEdit());

  app.whenReady().then(() => {
    registerOverlayIpc();
    createTray(toggle, TOGGLE_ACCELERATOR);
    registerHotkeys(toggle);
    // Opening on launch makes the first run self-explanatory instead of "nothing happened".
    void enterEdit();
  });

  app.on('before-quit', () => destroyOverlays());
  app.on('will-quit', () => unregisterHotkeys());
  app.on('window-all-closed', () => {
    /* stay in tray */
  });
}
