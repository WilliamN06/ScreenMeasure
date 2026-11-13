import { deltaText, fmt, hexColor, measurementText } from '../lib/format';
import type { PixelSource } from '../lib/snapping';
import type { Point } from '../lib/types';
import type { AppState } from '../state';

/**
 * The cursor card: a pixel loupe plus live numbers. Shown while drawing/adjusting (where
 * pixel precision matters), in the Spacing tool, and on hover if "Loupe" is toggled on.
 * Replaces the old magnifier that flashed for 0.9s *after* you had already let go.
 */
const CELLS = 15; // physical pixels across
const CELL = 9; // CSS px per pixel in the loupe
const SIZE = CELLS * CELL;

export interface Hud {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  main: HTMLElement;
  sub: HTMLElement;
  info: HTMLElement;
}

export function createHud(parent: HTMLElement): Hud {
  const el = document.createElement('div');
  el.id = 'hud';
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;
  const main = document.createElement('div');
  main.className = 'hud-main';
  const sub = document.createElement('div');
  sub.className = 'hud-sub';
  const info = document.createElement('div');
  info.className = 'hud-info';
  el.append(canvas, main, sub, info);
  parent.appendChild(el);
  return { el, canvas, main, sub, info };
}

const SNAP_TEXT = { edge: 'snapped to edge', endpoint: 'joined → angle', angle: 'angle locked (15°)', none: '' };

export function renderHud(hud: Hud, st: AppState, src: PixelSource | null, image: HTMLCanvasElement | null): void {
  const g = st.gesture;
  const drawing = g?.kind === 'create' || g?.kind === 'handle';
  const show =
    !st.pinned && !st.helpOpen && st.cursor !== null && (drawing || st.tool === 'spacing' || st.loupeAlways);
  hud.el.classList.toggle('visible', show);
  if (!show || !st.cursor) return;

  // Sample where the ruler end will actually land (after snapping), not the raw cursor.
  const focus: Point = g && (g.kind === 'create' || g.kind === 'handle') ? g.current : st.cursor;

  hud.canvas.style.display = src && image ? '' : 'none';
  if (src && image) drawLoupe(hud.canvas, image, src, focus);

  if (g?.kind === 'create' || g?.kind === 'handle') {
    const anchor = g.kind === 'create' ? g.start : g.anchor;
    hud.main.textContent = measurementText(anchor, g.current, st.scale, st.units);
    hud.sub.textContent = [deltaText(anchor, g.current, st.scale, st.units), SNAP_TEXT[g.snap]].filter(Boolean).join('  ·  ');
  } else if (st.tool === 'spacing' && st.spacing) {
    const k = st.units === 'physical' ? st.scale : 1;
    const s = st.spacing;
    hud.main.textContent = `${fmt((s.right - s.left) * k)} × ${fmt((s.bottom - s.top) * k)}`;
    hud.sub.textContent = 'click to keep as rulers';
  } else {
    hud.main.textContent = '';
    hud.sub.textContent = '';
  }
  hud.main.style.display = hud.main.textContent ? '' : 'none';
  hud.sub.style.display = hud.sub.textContent ? '' : 'none';

  const k = st.units === 'physical' ? st.scale : 1;
  const px = src?.getPixel(focus.x, focus.y);
  hud.info.textContent = `x ${fmt(focus.x * k, 0)}  y ${fmt(focus.y * k, 0)}${px ? `  ${hexColor(px)}` : ''}`;

  // Keep the card next to the cursor, flipping away from screen edges.
  const w = hud.el.offsetWidth || SIZE + 16;
  const h = hud.el.offsetHeight || SIZE + 60;
  const c = st.cursor;
  let x = c.x + 24;
  let y = c.y + 24;
  if (x + w > st.screenWidth - 8) x = c.x - 24 - w;
  if (y + h > st.screenHeight - 8) y = c.y - 24 - h;
  hud.el.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
}

function drawLoupe(canvas: HTMLCanvasElement, image: HTMLCanvasElement, src: PixelSource, p: Point): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const dpr = canvas.width / SIZE;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#111';
  g.fillRect(0, 0, SIZE, SIZE);
  const cx = Math.floor(p.x * src.scale);
  const cy = Math.floor(p.y * src.scale);
  const half = Math.floor(CELLS / 2);
  g.drawImage(image, cx - half, cy - half, CELLS, CELLS, 0, 0, SIZE, SIZE);

  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 1; i < CELLS; i++) {
    g.moveTo(i * CELL + 0.5, 0);
    g.lineTo(i * CELL + 0.5, SIZE);
    g.moveTo(0, i * CELL + 0.5);
    g.lineTo(SIZE, i * CELL + 0.5);
  }
  g.stroke();

  const o = half * CELL;
  g.lineWidth = 2;
  g.strokeStyle = '#000';
  g.strokeRect(o - 0.5, o - 0.5, CELL + 1, CELL + 1);
  g.lineWidth = 1;
  g.strokeStyle = '#fff';
  g.strokeRect(o - 0.5, o - 0.5, CELL + 1, CELL + 1);
}
