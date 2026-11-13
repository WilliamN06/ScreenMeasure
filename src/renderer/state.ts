import type { Units } from './lib/format';
import { distance, samePoint } from './lib/geometry';
import type { SnapKind } from './lib/snapping';
import type { Spacing } from './lib/spacing';
import type { End, Point, Ruler } from './lib/types';

export type Tool = 'ruler' | 'spacing';

export interface HandleRef {
  id: string;
  end: End;
}

export type Hover =
  | { kind: 'handle'; id: string; end: End } // end of the selected ruler: drag to adjust
  | { kind: 'join'; id: string; end: End } // end of another ruler: press to start a joined ruler
  | { kind: 'body'; id: string }
  | null;

export type Gesture =
  /** Drawing a new ruler from empty space. */
  | { kind: 'create'; start: Point; startSnap: SnapKind; current: Point; snap: SnapKind }
  /** Dragging an endpoint (plus any other ends sharing that vertex, so joints stay joined). */
  | { kind: 'handle'; handles: HandleRef[]; anchor: Point; current: Point; snap: SnapKind; before: Ruler[] }
  /** Pressing / dragging a ruler's body. Becomes a move after a few px; otherwise it was a click. */
  | { kind: 'body'; id: string; origin: Point; a0: Point; b0: Point; moved: boolean; before: Ruler[] };

export interface AppState {
  rulers: Ruler[];
  selectedId: string | null;
  hover: Hover;
  gesture: Gesture | null;
  tool: Tool;
  snapEdges: boolean;
  /** Show the loupe while hovering too (it is always shown while dragging). */
  loupeAlways: boolean;
  units: Units;
  pinned: boolean;
  helpOpen: boolean;
  cursor: Point | null;
  spacing: Spacing | null;
  past: Ruler[][];
  future: Ruler[][];
  nextColor: number;
  screenWidth: number;
  screenHeight: number;
  /** Physical px per CSS px of the captured screenshot. */
  scale: number;
  hasCapture: boolean;
}

export const MIN_RULER_LENGTH = 3;
const HISTORY_LIMIT = 200;

export function createInitialState(screenWidth: number, screenHeight: number): AppState {
  return {
    rulers: [],
    selectedId: null,
    hover: null,
    gesture: null,
    tool: 'ruler',
    snapEdges: true,
    loupeAlways: false,
    units: 'px',
    pinned: false,
    helpOpen: false,
    cursor: null,
    spacing: null,
    past: [],
    future: [],
    nextColor: 0,
    screenWidth,
    screenHeight,
    scale: 1,
    hasCapture: false,
  };
}

let idCounter = 0;
function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `r${Date.now()}-${idCounter++}`;
}

/** Replace the rulers and record the previous set for undo. */
export function commit(state: AppState, rulers: Ruler[], before: Ruler[] = state.rulers): AppState {
  const past = [...state.past, before].slice(-HISTORY_LIMIT);
  const selectedId = rulers.some((r) => r.id === state.selectedId) ? state.selectedId : null;
  return { ...state, rulers, past, future: [], selectedId };
}

export function undo(state: AppState): AppState {
  const prev = state.past[state.past.length - 1];
  if (!prev) return state;
  return {
    ...state,
    rulers: prev,
    past: state.past.slice(0, -1),
    future: [state.rulers, ...state.future],
    gesture: null,
    selectedId: prev.some((r) => r.id === state.selectedId) ? state.selectedId : null,
  };
}

export function redo(state: AppState): AppState {
  const next = state.future[0];
  if (!next) return state;
  return {
    ...state,
    rulers: next,
    past: [...state.past, state.rulers],
    future: state.future.slice(1),
    gesture: null,
    selectedId: next.some((r) => r.id === state.selectedId) ? state.selectedId : null,
  };
}

export function addRuler(state: AppState, a: Point, b: Point): AppState {
  if (distance(a, b) < MIN_RULER_LENGTH) return state;
  const ruler: Ruler = { id: newId(), colorIndex: state.nextColor, a: { ...a }, b: { ...b }, extended: false };
  // Not auto-selected: so you can immediately start the next ruler on this one's end.
  const next = commit(state, [...state.rulers, ruler]);
  return { ...next, nextColor: state.nextColor + 1, gesture: null };
}

/** Adds several rulers as ONE undo step (used by the Spacing tool). */
export function addRulers(state: AppState, segments: [Point, Point][]): AppState {
  let color = state.nextColor;
  const added: Ruler[] = segments
    .filter(([a, b]) => distance(a, b) >= MIN_RULER_LENGTH)
    .map(([a, b]) => ({ id: newId(), colorIndex: color++, a: { ...a }, b: { ...b }, extended: false }));
  if (added.length === 0) return state;
  const next = commit(state, [...state.rulers, ...added]);
  return { ...next, nextColor: color };
}

export function deleteRuler(state: AppState, id: string): AppState {
  if (!state.rulers.some((r) => r.id === id)) return state;
  const next = commit(
    state,
    state.rulers.filter((r) => r.id !== id)
  );
  return { ...next, hover: null };
}

export function clearAll(state: AppState): AppState {
  if (state.rulers.length === 0) return state;
  return { ...commit(state, []), hover: null, selectedId: null };
}

export function toggleExtended(state: AppState, id: string): AppState {
  return commit(
    state,
    state.rulers.map((r) => (r.id === id ? { ...r, extended: !r.extended } : r))
  );
}

export function nudge(state: AppState, id: string, dx: number, dy: number): AppState {
  const move = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy });
  return commit(
    state,
    state.rulers.map((r) => (r.id === id ? { ...r, a: move(r.a), b: move(r.b) } : r))
  );
}

/** Every ruler end sitting on the same spot as `ref` (including itself). */
export function linkedHandles(rulers: Ruler[], ref: HandleRef): HandleRef[] {
  const owner = rulers.find((r) => r.id === ref.id);
  if (!owner) return [];
  const p = owner[ref.end];
  const out: HandleRef[] = [];
  for (const r of rulers) {
    for (const end of ['a', 'b'] as const) {
      if ((r.id === ref.id && end === ref.end) || samePoint(r[end], p)) out.push({ id: r.id, end });
    }
  }
  return out;
}

export function setHandles(rulers: Ruler[], handles: HandleRef[], p: Point): Ruler[] {
  return rulers.map((r) => {
    let next = r;
    for (const h of handles) if (h.id === r.id) next = { ...next, [h.end]: { ...p } };
    return next;
  });
}

/**
 * Overlay (re)opened. A fresh session starts empty, but the previous rulers stay one Ctrl+Z
 * away, so an accidental Esc never loses work.
 */
export function resetForOpen(state: AppState, keepRulers: boolean): AppState {
  const base = { ...state, gesture: null, hover: null, spacing: null, helpOpen: false, pinned: false };
  if (keepRulers || state.rulers.length === 0) return base;
  return { ...commit(base, []), selectedId: null, nextColor: 0 };
}

export function selectedRuler(state: AppState): Ruler | null {
  return state.rulers.find((r) => r.id === state.selectedId) ?? null;
}
