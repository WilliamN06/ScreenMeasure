import { constrainToAngle, distance } from './geometry';
import type { Point } from './types';

export interface SnapResult {
  point: Point;
  snapped: boolean;
  /** vertical = x moved onto a vertical edge; horizontal = y moved; corner = both. */
  orientation: 'horizontal' | 'vertical' | 'corner' | null;
  snapX: boolean;
  snapY: boolean;
}

export type RGB = [number, number, number];

export interface PixelSource {
  /** Physical pixel size of the screenshot. */
  width: number;
  height: number;
  /** Physical pixels per CSS pixel. */
  scale: number;
  /** Pixel under a CSS-space coordinate. */
  getPixel(cssX: number, cssY: number): RGB | null;
  /** Pixel at a physical coordinate. */
  getRaw(x: number, y: number): RGB | null;
}

export const EDGE_THRESHOLD = 30;

function toGray(rgb: RGB): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Snaps to the *boundary between* two pixels (not to a pixel), independently per axis, within
 * `threshold` CSS px. Boundary snapping is what makes a 140px button measure 140, not 139;
 * per-axis snapping means a corner locks both x and y.
 */
export function snapPoint(p: Point, source: PixelSource, threshold: number): SnapResult {
  const s = source.scale;
  const T = Math.max(1, Math.round(Math.max(1, Math.min(12, threshold)) * s));
  const px = Math.floor(p.x * s);
  const py = Math.floor(p.y * s);
  const gray = (x: number, y: number): number | null => {
    const c = source.getRaw(x, y);
    return c ? toGray(c) : null;
  };

  const best = (center: number, sample: (b: number) => [number | null, number | null]): number | null => {
    let found: { b: number; strength: number } | null = null;
    for (let b = Math.round(center) - T; b <= Math.round(center) + T; b++) {
      const [before, after] = sample(b);
      if (before === null || after === null) continue;
      // Prefer the closest of equally strong edges so the snap doesn't jump around.
      const strength = Math.abs(after - before) - Math.abs(b - center) * 0.01;
      if (!found || strength > found.strength) found = { b, strength };
    }
    return found && found.strength >= EDGE_THRESHOLD ? found.b : null;
  };

  const bx = best(p.x * s, (b) => [gray(b - 1, py), gray(b, py)]);
  const by = best(p.y * s, (b) => [gray(px, b - 1), gray(px, b)]);
  const snapX = bx !== null;
  const snapY = by !== null;
  return {
    point: { x: snapX ? bx / s : p.x, y: snapY ? by / s : p.y },
    snapped: snapX || snapY,
    orientation: snapX && snapY ? 'corner' : snapX ? 'vertical' : snapY ? 'horizontal' : null,
    snapX,
    snapY,
  };
}

/** `data` is RGBA. `scale` = physical px per CSS px. */
export function makePixelSource(data: Uint8ClampedArray, width: number, height: number, scale = 1): PixelSource {
  const sf = scale > 0 ? scale : 1;
  const getRaw = (x: number, y: number): RGB | null => {
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r === undefined || g === undefined || b === undefined) return null;
    return [r, g, b];
  };
  return {
    width,
    height,
    scale: sf,
    getRaw,
    getPixel: (cssX, cssY) => getRaw(Math.floor(cssX * sf), Math.floor(cssY * sf)),
  };
}

export function nearestPoint(p: Point, candidates: Point[], radius: number): Point | null {
  let best: Point | null = null;
  let bestD = radius;
  for (const c of candidates) {
    const d = distance(p, c);
    if (d <= bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

export type SnapKind = 'none' | 'edge' | 'endpoint' | 'angle';

export interface Resolved {
  point: Point;
  kind: SnapKind;
}

export interface ResolveOptions {
  /** The fixed end of the ruler being drawn (enables angle constraint). */
  anchor: Point | null;
  /** Shift held: lock the angle to 15° steps. */
  constrain: boolean;
  /** Edge snapping on (toggle in the toolbar; hold Alt to bypass momentarily). */
  edges: boolean;
  /** Existing ruler ends to magnetise to (so rulers can share a vertex and show an angle). */
  endpoints: Point[];
  src: PixelSource | null;
  magnetRadius?: number;
  edgeRadius?: number;
}

/** Turns a raw cursor position into the point a ruler end should actually land on. */
export function resolvePoint(raw: Point, o: ResolveOptions): Resolved {
  const magnet = o.magnetRadius ?? 8;
  const edgeRadius = o.edgeRadius ?? 4;

  if (o.constrain && o.anchor) {
    const p = constrainToAngle(o.anchor, raw, 15);
    if (o.edges && o.src) {
      // Edge-snap only along the ray so the locked angle survives.
      const horizontal = p.y === o.anchor.y && p.x !== o.anchor.x;
      const vertical = p.x === o.anchor.x && p.y !== o.anchor.y;
      const s = snapPoint(p, o.src, edgeRadius);
      if (horizontal && s.snapX) return { point: { x: s.point.x, y: p.y }, kind: 'edge' };
      if (vertical && s.snapY) return { point: { x: p.x, y: s.point.y }, kind: 'edge' };
    }
    return { point: p, kind: 'angle' };
  }

  const ep = nearestPoint(raw, o.endpoints, magnet);
  if (ep) return { point: { ...ep }, kind: 'endpoint' };

  if (o.edges && o.src) {
    const s = snapPoint(raw, o.src, edgeRadius);
    if (s.snapped) return { point: s.point, kind: 'edge' };
  }
  return { point: { ...raw }, kind: 'none' };
}
