import type { Point, Rect } from './types';

export type { Rect } from './types';

export function boundsOf(position: Point, w: number, h: number): Rect {
  return { x: position.x, y: position.y, width: w, height: h };
}

export function intersectArea(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

export function containsPoint(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

export function clampToScreen(p: Point, w: number, h: number, sw: number, sh: number): Point {
  return {
    x: Math.max(8, Math.min(sw - w - 8, p.x)),
    y: Math.max(8, Math.min(sh - h - 8, p.y)),
  };
}

export interface LabelLayoutInput {
  a: Point;
  b: Point;
  labelWidth: number;
  labelHeight: number;
  screenWidth: number;
  screenHeight: number;
  /** Rects already taken by other labels / UI. */
  occupied: Rect[];
  /** Points the label must not cover (ruler ends, vertices). */
  avoid: Point[];
}

/**
 * Places a ruler's label beside the line (never on top of it, so it doesn't hide what you're
 * measuring), trying both sides and a few slides along the line, avoiding other labels.
 * Returns the top-left corner.
 */
export function placeLabel(input: LabelLayoutInput): Point {
  const { a, b, labelWidth: w, labelHeight: h, screenWidth: sw, screenHeight: sh, occupied, avoid } = input;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const along = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  // Prefer the side "above" the line on screen.
  let normal = { x: -along.y, y: along.x };
  if (normal.y > 0 || (normal.y === 0 && normal.x > 0)) normal = { x: -normal.x, y: -normal.y };

  // Distance from centre to the label's edge in the normal direction, plus a gap.
  const reach = Math.abs(normal.x) * (w / 2) + Math.abs(normal.y) * (h / 2) + 8;
  const slides = [0, 0.25, -0.25, 0.4, -0.4].map((f) => f * len);

  let best: { pos: Point; score: number } | null = null;
  for (const side of [1, -1]) {
    for (const s of slides) {
      const cx = mid.x + normal.x * reach * side + along.x * s;
      const cy = mid.y + normal.y * reach * side + along.y * s;
      const pos = clampToScreen({ x: cx - w / 2, y: cy - h / 2 }, w, h, sw, sh);
      const rect = boundsOf(pos, w, h);
      let score = 0;
      for (const o of occupied) score -= intersectArea(rect, o);
      for (const p of avoid) if (containsPoint(rect, p)) score -= 400;
      score -= Math.abs(s) * 0.5 + (side === 1 ? 0 : 2);
      if (!best || score > best.score) best = { pos, score };
    }
  }
  return best!.pos;
}
