import { describe, expect, it } from 'vitest';

import {
  addRuler,
  addRulers,
  clearAll,
  createInitialState,
  deleteRuler,
  linkedHandles,
  nudge,
  redo,
  resetForOpen,
  setHandles,
  toggleExtended,
  undo,
} from '../../src/renderer/state';

const s0 = (): ReturnType<typeof createInitialState> => createInitialState(800, 600);

describe('state', () => {
  it('starts empty with the ruler tool', () => {
    const s = s0();
    expect(s.rulers).toHaveLength(0);
    expect(s.tool).toBe('ruler');
  });

  it('ignores accidental clicks (rulers shorter than 3px)', () => {
    expect(addRuler(s0(), { x: 100, y: 100 }, { x: 101, y: 100 }).rulers).toHaveLength(0);
  });

  it('adds a ruler without selecting it (so its end can start the next ruler) and advances the colour', () => {
    const s = addRuler(s0(), { x: 100, y: 100 }, { x: 200, y: 100 });
    expect(s.rulers).toHaveLength(1);
    expect(s.selectedId).toBeNull();
    expect(s.nextColor).toBe(1);
  });

  it('undo / redo', () => {
    let s = addRuler(s0(), { x: 0, y: 0 }, { x: 100, y: 0 });
    s = addRuler(s, { x: 0, y: 50 }, { x: 100, y: 50 });
    s = undo(s);
    expect(s.rulers).toHaveLength(1);
    s = undo(s);
    expect(s.rulers).toHaveLength(0);
    s = redo(redo(s));
    expect(s.rulers).toHaveLength(2);
  });

  it('a new action clears the redo stack', () => {
    let s = addRuler(s0(), { x: 0, y: 0 }, { x: 100, y: 0 });
    s = undo(s);
    s = addRuler(s, { x: 0, y: 50 }, { x: 100, y: 50 });
    expect(s.future).toHaveLength(0);
  });

  it('delete, clear and undo of clear', () => {
    let s = addRuler(s0(), { x: 0, y: 0 }, { x: 100, y: 0 });
    s = addRuler(s, { x: 0, y: 50 }, { x: 100, y: 50 });
    s = deleteRuler(s, s.rulers[0]!.id);
    expect(s.rulers).toHaveLength(1);
    s = clearAll(s);
    expect(s.rulers).toHaveLength(0);
    expect(undo(s).rulers).toHaveLength(1);
  });

  it('toggleExtended and nudge', () => {
    let s = addRuler(s0(), { x: 0, y: 0 }, { x: 100, y: 0 });
    const id = s.rulers[0]!.id;
    s = toggleExtended(s, id);
    expect(s.rulers[0]!.extended).toBe(true);
    s = nudge(s, id, 10, -1);
    expect(s.rulers[0]!.a).toEqual({ x: 10, y: -1 });
    expect(s.rulers[0]!.b).toEqual({ x: 110, y: -1 });
  });

  it('addRulers is a single undo step', () => {
    let s = addRulers(s0(), [
      [{ x: 0, y: 10 }, { x: 100, y: 10 }],
      [{ x: 50, y: 0 }, { x: 50, y: 40 }],
    ]);
    expect(s.rulers).toHaveLength(2);
    s = undo(s);
    expect(s.rulers).toHaveLength(0);
  });

  it('linkedHandles finds every end on a shared vertex', () => {
    let s = addRuler(s0(), { x: 100, y: 100 }, { x: 200, y: 100 });
    s = addRuler(s, { x: 100, y: 100 }, { x: 100, y: 0 });
    s = addRuler(s, { x: 300, y: 300 }, { x: 400, y: 300 });
    const linked = linkedHandles(s.rulers, { id: s.rulers[0]!.id, end: 'a' });
    expect(linked).toHaveLength(2);
    const moved = setHandles(s.rulers, linked, { x: 120, y: 120 });
    expect(moved[0]!.a).toEqual({ x: 120, y: 120 });
    expect(moved[1]!.a).toEqual({ x: 120, y: 120 });
    expect(moved[2]).toBe(s.rulers[2]);
  });

  it('reopening starts clean, but Ctrl+Z restores the previous rulers', () => {
    let s = addRuler(s0(), { x: 0, y: 0 }, { x: 100, y: 0 });
    s = resetForOpen(s, false);
    expect(s.rulers).toHaveLength(0);
    expect(undo(s).rulers).toHaveLength(1);
  });

  it('returning from pinned mode keeps the rulers', () => {
    let s = addRuler(s0(), { x: 0, y: 0 }, { x: 100, y: 0 });
    s = resetForOpen({ ...s, pinned: true }, true);
    expect(s.rulers).toHaveLength(1);
    expect(s.pinned).toBe(false);
  });
});
