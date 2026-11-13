import { distance, distanceToSegment } from '../lib/geometry';
import type { Point } from '../lib/types';
import type { AppState, Hover } from '../state';

/** Generous targets: a 2px line is hard to hit, so the grab zones are much larger than what's drawn. */
export const HANDLE_RADIUS = 9;
export const BODY_TOLERANCE = 7;

/**
 * One rule, no ambiguity:
 *  - the SELECTED ruler shows handles → pressing a handle adjusts that end;
 *  - pressing the END of any other ruler starts a NEW ruler joined there (→ angle);
 *  - pressing a line moves it (and selects it); empty space draws.
 */
export function hitTest(state: AppState, p: Point): Hover {
  const sel = state.rulers.find((r) => r.id === state.selectedId);
  if (sel) {
    const da = distance(p, sel.a);
    const db = distance(p, sel.b);
    if (Math.min(da, db) <= HANDLE_RADIUS) return { kind: 'handle', id: sel.id, end: da <= db ? 'a' : 'b' };
  }

  const topFirst = [...state.rulers].reverse();
  let join: { id: string; end: 'a' | 'b'; d: number } | null = null;
  for (const r of topFirst) {
    if (r.id === state.selectedId) continue;
    for (const end of ['a', 'b'] as const) {
      const d = distance(p, r[end]);
      if (d <= HANDLE_RADIUS && (!join || d < join.d - 0.5)) join = { id: r.id, end, d };
    }
  }
  if (join) return { kind: 'join', id: join.id, end: join.end };

  if (sel && distanceToSegment(p, sel.a, sel.b) <= BODY_TOLERANCE) return { kind: 'body', id: sel.id };
  for (const r of topFirst) {
    if (distanceToSegment(p, r.a, r.b) <= BODY_TOLERANCE) return { kind: 'body', id: r.id };
  }
  return null;
}

export function sameHover(x: Hover, y: Hover): boolean {
  if (x === null || y === null) return x === y;
  if (x.kind !== y.kind || x.id !== y.id) return false;
  return x.kind === 'body' || (y.kind !== 'body' && x.end === y.end);
}
