import { describe, expect, it } from 'vitest';
import { EDGE_THRESHOLD, makePixelSource, resolvePoint, snapPoint } from '../../src/renderer/lib/snapping';

function sourceFromRows(rows: string[]): ReturnType<typeof makePixelSource> {
  const height = rows.length;
  const width = rows[0]!.length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y]![x]!;
      const v = ch === '#' ? 255 : 0;
      const i = (y * width + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return makePixelSource(data, width, height);
}

describe('makePixelSource', () => {
  it('returns null out of bounds', () => {
    const src = sourceFromRows(['..', '..']);
    expect(src.getPixel(-1, 0)).toBeNull();
    expect(src.getPixel(0, -1)).toBeNull();
    expect(src.getPixel(2, 0)).toBeNull();
  });
  it('reads pixel values', () => {
    const src = sourceFromRows(['.#', '..']);
    expect(src.getPixel(0, 0)).toEqual([0, 0, 0]);
    expect(src.getPixel(1, 0)).toEqual([255, 255, 255]);
  });
});

describe('snapPoint', () => {
  const verticalEdge = [
    '....#....',
    '....#....',
    '....#....',
    '....#....',
    '....#....',
    '....#....',
    '....#....',
    '....#....',
    '....#....',
  ];

  it('snaps near a vertical edge (within 1px of the true edge)', () => {
    // Edge is at x=4 (single white column). The gradient peak can land on
    // either side of the column (x=3 or x=4), so accept either.
    const src = sourceFromRows(verticalEdge);
    const r = snapPoint({ x: 3, y: 4 }, src, 4);
    expect(r.snapped).toBe(true);
    expect(r.orientation).toBe('vertical');
    expect(Math.abs(r.point.x - 4)).toBeLessThanOrEqual(1);
    expect(r.point.y).toBe(4);
  });

  it('does not snap in uniform region', () => {
    const src = sourceFromRows(['.........', '.........', '.........', '.........', '.........']);
    const r = snapPoint({ x: 4, y: 4 }, src, 4);
    expect(r.snapped).toBe(false);
    expect(r.point).toEqual({ x: 4, y: 4 });
  });

  const horizontalEdge = [
    '.........',
    '.........',
    '.........',
    '.........',
    '#########',
    '.........',
    '.........',
    '.........',
    '.........',
  ];

  it('snaps near a horizontal edge (within 1px of the true edge)', () => {
    // Edge is at y=4. Gradient peak may land on y=3 or y=4.
    const src = sourceFromRows(horizontalEdge);
    const r = snapPoint({ x: 4, y: 3 }, src, 3);
    expect(r.snapped).toBe(true);
    expect(r.orientation).toBe('horizontal');
    expect(Math.abs(r.point.y - 4)).toBeLessThanOrEqual(1);
  });

  it('clamps threshold to the 1..12 range', () => {
    // Threshold 0 is clamped to 1 (minimum search window), so snapping
    // still happens if an edge is within 1px. This documents the contract:
    // `threshold` controls the search radius, not whether snapping is on.
    const src = sourceFromRows(verticalEdge);
    const r0 = snapPoint({ x: 3, y: 4 }, src, 0);
    expect(r0.snapped).toBe(true);

    // A far-away point with the minimum threshold finds no edge.
    const rFar = snapPoint({ x: 8, y: 8 }, src, 1);
    expect(rFar.snapped).toBe(false);
  });

  it('exposes EDGE_THRESHOLD constant', () => {
    expect(EDGE_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('resolvePoint', () => {
  const flat = sourceFromRows(Array.from({ length: 40 }, () => '.'.repeat(40)));
  const base = { anchor: null, constrain: false, edges: true, endpoints: [], src: flat };

  it('passes the raw point through when nothing is near', () => {
    expect(resolvePoint({ x: 10, y: 10 }, base)).toEqual({ point: { x: 10, y: 10 }, kind: 'none' });
  });

  it('magnetises to an existing ruler end (beats edge snapping)', () => {
    const r = resolvePoint({ x: 10, y: 10 }, { ...base, endpoints: [{ x: 14, y: 13 }] });
    expect(r).toEqual({ point: { x: 14, y: 13 }, kind: 'endpoint' });
  });

  it('Shift locks the angle relative to the anchor', () => {
    const r = resolvePoint({ x: 30, y: 12 }, { ...base, anchor: { x: 10, y: 10 }, constrain: true });
    expect(r.kind).toBe('angle');
    expect(r.point.y).toBe(10);
  });

  it('Shift + horizontal ray still snaps x to a vertical edge without breaking the angle', () => {
    const src = sourceFromRows(Array.from({ length: 20 }, () => '..........#.........'));
    const r = resolvePoint({ x: 12, y: 5.5 }, { ...base, src, anchor: { x: 2, y: 5 }, constrain: true });
    expect(r.kind).toBe('edge');
    expect(r.point.y).toBe(5);
    expect(Math.abs(r.point.x - 10)).toBeLessThanOrEqual(1);
  });

  it('edges:false (Alt held) skips edge snapping', () => {
    const r = resolvePoint({ x: 3, y: 4 }, { ...base, src: sourceFromRows(Array.from({ length: 9 }, () => '....#....')), edges: false });
    expect(r.kind).toBe('none');
  });
});

describe('snapPoint boundary precision', () => {
  // 12px wide image with a dark "button" covering pixels 3..8 (6px wide).
  const row = '...######...';
  const src = sourceFromRows(Array.from({ length: 6 }, () => row));

  it('snaps to pixel boundaries so a 6px element measures exactly 6', () => {
    const left = snapPoint({ x: 3.4, y: 2 }, src, 4).point.x;
    const right = snapPoint({ x: 8.6, y: 2 }, src, 4).point.x;
    expect(right - left).toBe(6);
  });

  it('locks both axes at a corner', () => {
    const box = sourceFromRows(['......', '......', '..####', '..####', '..####']);
    const r = snapPoint({ x: 2.3, y: 2.4 }, box, 3);
    expect(r.orientation).toBe('corner');
    expect(r.point).toEqual({ x: 2, y: 2 });
  });
});
