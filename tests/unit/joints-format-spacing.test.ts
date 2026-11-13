import { describe, expect, it } from 'vitest';

import { deltaText, fmt, hexColor, measurementText } from '../../src/renderer/lib/format';
import { arcPath, computeJoints } from '../../src/renderer/lib/joints';
import { makePixelSource } from '../../src/renderer/lib/snapping';
import { scanSpacing } from '../../src/renderer/lib/spacing';
import type { Point, Ruler } from '../../src/renderer/lib/types';

const R = (id: string, a: Point, b: Point): Ruler => ({ id, colorIndex: 0, a, b, extended: false });

describe('computeJoints', () => {
  it('no joint for separate rulers', () => {
    expect(computeJoints([R('1', { x: 0, y: 0 }, { x: 10, y: 0 }), R('2', { x: 50, y: 50 }, { x: 60, y: 50 })])).toEqual([]);
  });

  it('90° for an L shape', () => {
    const j = computeJoints([R('1', { x: 100, y: 100 }, { x: 200, y: 100 }), R('2', { x: 100, y: 100 }, { x: 100, y: 0 })]);
    expect(j).toHaveLength(1);
    expect(j[0]!.degrees).toBeCloseTo(90);
  });

  it('reports the inside angle (< 180) whichever way the rulers were drawn', () => {
    const j = computeJoints([R('1', { x: 200, y: 100 }, { x: 100, y: 100 }), R('2', { x: 100, y: 100 }, { x: 186.6, y: 50 })]);
    expect(j).toHaveLength(1);
    expect(j[0]!.degrees).toBeCloseTo(30, 0);
  });

  it('joins ends that are within sub-pixel tolerance', () => {
    const j = computeJoints([R('1', { x: 0, y: 0 }, { x: 100, y: 0 }), R('2', { x: 100.4, y: 0.3 }, { x: 100, y: 100 })]);
    expect(j).toHaveLength(1);
  });

  it('three rays → the angles between neighbours, summing to 360', () => {
    const v = { x: 100, y: 100 };
    const j = computeJoints([R('1', v, { x: 200, y: 100 }), R('2', v, { x: 100, y: 0 }), R('3', v, { x: 0, y: 200 })]);
    expect(j.map((x) => Math.round(x.degrees)).sort((a, b) => a - b)).toEqual([90, 135, 135]);
  });

  it('builds an SVG arc path', () => {
    const j = computeJoints([R('1', { x: 100, y: 100 }, { x: 200, y: 100 }), R('2', { x: 100, y: 100 }, { x: 100, y: 0 })]);
    expect(arcPath(j[0]!)).toMatch(/^M [\d.]+ [\d.]+ A /);
  });
});

describe('format', () => {
  it('drops a trailing .0', () => {
    expect(fmt(248)).toBe('248');
    expect(fmt(248.04)).toBe('248');
    expect(fmt(248.25)).toBe('248.3');
    expect(fmt(-0.01)).toBe('0');
  });
  it('measurement text', () => {
    expect(measurementText({ x: 0, y: 0 }, { x: 200, y: 0 }, 1, 'px')).toBe('200 px · 0°');
    expect(measurementText({ x: 0, y: 0 }, { x: 200, y: 0 }, 1.5, 'physical')).toBe('300 phys px · 0°');
  });
  it('delta text', () => expect(deltaText({ x: 0, y: 0 }, { x: -30, y: 40 }, 1, 'px')).toBe('Δx 30  Δy 40'));
  it('hex colour', () => expect(hexColor([30, 30, 46])).toBe('#1E1E2E'));
});

describe('scanSpacing', () => {
  // 10x6 image: a dark box from x=2..6, y=1..4 on white.
  const W = 10;
  const H = 6;
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y = 1; y <= 4; y++) {
    for (let x = 2; x <= 6; x++) {
      const i = (y * W + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 20;
    }
  }

  it('measures the uniform region around the cursor', () => {
    const s = scanSpacing({ x: 4, y: 2 }, makePixelSource(data, W, H))!;
    expect(s.right - s.left).toBe(5);
    expect(s.bottom - s.top).toBe(4);
    expect(s.left).toBe(2);
    expect(s.top).toBe(1);
  });

  it('works in CSS px on a HiDPI capture', () => {
    const s = scanSpacing({ x: 2, y: 1 }, makePixelSource(data, W, H, 2))!;
    expect(s.right - s.left).toBe(2.5);
  });

  it('returns null off-image', () => expect(scanSpacing({ x: 50, y: 50 }, makePixelSource(data, W, H))).toBeNull());
});
