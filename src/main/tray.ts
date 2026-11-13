import { join } from 'path';

import { app, Menu, nativeImage, Tray } from 'electron';

let tray: Tray | null = null;

export function createTray(onToggle: () => void, accelerator: string): void {
  let icon = nativeImage.createFromPath(join(__dirname, '../../assets/icon.png'));
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTM0A1t6AAAAH0lEQVQ4T2P8//8/Ay0x0cQwgxQDhRxMNAw0DAQACskD8MHuowAAAABJRU5ErkJggg=='
    );
  }
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip(`ScreenMeasure — ${accelerator.replace('Control', 'Ctrl')} to measure`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Measure', accelerator, click: onToggle },
      { type: 'separator' },
      { label: 'Quit ScreenMeasure', click: () => app.quit() },
    ])
  );
  tray.on('click', onToggle);
}
