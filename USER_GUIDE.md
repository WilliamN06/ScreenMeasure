# ScreenMeasure: User Guide

ScreenMeasure is a see-through ruler and protractor that sits on top of everything on your
screen. Use it to measure distances and angles in any app, check UI spacing, or pin guide lines
over a drawing canvas while you work.

---

## 1. Opening and closing

| | |
| --- | --- |
| **Open** | Press **Ctrl+Shift+M** from anywhere, or click the ScreenMeasure icon in the system tray. It also opens when you first start the app. |
| **Close** | Press **Esc** (or the **✕** on the toolbar). If you're in the middle of something, Esc first cancels it, then deselects, then closes. |
| **Quit** | Right-click the tray icon, then **Quit ScreenMeasure**. |

When the overlay is open you'll see a **thin teal border** around the screen and a **toolbar at
the bottom**. Your screen stays exactly as it was, and the overlay just sits on top. While it's open,
your clicks go to ScreenMeasure, not the app underneath.

> Closed by accident? Reopen and press **Ctrl+Z**. Your last rulers come back.

---

## 2. Measuring a distance

1. **Press and drag** from one point to another.
2. While you drag, a **loupe** follows the cursor. It shows the exact pixel you're on,
   magnified, plus live numbers:
   - `248.3 px · 32.5°`: length and angle
   - `Δx 210  Δy 132`: horizontal and vertical distance
   - `x 1024  y 540  #1E1E2E`: position and the colour under the point
3. **Release.** The ruler stays, with its label beside it and tick marks every 10 px (longer
   ones every 50 and 100).

**Snapping** helps you land precisely:
- The end **snaps to edges and corners** of whatever is on screen. A small square appears
  and the loupe says *"snapped to edge"*. Hold **Alt** to stop it snapping for a moment, or
  press **G** to turn snapping off.
- Hold **Shift** to lock the angle to **15° steps** (0°, 15°, 30°, 45°, 90°…). A dotted guide
  shows the locked direction.
- A click without dragging does nothing, so stray clicks don't create rulers.

### How angles are shown
A ruler's angle reads like a protractor held level:

| Reading | Meaning |
| --- | --- |
| `0°` | perfectly horizontal |
| `90°` | perfectly vertical |
| `+30°` | rising to the right |
| `−30°` | falling to the right |

The direction you dragged doesn't matter. A line has the same angle either way.

---

## 3. Measuring an angle (protractor)

1. Draw the first ruler along one edge.
2. **Start the second ruler on the end of the first one.** Hovering that end shows a dashed
   ring, which means a new ruler will join here.
3. Drag along the second edge. The **angle between them** appears as an arc with a label, e.g. `66.6°`.

You can join three or more rulers at one point. Each neighbouring pair gets its own angle.

---

## 4. Adjusting rulers

| Do this | Result |
| --- | --- |
| **Click** a ruler | Selects it: round handles appear on its ends |
| **Drag a handle** | Moves that end. Rulers joined at that point move with it, so the angle stays connected. **Shift** locks to 15° |
| **Drag the line** | Moves the whole ruler. **Shift** keeps it straight horizontally or vertically |
| **Arrow keys** | Nudge the selected ruler 1 px (**Shift**: 10 px) |
| **Double-click** or **E** | Extends the ruler into an **infinite guide line** across the screen (again to undo) |
| **Right-click** or **Delete** | Deletes the ruler |
| **Ctrl+C** | Copies the measurement, e.g. `248.3 px · 32.5°` (the selected ruler, or the latest one) |
| **Ctrl+Z / Ctrl+Y** | Undo / redo anything |
| Toolbar trash icon | Clears all rulers (undoable) |

---

## 5. Measuring UI: the Spacing tool

The quickest way to get the size of a button, a margin or the gap between two elements.

1. Press **2** (or click **Spacing** on the toolbar).
2. **Hover** over something. Yellow lines stretch out to the nearest change of colour in each
   direction, and the label shows **width × height**, e.g. `140 × 44`.
3. **Click** to keep it as two rulers. Press **1** or **Esc** to go back to the Ruler.

Tip: hover *inside* a button to get its size, or *in the empty space between* two elements to
get the gap.

---

## 6. Drawing with rulers on screen: Pin

Use this to keep guide lines visible while you draw or design in another app.

1. Draw your rulers or guides (double-click one to make it an infinite line, which is useful for
   perspective lines, horizons and alignment).
2. Press **P** (or click **Pin**).
3. The toolbar disappears and **your mouse now goes straight through** to the app underneath.
   The rulers stay on top while you draw.
4. To edit the rulers again, press **Ctrl+Shift+M**, or click the small **"Pinned — click to edit"**
   chip in the bottom-right corner.

---

## 7. Toolbar

| Button | Key | What it does |
| --- | --- | --- |
| Ruler | 1 | Draw rulers (default) |
| Spacing | 2 | Hover to measure elements and gaps |
| Snap | G | Snap to edges on screen (Alt = bypass for a moment) |
| Loupe | L | Keep the magnifier on while hovering, not just while dragging |
| px / phys px | U | Only on displays scaled above 100%: switch between screen pixels and physical pixels |
| ↶ | Ctrl+Z | Undo |
| 🗑 | | Clear all rulers |
| Pin | P | Keep rulers on screen, click through to your app |
| ? | ? | Show all shortcuts |
| ✕ | Esc | Close |

The toolbar fades out of the way if you draw near it. A hint line above it always shows what you
can do next.

---

## 8. Good to know

- **Which pixels?** On a display scaled above 100% (e.g. 150% on a laptop), `px` means
  screen pixels, the same units as CSS or Figma. Switch to **phys px** (U) to see real
  hardware pixels.
- **Multiple monitors:** each screen gets its own overlay. Measure on whichever one you need.
- **The screen is captured when you open the overlay.** Snapping, the loupe and Spacing use
  that capture. If something underneath changes (a video, an animation), close and reopen to refresh.
- **The page underneath doesn't scroll** while the overlay is open. Close or pin it first.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Ctrl+Shift+M does nothing | Another app has that shortcut. Use the tray icon. |
| "Screen capture unavailable" | Rulers still work; only snapping, loupe and Spacing are off. On macOS, allow Screen Recording in System Settings → Privacy & Security, then restart. |
| Snapping jumps somewhere I don't want | Hold **Alt** while placing, or press **G** to turn it off. |
| I can't click my app | The overlay is open. Press **Esc** to close, or **P** to pin and click through. |
