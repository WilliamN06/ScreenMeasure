import { distance, slopeAngle } from './geometry';
import type { Point } from './types';

export type Units = 'px' | 'physical';

/** 248 → "248", 248.25 → "248.3", -0.01 → "0". */
export function fmt(n: number, decimals = 1): string {
  const v = Number(n.toFixed(decimals));
  return String(v === 0 ? 0 : v);
}

/**
 * How lengths are reported. With `refLength` set (relative mode), every length is shown as a
 * multiple of the reference ruler (e.g. "1.5×") instead of in pixels.
 */
export interface Measure {
  scale: number;
  units: Units;
  refLength: number | null;
}

export const ABSOLUTE_PX: Measure = { scale: 1, units: 'px', refLength: null };

/** Absolute length in the chosen pixel units, ignoring relative mode. */
export function absoluteLengthText(px: number, m: Measure): string {
  return m.units === 'physical' ? `${fmt(px * m.scale)} phys px` : `${fmt(px)} px`;
}

export function lengthText(px: number, m: Measure): string {
  return m.refLength ? `${fmt(px / m.refLength, 2)}×` : absoluteLengthText(px, m);
}

export function angleText(deg: number): string {
  return `${fmt(deg)}°`;
}

export function measurementText(a: Point, b: Point, m: Measure): string {
  return `${lengthText(distance(a, b), m)} · ${angleText(slopeAngle(a, b))}`;
}

/** Label for the reference ruler itself in relative mode: its real size, marked as the unit. */
export function referenceText(a: Point, b: Point, m: Measure): string {
  return `ref = ${absoluteLengthText(distance(a, b), m)} · ${angleText(slopeAngle(a, b))}`;
}

function num(px: number, m: Measure): string {
  if (m.refLength) return `${fmt(px / m.refLength, 2)}×`;
  return fmt(px * (m.units === 'physical' ? m.scale : 1));
}

export function deltaText(a: Point, b: Point, m: Measure): string {
  return `Δx ${num(Math.abs(b.x - a.x), m)}  Δy ${num(Math.abs(b.y - a.y), m)}`;
}

/** "140 × 44", or "0.7 × 0.22 ref" in relative mode. */
export function sizeText(w: number, h: number, m: Measure): string {
  if (m.refLength) return `${fmt(w / m.refLength, 2)} × ${fmt(h / m.refLength, 2)} ref`;
  const k = m.units === 'physical' ? m.scale : 1;
  return `${fmt(w * k)} × ${fmt(h * k)}`;
}

export function hexColor(rgb: readonly [number, number, number]): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}
