import { join } from 'path';

import { app, BrowserWindow, clipboard, ipcMain, screen, type Display } from 'electron';

import { IPC, type ModePayload, type OpenPayload } from '../shared/ipc-types';

import { captureDisplays } from './capture';

/**
 * Overlay lifecycle.
 *   hidden ──hotkey──▶ edit ──Esc──▶ hidden
 *                       │  ▲
 *                     P │  │ hotkey / click "Edit" chip
 *                       ▼  │
 *                      pinned   (rulers stay on top, mouse goes through to your app)
 *
 * One transparent window per display, created once and re-used (hide/show), so opening is fast.
 */
type Mode = 'hidden' | 'edit' | 'pinned';

interface OverlayWindow {
  displayId: number;
  win: BrowserWindow;
  ready: Promise<void>;
}

let mode: Mode = 'hidden';
let busy = false;
const overlays = new Map<number, OverlayWindow>();

function createOverlay(display: Display): OverlayWindow {
  const win = new BrowserWindow({
    ...display.bounds,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver'); // above the taskbar
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const ready = new Promise<void>((resolve) => win.webContents.once('did-finish-load', () => resolve()));
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));

  return { displayId: display.id, win, ready };
}

/** Keep exactly one overlay per connected display (monitors can be plugged in between uses). */
async function syncOverlays(): Promise<Display[]> {
  const displays = screen.getAllDisplays();
  const ids = new Set(displays.map((d) => d.id));
  for (const [id, o] of overlays) {
    if (!ids.has(id)) {
      o.win.destroy();
      overlays.delete(id);
    }
  }
  for (const d of displays) {
    const existing = overlays.get(d.id);
    if (existing) existing.win.setBounds(d.bounds);
    else overlays.set(d.id, createOverlay(d));
  }
  await Promise.all([...overlays.values()].map((o) => o.ready));
  return displays;
}

/** Hide our own drawings so a fresh capture doesn't contain them (used when un-pinning). */
async function concealAll(): Promise<void> {
  const visible = [...overlays.values()].filter((o) => o.win.isVisible());
  if (visible.length === 0) return;
  await Promise.all(
    visible.map((o) =>
      o.win.webContents
        .executeJavaScript(
          `document.documentElement.style.visibility='hidden';` +
            `new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))`
        )
        .catch(() => undefined)
    )
  );
  await new Promise((r) => setTimeout(r, 60)); // let the compositor present the empty frame
}

function broadcastMode(): void {
  const payload: ModePayload = { pinned: mode === 'pinned' };
  for (const o of overlays.values()) o.win.webContents.send(IPC.MODE, payload);
}

export async function enterEdit(): Promise<void> {
  if (busy || mode === 'edit') return;
  busy = true;
  try {
    const fromPinned = mode === 'pinned';
    const displays = await syncOverlays();
    if (fromPinned) await concealAll();
    const { captures, error } = await captureDisplays(displays);

    mode = 'edit';
    for (const o of overlays.values()) {
      const payload: OpenPayload = { capture: captures.get(o.displayId) ?? null, keepRulers: fromPinned };
      if (error) payload.captureError = error;
      o.win.setIgnoreMouseEvents(false);
      o.win.webContents.send(IPC.OPEN, payload);
      o.win.show();
    }
    broadcastMode();
    const under = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    overlays.get(under.id)?.win.focus();
  } finally {
    busy = false;
  }
}

export function hideOverlay(): void {
  mode = 'hidden';
  for (const o of overlays.values()) o.win.hide();
}

export function pin(): void {
  if (mode !== 'edit') return;
  mode = 'pinned';
  for (const o of overlays.values()) {
    o.win.setIgnoreMouseEvents(true, { forward: true });
    o.win.blur();
  }
  broadcastMode();
}

/** Global hotkey / tray click. */
export function toggle(): void {
  if (mode === 'edit') hideOverlay();
  else void enterEdit();
}

export function registerOverlayIpc(): void {
  ipcMain.on(IPC.CLOSE, () => hideOverlay());
  ipcMain.on(IPC.PIN, () => pin());
  ipcMain.on(IPC.UNPIN, () => void enterEdit());
  ipcMain.on(IPC.SET_INTERACTIVE, (e, on: boolean) => {
    if (mode !== 'pinned') return;
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (on) win.setIgnoreMouseEvents(false);
    else win.setIgnoreMouseEvents(true, { forward: true });
  });
  ipcMain.on(IPC.COPY, (_e, text: string) => {
    if (typeof text === 'string') clipboard.writeText(text);
  });
  ipcMain.on(IPC.QUIT, () => app.quit());
}

export function destroyOverlays(): void {
  for (const o of overlays.values()) o.win.destroy();
  overlays.clear();
}
