import type { Point, Rect } from './types';

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * The tilt of a line in degrees, in (-90, 90], the way you'd read it off a protractor:
 *   0 = horizontal, 90 = vertical, +30 = rising to the right, -30 = falling to the right.
 * Independent of which end you started dragging from. (Screen y points down, so we flip it.)
 */
export function slopeAngle(a: Point, b: Point): number {
  if (a.x === b.x && a.y === b.y) return 0;
  let deg = (Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI; // (-180, 180]
  if (deg <= -90) deg += 180;
  else if (deg > 90) deg -= 180;
  return deg === 0 ? 0 : deg; // normalise -0
}

/** Removes float fuzz like 299.99999999 so axis-aligned results stay exact. */
function clean(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Project `p` onto the nearest ray from `anchor` whose direction is a multiple of `stepDeg`. */
export function constrainToAngle(anchor: Point, p: Point, stepDeg: number): Point {
  const dx = p.x - anchor.x;
  const dy = p.y - anchor.y;
  if (dx === 0 && dy === 0) return { ...anchor };
  const step = (stepDeg * Math.PI) / 180;
  const snapped = Math.round(Math.atan2(dy, dx) / step) * step;
  const len = Math.max(0, dx * Math.cos(snapped) + dy * Math.sin(snapped));
  return { x: clean(anchor.x + Math.cos(snapped) * len), y: clean(anchor.y + Math.sin(snapped) * len) };
}

/** Constrain a move vector to the dominant axis. */
export function constrainToAxis(d: Point): Point {
  return Math.abs(d.x) >= Math.abs(d.y) ? { x: d.x, y: 0 } : { x: 0, y: d.y };
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** The visible part of the infinite line through a and b (Liang–Barsky). */
export function clipLineToRect(a: Point, b: Point, rect: Rect): [Point, Point] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;
  let t0 = -Infinity;
  let t1 = Infinity;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (
    !clip(-dx, a.x - rect.x) ||
    !clip(dx, rect.x + rect.width - a.x) ||
    !clip(-dy, a.y - rect.y) ||
    !clip(dy, rect.y + rect.height - a.y)
  ) {
    return null;
  }
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

export function samePoint(a: Point, b: Point, eps = 0.75): boolean {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
}
