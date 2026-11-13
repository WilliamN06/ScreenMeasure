import type { DisplayCapture, OpenPayload, ScreenMeasureAPI } from '../shared/ipc-types';

import { attachKeyboardHandlers } from './interaction/keyboard';
import { attachPointerHandlers } from './interaction/pointer';
import { makePixelSource, type PixelSource } from './lib/snapping';
import { createChrome } from './render/chrome';
import { createHud } from './render/hud';
import { createRenderContext, render } from './render/index';
import { clearAll, createInitialState, resetForOpen, undo, type AppState } from './state';

declare global {
  interface Window {
    api?: ScreenMeasureAPI;
    /** Only present when running outside Electron (browser preview / debugging). */
    __sm?: { loadRGBA(data: Uint8ClampedArray<ArrayBuffer>, width: number, height: number): void; state(): AppState };
  }
}

const api = window.api;
const isMac = api ? api.platform === 'darwin' : navigator.platform.toLowerCase().startsWith('mac');
const mod = isMac ? '⌘' : 'Ctrl';

const stage = document.getElementById('stage')!;
const ui = document.getElementById('ui')!;

let state: AppState = createInitialState(window.innerWidth, window.innerHeight);
let pixelSource: PixelSource | null = null;
let image: HTMLCanvasElement | null = null;

// ---- rendering (coalesced to one frame) ---------------------------------------------------
let frame = 0;
function setState(next: AppState): void {
  state = next;
  if (!frame) frame = requestAnimationFrame(flush);
}
function flush(): void {
  frame = 0;
  render(ctx, state, pixelSource, image);
}

// ---- actions --------------------------------------------------------------------------------
let toast: (msg: string) => void = () => undefined;
function closeOverlay(): void {
  document.documentElement.style.visibility = 'hidden'; // avoid flashing stale rulers on reopen
  if (api) api.close();
  else setState(resetForOpen(state, false));
}
function pin(): void {
  if (state.rulers.length === 0) return;
  if (api) api.pin();
  else setState({ ...state, pinned: true });
}

const chrome = createChrome(
  ui,
  {
    setTool: (tool) => setState({ ...state, tool, hover: null, spacing: null }),
    toggleSnap: () => setState({ ...state, snapEdges: !state.snapEdges }),
    toggleLoupe: () => setState({ ...state, loupeAlways: !state.loupeAlways }),
    toggleUnits: () => setState({ ...state, units: state.units === 'px' ? 'physical' : 'px' }),
    undo: () => setState(undo(state)),
    clear: () => {
      setState(clearAll(state));
      toast(`Cleared — ${mod}+Z to undo`);
    },
    pin,
    unpin: () => (api ? api.unpin() : setState({ ...state, pinned: false })),
    toggleHelp: () => setState({ ...state, helpOpen: !state.helpOpen }),
    close: closeOverlay,
    setInteractive: (on) => api?.setInteractive(on),
  },
  mod
);
toast = chrome.toast;

const hud = createHud(ui);
const ctx = createRenderContext(stage, hud, chrome);

const pointer = attachPointerHandlers(stage, {
  getState: () => state,
  setState,
  getPixelSource: () => pixelSource,
});

attachKeyboardHandlers({
  getState: () => state,
  setState,
  refreshPointer: (shift, alt) => pointer.refresh(shift, alt),
  cancelGesture: () => pointer.cancel(),
  close: closeOverlay,
  pin,
  copy: (text) => {
    if (api) api.copy(text);
    else void navigator.clipboard?.writeText(text).catch(() => undefined);
  },
  toast: (m) => toast(m),
});

// ---- screenshot -----------------------------------------------------------------------------
function loadRGBA(rgba: Uint8ClampedArray<ArrayBuffer>, width: number, height: number): void {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  c.getContext('2d')?.putImageData(new ImageData(rgba, width, height), 0, 0);
  image = c;
  const scale = Math.round((width / window.innerWidth) * 100) / 100;
  pixelSource = makePixelSource(rgba, width, height, scale);
  setState({ ...state, scale, hasCapture: true });
}

/** The OS hands us BGRA; canvas wants RGBA. */
function fromCapture(cap: DisplayCapture): void {
  const src = cap.bitmap;
  const rgba = new Uint8ClampedArray(cap.width * cap.height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = src[i + 2]!;
    rgba[i + 1] = src[i + 1]!;
    rgba[i + 2] = src[i]!;
    rgba[i + 3] = 255;
  }
  loadRGBA(rgba, cap.width, cap.height);
}

function onOpen(payload: OpenPayload): void {
  pixelSource = null;
  image = null;
  state = {
    ...resetForOpen(state, payload.keepRulers),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    hasCapture: false,
    scale: 1,
  };
  if (state.tool === 'spacing' && !payload.capture) state = { ...state, tool: 'ruler' };
  if (payload.capture) fromCapture(payload.capture);
  if (payload.captureError) toast('Screen capture unavailable — edge snapping and loupe are off');
  flush();
  document.documentElement.style.visibility = '';
}

api?.onOpen(onOpen);
api?.onMode(({ pinned }) => {
  setState({ ...state, pinned, gesture: null, hover: null, spacing: null, helpOpen: false });
  if (!pinned) api.setInteractive(true);
});

window.addEventListener('resize', () => {
  setState({ ...state, screenWidth: window.innerWidth, screenHeight: window.innerHeight });
  ensureSvgSize();
});
function ensureSvgSize(): void {
  ctx.svg.setAttribute('width', String(window.innerWidth));
  ctx.svg.setAttribute('height', String(window.innerHeight));
  ctx.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
}

if (!api) {
  document.body.classList.add('browser-preview');
  window.__sm = { loadRGBA, state: () => state };
}

flush();
