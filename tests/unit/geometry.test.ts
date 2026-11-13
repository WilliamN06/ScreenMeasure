import { describe, expect, it } from 'vitest';

import {
  clipLineToRect,
  constrainToAngle,
  constrainToAxis,
  distance,
  distanceToSegment,
  midpoint,
  samePoint,
  slopeAngle,
} from '../../src/renderer/lib/geometry';

describe('distance / midpoint', () => {
  it('handles 3-4-5', () => expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5));
  it('handles zero', () => expect(distance({ x: 7, y: 7 }, { x: 7, y: 7 })).toBe(0));
  it('midpoint', () => expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 4 })).toEqual({ x: 5, y: 2 }));
});

describe('slopeAngle (protractor reading, y-up)', () => {
  it('horizontal is 0 regardless of direction', () => {
    expect(slopeAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
    expect(slopeAngle({ x: 10, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });
  it('vertical is 90 regardless of direction', () => {
    expect(slopeAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(90);
    expect(slopeAngle({ x: 0, y: 10 }, { x: 0, y: 0 })).toBe(90);
  });
  it('rising to the right is positive (screen y is down)', () => {
    expect(slopeAngle({ x: 0, y: 10 }, { x: 10, y: 0 })).toBeCloseTo(45);
  });
  it('falling to the right is negative', () => {
    expect(slopeAngle({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(-45);
  });
  it('does not depend on drag direction', () => {
    const a = { x: 3, y: 8 };
    const b = { x: 40, y: -5 };
    expect(slopeAngle(a, b)).toBeCloseTo(slopeAngle(b, a));
  });
  it('stays in (-90, 90]', () => {
    for (let deg = -360; deg <= 360; deg += 7) {
      const r = (deg * Math.PI) / 180;
      const v = slopeAngle({ x: 0, y: 0 }, { x: Math.cos(r) * 10, y: Math.sin(r) * 10 });
      expect(v).toBeGreaterThan(-90.0001);
      expect(v).toBeLessThanOrEqual(90.0001);
    }
  });
});

describe('constrainToAngle', () => {
  it('locks a near-horizontal drag to exactly horizontal', () => {
    expect(constrainToAngle({ x: 100, y: 100 }, { x: 300, y: 106 }, 15)).toEqual({ x: 300.000, y: 100 });
  });
  it('locks to 45°', () => {
    const p = constrainToAngle({ x: 0, y: 0 }, { x: 100, y: 96 }, 15);
    expect(p.x).toBeCloseTo(p.y, 2);
  });
  it('never flips behind the anchor', () => {
    const p = constrainToAngle({ x: 0, y: 0 }, { x: 0, y: 0 }, 15);
    expect(p).toEqual({ x: 0, y: 0 });
  });
});

describe('constrainToAxis', () => {
  it('keeps the dominant axis', () => {
    expect(constrainToAxis({ x: 10, y: 3 })).toEqual({ x: 10, y: 0 });
    expect(constrainToAxis({ x: 2, y: -9 })).toEqual({ x: 0, y: -9 });
  });
});

describe('distanceToSegment', () => {
  it('perpendicular distance inside the segment', () =>
    expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3));
  it('distance to the nearest end beyond the segment', () =>
    expect(distanceToSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5));
});

describe('clipLineToRect', () => {
  const rect = { x: 0, y: 0, width: 800, height: 600 };
  it('extends a horizontal segment edge to edge', () => {
    expect(clipLineToRect({ x: 100, y: 50 }, { x: 200, y: 50 }, rect)).toEqual([
      { x: 0, y: 50 },
      { x: 800, y: 50 },
    ]);
  });
  it('extends a diagonal to the screen border', () => {
    const seg = clipLineToRect({ x: 100, y: 100 }, { x: 110, y: 110 }, rect)!;
    expect(seg[0]).toEqual({ x: 0, y: 0 });
    expect(seg[1]).toEqual({ x: 600, y: 600 });
  });
  it('returns null for a degenerate line', () => expect(clipLineToRect({ x: 1, y: 1 }, { x: 1, y: 1 }, rect)).toBeNull());
});

describe('samePoint', () => {
  it('within tolerance', () => expect(samePoint({ x: 1, y: 1 }, { x: 1.5, y: 0.6 })).toBe(true));
  it('outside tolerance', () => expect(samePoint({ x: 1, y: 1 }, { x: 3, y: 1 })).toBe(false));
});
