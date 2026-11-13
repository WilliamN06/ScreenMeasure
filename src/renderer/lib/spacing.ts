import type { PixelSource, RGB } from './snapping';
import type { Point } from './types';

/**
 * "Spacing" tool: from the cursor, walk left/right/up/down through pixels of the same colour
 * until something different is hit. Hovering inside a button, a gap between two elements or a
 * margin instantly shows its width and height — the fastest way to measure UI.
 */
export interface Spacing {
  origin: Point;
  left: number; // CSS px, bounds of the uniform region
  right: number;
  top: number;
  bottom: number;
}

function similar(a: RGB, b: RGB, tolerance: number): boolean {
  return (
    Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance && Math.abs(a[2] - b[2]) <= tolerance
  );
}

export function scanSpacing(p: Point, src: PixelSource, tolerance = 12): Spacing | null {
  const s = src.scale;
  const px = Math.floor(p.x * s);
  const py = Math.floor(p.y * s);
  const base = src.getRaw(px, py);
  if (!base) return null;
  const same = (x: number, y: number): boolean => {
    const c = src.getRaw(x, y);
    return c !== null && similar(c, base, tolerance);
  };
  let x0 = px;
  while (same(x0 - 1, py)) x0--;
  let x1 = px;
  while (same(x1 + 1, py)) x1++;
  let y0 = py;
  while (same(px, y0 - 1)) y0--;
  let y1 = py;
  while (same(px, y1 + 1)) y1++;
  return { origin: { ...p }, left: x0 / s, right: (x1 + 1) / s, top: y0 / s, bottom: (y1 + 1) / s };
}
