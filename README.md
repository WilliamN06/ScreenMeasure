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

## Install

Download `ScreenMeasure-Setup-x.y.z.exe` from the [latest release](https://github.com/WilliamN06/ScreenMeasure/releases/latest)
and run it. It installs for your user (no admin prompt), adds Start menu and desktop shortcuts, and
lives in the tray. Tick **Start with Windows** in the tray menu to have it ready after sign-in.

The installer isn't code-signed, so Windows SmartScreen may say "Windows protected your PC" the
first time: click **More info → Run anyway**.

## Updates

Every push to `main` runs [`.github/workflows/release.yml`](.github/workflows/release.yml): tests,
builds the installer, and publishes it as release `1.0.<run number>`. Installed copies check for a
new release on launch and every 2 hours, download it in the background, and install it when you
quit (or right away via **Restart to update** in the tray). Pushes that only touch Markdown or
`docs/` don't make a release.

So the loop is: commit → `git push` → a few minutes later your installed app updates itself.

## Develop

    npm install
    npm run dev          # Electron with hot reload (never auto-updates)
    npm test
    npm run install-app  # build the installer and install it on this PC right now
    npm run icons        # re-render assets/*.png and icon.ico from assets/icon.svg
