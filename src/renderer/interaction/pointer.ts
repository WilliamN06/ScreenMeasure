import { constrainToAxis, distance } from '../lib/geometry';
import { resolvePoint, type PixelSource, type Resolved } from '../lib/snapping';
import { scanSpacing } from '../lib/spacing';
import type { Point } from '../lib/types';
import {
  addRuler,
  addRulers,
  commit,
  deleteRuler,
  linkedHandles,
  MIN_RULER_LENGTH,
  setHandles,
  toggleExtended,
  type AppState,
  type HandleRef,
} from '../state';

import { hitTest, sameHover } from './hittest';

export interface PointerDeps {
  getState(): AppState;
  setState(next: AppState): void;
  getPixelSource(): PixelSource | null;
}

export interface PointerController {
  /** Re-evaluate with new modifier keys (Shift/Alt pressed or released mid-drag). */
  refresh(shift: boolean, alt: boolean): void;
  /** Esc mid-drag: put everything back. */
  cancel(): void;
  detach(): void;
}

const CLICK_SLOP = 3;

export function attachPointerHandlers(stage: HTMLElement, deps: PointerDeps): PointerController {
  let last: { p: Point; shift: boolean; alt: boolean } | null = null;

  function endpoints(st: AppState, exclude: HandleRef[]): Point[] {
    const out: Point[] = [];
    for (const r of st.rulers) {
      for (const end of ['a', 'b'] as const) {
        if (!exclude.some((h) => h.id === r.id && h.end === end)) out.push(r[end]);
      }
    }
    return out;
  }

  function resolve(st: AppState, raw: Point, anchor: Point | null, exclude: HandleRef[], shift: boolean, alt: boolean): Resolved {
    return resolvePoint(raw, {
      anchor,
      constrain: shift,
      edges: st.snapEdges && !alt,
      endpoints: endpoints(st, exclude),
      src: deps.getPixelSource(),
    });
  }

  function update(p: Point, shift: boolean, alt: boolean): void {
    const st = deps.getState();
    if (st.pinned) return;
    const g = st.gesture;
    const next: AppState = { ...st, cursor: p };

    if (g?.kind === 'create') {
      const r = resolve(st, p, g.start, [], shift, alt);
      next.gesture = { ...g, current: r.point, snap: r.kind };
    } else if (g?.kind === 'handle') {
      const r = resolve(st, p, g.anchor, g.handles, shift, alt);
      next.gesture = { ...g, current: r.point, snap: r.kind };
      next.rulers = setHandles(st.rulers, g.handles, r.point);
    } else if (g?.kind === 'body') {
      let d = { x: p.x - g.origin.x, y: p.y - g.origin.y };
      if (shift) d = constrainToAxis(d);
      const moved = g.moved || Math.hypot(d.x, d.y) > CLICK_SLOP;
      next.gesture = { ...g, moved };
      if (moved) {
        next.rulers = st.rulers.map((r) =>
          r.id === g.id ? { ...r, a: { x: g.a0.x + d.x, y: g.a0.y + d.y }, b: { x: g.b0.x + d.x, y: g.b0.y + d.y } } : r
        );
      }
    } else if (st.tool === 'spacing') {
      const src = deps.getPixelSource();
      next.spacing = src ? scanSpacing(p, src) : null;
      next.hover = null;
    } else {
      const h = hitTest(st, p);
      next.hover = sameHover(h, st.hover) ? st.hover : h;
    }
    deps.setState(next);
  }

  function onPointerDown(ev: PointerEvent): void {
    const st = deps.getState();
    if (st.pinned) return;
    if (st.helpOpen) {
      deps.setState({ ...st, helpOpen: false });
      return;
    }
    const p = { x: ev.clientX, y: ev.clientY };
    last = { p, shift: ev.shiftKey, alt: ev.altKey };

    if (ev.button === 2) {
      const h = hitTest(st, p);
      if (h) deps.setState(deleteRuler(st, h.id));
      return;
    }
    if (ev.button !== 0) return;

    if (st.tool === 'spacing') {
      const sp = st.spacing;
      if (sp) {
        deps.setState(
          addRulers(st, [
            [{ x: sp.left, y: sp.origin.y }, { x: sp.right, y: sp.origin.y }],
            [{ x: sp.origin.x, y: sp.top }, { x: sp.origin.x, y: sp.bottom }],
          ])
        );
      }
      return;
    }

    const h = hitTest(st, p);
    const ruler = h ? st.rulers.find((r) => r.id === h.id) : undefined;
    if (h?.kind === 'handle' && ruler) {
      deps.setState({
        ...st,
        selectedId: ruler.id,
        gesture: {
          kind: 'handle',
          handles: linkedHandles(st.rulers, h),
          anchor: ruler[h.end === 'a' ? 'b' : 'a'],
          current: ruler[h.end],
          snap: 'none',
          before: st.rulers,
        },
      });
    } else if (h?.kind === 'body' && ruler) {
      deps.setState({
        ...st,
        selectedId: ruler.id,
        gesture: { kind: 'body', id: ruler.id, origin: p, a0: ruler.a, b0: ruler.b, moved: false, before: st.rulers },
      });
    } else {
      // Empty space, or the end of an unselected ruler (the magnet joins them → angle).
      const r = resolve(st, p, null, [], false, ev.altKey);
      deps.setState({
        ...st,
        selectedId: null,
        cursor: p,
        gesture: { kind: 'create', start: r.point, startSnap: r.kind, current: r.point, snap: r.kind },
      });
    }
    stage.setPointerCapture(ev.pointerId);
  }

  function onPointerMove(ev: PointerEvent): void {
    const p = { x: ev.clientX, y: ev.clientY };
    last = { p, shift: ev.shiftKey, alt: ev.altKey };
    update(p, ev.shiftKey, ev.altKey);
  }

  function finish(): void {
    const st = deps.getState();
    const g = st.gesture;
    if (!g) return;
    const base = { ...st, gesture: null };
    if (g.kind === 'create') {
      deps.setState(distance(g.start, g.current) >= MIN_RULER_LENGTH ? addRuler(base, g.start, g.current) : base);
    } else if (g.kind === 'handle') {
      // An end dragged onto its other end collapses the ruler: treat that as delete.
      const changed = st.rulers !== g.before; // still the same array if the pointer never moved
      const rulers = st.rulers.filter((r) => distance(r.a, r.b) >= MIN_RULER_LENGTH);
      deps.setState(changed ? commit(base, rulers, g.before) : base);
    } else {
      deps.setState(g.moved ? commit(base, st.rulers, g.before) : base);
    }
  }

  function onPointerUp(ev: PointerEvent): void {
    finish();
    if (stage.hasPointerCapture(ev.pointerId)) stage.releasePointerCapture(ev.pointerId);
    if (last) update(last.p, last.shift, last.alt); // refresh hover after the change
  }

  function cancel(): void {
    const st = deps.getState();
    const g = st.gesture;
    if (!g) return;
    const rulers = g.kind === 'create' ? st.rulers : g.before;
    deps.setState({ ...st, rulers, gesture: null });
  }

  function onDblClick(ev: MouseEvent): void {
    const st = deps.getState();
    if (st.pinned || st.tool !== 'ruler') return;
    const h = hitTest(st, { x: ev.clientX, y: ev.clientY });
    if (h) deps.setState({ ...toggleExtended(st, h.id), selectedId: h.id });
  }

  function onLeave(): void {
    const st = deps.getState();
    if (st.gesture) return;
    deps.setState({ ...st, cursor: null, hover: null, spacing: null });
  }

  const onContext = (e: Event): void => e.preventDefault();
  const onCancel = (): void => cancel();

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onCancel);
  stage.addEventListener('pointerleave', onLeave);
  stage.addEventListener('dblclick', onDblClick);
  stage.addEventListener('contextmenu', onContext);

  return {
    refresh(shift, alt) {
      if (last) {
        last = { ...last, shift, alt };
        update(last.p, shift, alt);
      }
    },
    cancel,
    detach() {
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onCancel);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('dblclick', onDblClick);
      stage.removeEventListener('contextmenu', onContext);
    },
  };
}
