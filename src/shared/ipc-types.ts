/** Raw screenshot of one display, as BGRA bytes straight from the OS (no PNG round-trip). */
export interface DisplayCapture {
  width: number; // physical pixels
  height: number;
  bitmap: Uint8Array; // BGRA, width * height * 4
}

export interface OpenPayload {
  /** null when capture failed: the overlay still works, only edge-snapping/loupe/spacing are off. */
  capture: DisplayCapture | null;
  /** true when returning from pinned mode: keep the rulers the user left on screen. */
  keepRulers: boolean;
  captureError?: 'permission-denied' | 'capture-failed';
}

export interface ModePayload {
  pinned: boolean;
}

export const IPC = {
  OPEN: 'overlay:open',
  MODE: 'overlay:mode',
  CLOSE: 'overlay:close',
  PIN: 'overlay:pin',
  UNPIN: 'overlay:unpin',
  SET_INTERACTIVE: 'overlay:set-interactive',
  COPY: 'clipboard:write',
  QUIT: 'app:quit',
} as const;

export interface ScreenMeasureAPI {
  onOpen(cb: (payload: OpenPayload) => void): void;
  onMode(cb: (payload: ModePayload) => void): void;
  close(): void;
  pin(): void;
  unpin(): void;
  /** While pinned the window is click-through; turn hit-testing back on while the cursor is over our chip. */
  setInteractive(on: boolean): void;
  copy(text: string): void;
  quit(): void;
  platform: string;
}
