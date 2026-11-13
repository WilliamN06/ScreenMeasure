import { desktopCapturer, dialog, type Display } from 'electron';

import type { DisplayCapture } from '../shared/ipc-types';

export interface CaptureAll {
  captures: Map<number, DisplayCapture>;
  error?: 'permission-denied' | 'capture-failed';
}

/**
 * Captures every display with ONE desktopCapturer call (the old code made one call per
 * display, each grabbing every screen) and hands back raw bitmaps instead of PNG data URLs.
 */
export async function captureDisplays(displays: Display[]): Promise<CaptureAll> {
  const captures = new Map<number, DisplayCapture>();
  try {
    const width = Math.max(...displays.map((d) => Math.round(d.size.width * d.scaleFactor)));
    const height = Math.max(...displays.map((d) => Math.round(d.size.height * d.scaleFactor)));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });

    displays.forEach((display, i) => {
      const source =
        sources.find((s) => s.display_id === String(display.id)) ??
        (sources.length === displays.length ? sources[i] : undefined);
      if (!source || source.thumbnail.isEmpty()) return;
      const size = source.thumbnail.getSize();
      const buf = source.thumbnail.toBitmap();
      captures.set(display.id, {
        width: size.width,
        height: size.height,
        bitmap: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      });
    });

    if (captures.size === 0) {
      if (process.platform === 'darwin') await showPermissionDialog();
      return { captures, error: 'permission-denied' };
    }
    return { captures };
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (message.includes('permission') || message.includes('denied')) {
      if (process.platform === 'darwin') await showPermissionDialog();
      return { captures, error: 'permission-denied' };
    }
    return { captures, error: 'capture-failed' };
  }
}

async function showPermissionDialog(): Promise<void> {
  await dialog.showMessageBox({
    type: 'warning',
    title: 'Screen Recording Permission Required',
    message: 'ScreenMeasure needs Screen Recording permission for edge snapping and the loupe.',
    detail:
      'Open System Settings → Privacy & Security → Screen Recording, enable ScreenMeasure, then relaunch the app. Rulers still work without it.',
    buttons: ['OK'],
  });
}
