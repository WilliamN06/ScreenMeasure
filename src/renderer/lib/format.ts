import { distance, slopeAngle } from './geometry';
import type { Point } from './types';

export type Units = 'px' | 'physical';

/** 248 → "248", 248.25 → "248.3", -0.01 → "0". */
export function fmt(n: number, decimals = 1): string {
  const v = Number(n.toFixed(decimals));
  return String(v === 0 ? 0 : v);
}

export function lengthText(px: number, scale: number, units: Units): string {
  return units === 'physical' ? `${fmt(px * scale)} phys px` : `${fmt(px)} px`;
}

export function angleText(deg: number): string {
  return `${fmt(deg)}°`;
}

export function measurementText(a: Point, b: Point, scale: number, units: Units): string {
  return `${lengthText(distance(a, b), scale, units)} · ${angleText(slopeAngle(a, b))}`;
}

export function deltaText(a: Point, b: Point, scale: number, units: Units): string {
  const k = units === 'physical' ? scale : 1;
  return `Δx ${fmt(Math.abs(b.x - a.x) * k)}  Δy ${fmt(Math.abs(b.y - a.y) * k)}`;
}

export function hexColor(rgb: readonly [number, number, number]): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}
