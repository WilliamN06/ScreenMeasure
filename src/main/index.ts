import { app } from 'electron';

import { registerHotkeys, TOGGLE_ACCELERATOR, unregisterHotkeys } from './hotkeys';
import { destroyOverlays, enterEdit, overlayIdle, registerOverlayIpc, setOnOverlayHidden, toggle } from './overlay';
import { createTray, HIDDEN_ARG, refreshTrayMenu } from './tray';
import { initUpdater, installWhenIdle, UPDATED_ARG } from './updater';

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Windows uses this for notifications and taskbar grouping; must match electron-builder's appId.
  app.setAppUserModelId('com.screenmeasure.app');

  // Launching the app again (e.g. from the Start menu) just opens the ruler.
  app.on('second-instance', () => void enterEdit());

  app.whenReady().then(() => {
    registerOverlayIpc();
    createTray(toggle, TOGGLE_ACCELERATOR);
    registerHotkeys(toggle);
    initUpdater({ changed: refreshTrayMenu, idle: overlayIdle });
    setOnOverlayHidden(installWhenIdle);
    // Opening on launch makes the first run self-explanatory instead of "nothing happened",
    // except when Windows starts us at sign-in or the updater relaunches us.
    const quiet = process.argv.includes(HIDDEN_ARG) || process.argv.includes(UPDATED_ARG);
    if (!quiet) void enterEdit();
  });

  app.on('before-quit', () => destroyOverlays());
  app.on('will-quit', () => unregisterHotkeys());
  app.on('window-all-closed', () => {
    /* stay in tray */
  });
}
