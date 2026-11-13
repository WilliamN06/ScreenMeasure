import { describe, expect, it } from 'vitest';

import { BODY_TOLERANCE, hitTest } from '../../src/renderer/interaction/hittest';
import { addRuler, createInitialState } from '../../src/renderer/state';

describe('hit testing', () => {
  const one = addRuler(createInitialState(800, 600), { x: 100, y: 100 }, { x: 300, y: 100 });
  const id = one.rulers[0]!.id;
  const selected = { ...one, selectedId: id };

  it('finds the body within tolerance', () => {
    expect(hitTest(one, { x: 200, y: 100 + BODY_TOLERANCE })?.kind).toBe('body');
    expect(hitTest(one, { x: 200, y: 100 + BODY_TOLERANCE + 1 })).toBeNull();
  });

  it('selected ruler: its ends are handles (adjust)', () => {
    expect(hitTest(selected, { x: 104, y: 102 })).toEqual({ kind: 'handle', id, end: 'a' });
    expect(hitTest(selected, { x: 298, y: 99 })).toEqual({ kind: 'handle', id, end: 'b' });
  });

  it('unselected ruler: its ends start a joined ruler (angle), not an adjustment', () => {
    expect(hitTest(one, { x: 298, y: 99 })).toEqual({ kind: 'join', id, end: 'b' });
  });

  it('prefers the selected ruler when overlapping', () => {
    let s = addRuler(one, { x: 150, y: 100 }, { x: 250, y: 100 });
    expect(hitTest(s, { x: 200, y: 100 })?.id).not.toBe(id); // topmost by default
    s = { ...s, selectedId: id };
    expect(hitTest(s, { x: 200, y: 100 })?.id).toBe(id);
  });
});
