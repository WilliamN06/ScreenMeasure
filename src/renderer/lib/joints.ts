import { distance, samePoint } from './geometry';
import type { Point, Ruler } from './types';

/**
 * The protractor. Whenever rulers share an endpoint (the endpoint magnet makes this easy:
 * start a new ruler on the end of an existing one), the angle between them is shown at the
 * vertex. This replaces the old auto-intersections of *extended* lines, which put diamonds
 * all over the screen and only revealed an angle on hover.
 */
export interface JointAngle {
  key: string;
  vertex: Point;
  /** Screen-space direction (radians, y-down, as atan2 returns) where the arc starts. */
  start: number;
  /** Arc sweep in radians, clockwise on screen, 0 < sweep <= π. */
  sweep: number;
  degrees: number;
  radius: number;
  colorIndex: number;
}

interface Ray {
  dir: number;
  length: number;
  colorIndex: number;
  id: string;
}

const TWO_PI = Math.PI * 2;

export function computeJoints(rulers: Ruler[]): JointAngle[] {
  const clusters: { vertex: Point; rays: Ray[] }[] = [];
  for (const r of rulers) {
    for (const [p, other] of [
      [r.a, r.b],
      [r.b, r.a],
    ] as const) {
      const length = distance(p, other);
      if (length < 1) continue;
      let dir = Math.atan2(other.y - p.y, other.x - p.x);
      if (dir < 0) dir += TWO_PI;
      const ray: Ray = { dir, length, colorIndex: r.colorIndex, id: r.id };
      const cluster = clusters.find((c) => samePoint(c.vertex, p));
      if (cluster) cluster.rays.push(ray);
      else clusters.push({ vertex: p, rays: [ray] });
    }
  }

  const out: JointAngle[] = [];
  for (const { vertex, rays } of clusters) {
    if (rays.length < 2) continue;
    rays.sort((m, n) => m.dir - n.dir);
    const shortest = Math.min(...rays.map((r) => r.length));
    const radius = Math.max(12, Math.min(36, shortest * 0.4));
    for (let i = 0; i < rays.length; i++) {
      // With 2 rays only the inside angle matters (the other one is 360° minus it).
      if (rays.length === 2 && i === 1) break;
      const from = rays[i]!;
      const to = rays[(i + 1) % rays.length]!;
      let sweep = to.dir - from.dir;
      if (sweep <= 0) sweep += TWO_PI;
      let start = from.dir;
      if (sweep > Math.PI + 1e-9) {
        if (rays.length > 2) continue; // reflex gap between neighbours: not an angle anyone wants
        start = to.dir;
        sweep = TWO_PI - sweep;
      }
      out.push({
        key: `${from.id}>${to.id}@${Math.round(vertex.x)},${Math.round(vertex.y)}`,
        vertex,
        start,
        sweep,
        degrees: (sweep * 180) / Math.PI,
        radius,
        colorIndex: to.colorIndex,
      });
    }
  }
  return out;
}

/** SVG path for a joint's arc. */
export function arcPath(j: JointAngle): string {
  const { vertex: v, start, sweep, radius: r } = j;
  const x1 = v.x + Math.cos(start) * r;
  const y1 = v.y + Math.sin(start) * r;
  const x2 = v.x + Math.cos(start + sweep) * r;
  const y2 = v.y + Math.sin(start + sweep) * r;
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

/** Where the joint's degree label goes: just outside the arc, on its bisector. */
export function arcLabelAnchor(j: JointAngle, gap = 14): Point {
  const mid = j.start + j.sweep / 2;
  return { x: j.vertex.x + Math.cos(mid) * (j.radius + gap), y: j.vertex.y + Math.sin(mid) * (j.radius + gap) };
}
