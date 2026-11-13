# ScreenMeasure

A ruler and protractor that sits on top of your screen. Measure UI, check angles, and pin guide
lines over your drawing app.

**Ctrl+Shift+M** opens and closes it from anywhere (tray icon too).

📖 **New here? Read the [User Guide](USER_GUIDE.md)**: step-by-step measuring, angles, the
Spacing tool, pinning guides while you draw, and troubleshooting.

## Using it

| Do this | To |
| --- | --- |
| Drag anywhere | Measure a length and angle (snaps to edges; the loupe shows the exact pixel) |
| Hold **Shift** | Lock to 15° steps |
| Hold **Alt** | Ignore edge snapping for a moment |
| Start a ruler on another ruler's end | Get the **angle** between them (protractor) |
| Click a ruler, then drag its ends | Adjust it (ends that touch move together) |
| Drag a ruler's line | Move it (Shift: straight) |
| Double-click a ruler / **E** | Extend it into an infinite guide line |
| Right-click a ruler / **Del** | Delete it |
| **2**, then hover | Spacing tool: size of the gap or element under the cursor, click to keep |
| **P** | Pin rulers on screen and keep drawing underneath (click-through) |
| **Ctrl+C** | Copy the measurement |
| **Ctrl+Z / Ctrl+Y** | Undo / redo (also brings back the last session's rulers) |
| **Esc** | Cancel, then deselect, then close |
| **?** | All shortcuts |

Angles are read like a protractor: 0° is horizontal, 90° is vertical, positive means rising to the right.

## Develop

    npm install
    npm run dev          # Electron with hot reload
    npm test
    npm run package:win
