# Architecture

## Two-Process Split

Main (Node): overlay window lifecycle (`src/main/overlay.ts`), screen capture, the one global
hotkey, tray. Renderer (Chromium): state, interaction, rendering, pure engines.

The IPC contract lives in `src/shared/ipc-types.ts` and is imported by both processes.

## Overlay lifecycle

One transparent, always-on-top window per display, created once and then hidden or shown.

    hidden --hotkey--> edit --Esc--> hidden
                        |  ^
                      P |  | hotkey / pinned chip
                        v  |
                       pinned   (click-through; rulers stay visible)

Each time the overlay opens, every display is captured with a single `desktopCapturer` call and
the raw BGRA bitmap goes to that display's window. The screenshot is never shown. Only the
loupe, edge snapping and the Spacing tool read it. When un-pinning, the windows hide their
content first so the new capture doesn't include our own rulers.

## Renderer layering

- `lib/`: pure, DOM-free, unit-tested (geometry, snapping, joints/protractor, spacing scan,
  label layout, formatting).
- `state.ts`: immutable app state and reducers, including undo/redo history.
- `interaction/`: pointer and keyboard map events to state transitions. Hit-testing rule:
  handles only on the selected ruler; the end of any other ruler starts a joined ruler.
- `render/`: `scene` (SVG + labels), `hud` (loupe card), `chrome` (toolbar, hint, help,
  pinned chip). Renders are coalesced to one per animation frame.

`npm run dev` loads the renderer from the Vite dev server (`ELECTRON_RENDERER_URL`). Opening
`src/renderer` with plain Vite also works in a browser: it runs in "browser preview" mode and
exposes `window.__sm.loadRGBA()` to feed it a fake screenshot.
