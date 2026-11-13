import { describe, expect, it } from 'vitest';

import { boundsOf, clampToScreen, containsPoint, intersectArea, placeLabel } from '../../src/renderer/lib/layout';

describe('intersectArea', () => {
  it('zero for non-overlapping', () => {
    expect(intersectArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 10, height: 10 })).toBe(0);
  });
  it('positive for overlapping', () => {
    expect(intersectArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(25);
  });
});

describe('containsPoint', () => {
  it('true inside', () => expect(containsPoint({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5 })).toBe(true));
  it('false outside', () => expect(containsPoint({ x: 0, y: 0, width: 10, height: 10 }, { x: 15, y: 5 })).toBe(false));
});

describe('clampToScreen', () => {
  it('clamps to edges', () => expect(clampToScreen({ x: -100, y: -100 }, 50, 20, 800, 600)).toEqual({ x: 8, y: 8 }));
  it('clamps at bottom-right', () =>
    expect(clampToScreen({ x: 1000, y: 1000 }, 50, 20, 800, 600)).toEqual({ x: 742, y: 572 }));
});

describe('placeLabel', () => {
  const base = { labelWidth: 100, labelHeight: 20, screenWidth: 800, screenHeight: 600, occupied: [], avoid: [] };

  it('puts the label above a horizontal ruler, not on top of it', () => {
    const p = placeLabel({ ...base, a: { x: 100, y: 300 }, b: { x: 500, y: 300 } });
    expect(p.y + 20).toBeLessThanOrEqual(300);
    expect(p.x + 50).toBeCloseTo(300, 0);
  });

  it('stays on screen for a ruler along the top edge', () => {
    const p = placeLabel({ ...base, a: { x: 100, y: 2 }, b: { x: 500, y: 2 } });
    expect(p.y).toBeGreaterThanOrEqual(8);
  });

  it('avoids occupied rects when possible', () => {
    const occupied = [{ x: 240, y: 260, width: 120, height: 40 }];
    const p = placeLabel({ ...base, a: { x: 100, y: 300 }, b: { x: 500, y: 300 }, occupied });
    expect(intersectArea(boundsOf(p, 100, 20), occupied[0]!)).toBe(0);
  });
});
