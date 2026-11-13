import { angleText, measurementText } from '../lib/format';
import { clipLineToRect, distance } from '../lib/geometry';
import { arcLabelAnchor, arcPath, computeJoints } from '../lib/joints';
import { placeLabel } from '../lib/layout';
import { colorForIndex } from '../lib/palette';
import type { Point, Rect, Ruler } from '../lib/types';
import type { AppState } from '../state';

import { clear, svgEl } from './svg';

export const PREVIEW_ID = '__preview';

/** Rulers as they should appear right now, including the one being drawn. */
export function displayedRulers(st: AppState): Ruler[] {
  const g = st.gesture;
  if (g?.kind === 'create' && distance(g.start, g.current) >= 1) {
    return [...st.rulers, { id: PREVIEW_ID, colorIndex: st.nextColor, a: g.start, b: g.current, extended: false }];
  }
  return st.rulers;
}

function line(svg: SVGSVGElement, a: Point, b: Point, attrs: Record<string, string | number>): void {
  svg.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...attrs }));
}

/** Ruler ticks every 10 px (taller every 50 / 100), on the side away from the label. */
function drawTicks(svg: SVGSVGElement, r: Ruler, color: string, step: number): void {
  const len = distance(r.a, r.b);
  if (len < step * 2) return;
  const ux = (r.b.x - r.a.x) / len;
  const uy = (r.b.y - r.a.y) / len;
  let nx = -uy;
  let ny = ux;
  if (ny < 0 || (ny === 0 && nx < 0)) {
    nx = -nx;
    ny = -ny;
  }
  const count = Math.floor(len / step);
  const minorOk = count <= 300;
  let d = '';
  for (let i = 1; i <= count; i++) {
    const t = i * step;
    if (len - t < 2) break;
    const size = i % 10 === 0 ? 9 : i % 5 === 0 ? 6 : 3.5;
    if (size === 3.5 && !minorOk) continue;
    const x = r.a.x + ux * t;
    const y = r.a.y + uy * t;
    d += `M${x} ${y}L${x + nx * size} ${y + ny * size}`;
  }
  if (d) svg.appendChild(svgEl('path', { d, stroke: color, 'stroke-width': 1, opacity: 0.75, fill: 'none' }));
}

function endBar(svg: SVGSVGElement, p: Point, r: Ruler, color: string): void {
  const len = distance(r.a, r.b) || 1;
  const nx = -(r.b.y - r.a.y) / len;
  const ny = (r.b.x - r.a.x) / len;
  const a = { x: p.x + nx * 6, y: p.y + ny * 6 };
  const b = { x: p.x - nx * 6, y: p.y - ny * 6 };
  line(svg, a, b, { stroke: 'rgba(0,0,0,0.55)', 'stroke-width': 4, 'stroke-linecap': 'round' });
  line(svg, a, b, { stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round' });
}

function pill(container: HTMLElement, cls: string, text: string, color: string | null): HTMLElement {
  const el = document.createElement('div');
  el.className = `pill ${cls}`;
  if (color) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = color;
    el.appendChild(dot);
  }
  el.appendChild(document.createTextNode(text));
  container.appendChild(el);
  return el;
}

export function renderScene(svg: SVGSVGElement, labels: HTMLElement, st: AppState, reserved: Rect[]): void {
  clear(svg);
  labels.replaceChildren();
  const W = st.screenWidth;
  const H = st.screenHeight;
  const screenRect = { x: 0, y: 0, width: W, height: H };
  const rulers = displayedRulers(st);
  const g = st.gesture;
  const editing = !st.pinned;
  const tickStep = st.units === 'physical' ? 10 / st.scale : 10;

  // 1. Infinite guide lines (behind everything).
  for (const r of rulers) {
    if (!r.extended) continue;
    const seg = clipLineToRect(r.a, r.b, screenRect);
    if (!seg) continue;
    line(svg, seg[0], seg[1], { stroke: 'rgba(0,0,0,0.35)', 'stroke-width': 3 });
    line(svg, seg[0], seg[1], { stroke: colorForIndex(r.colorIndex), 'stroke-width': 1, 'stroke-dasharray': '8 6' });
  }

  // 2. Shift-lock guide: shows the direction the angle is locked to.
  if (editing && g && (g.kind === 'create' || g.kind === 'handle') && g.snap === 'angle') {
    const anchor = g.kind === 'create' ? g.start : g.anchor;
    const seg = clipLineToRect(anchor, g.current, screenRect);
    if (seg) line(svg, seg[0], seg[1], { stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 1, 'stroke-dasharray': '2 4' });
  }

  // 3. Rulers.
  for (const r of rulers) {
    const color = colorForIndex(r.colorIndex);
    const isSel = editing && (r.id === st.selectedId || r.id === PREVIEW_ID);
    const isHover = editing && st.hover?.id === r.id;
    line(svg, r.a, r.b, { stroke: 'rgba(0,0,0,0.5)', 'stroke-width': isSel || isHover ? 5 : 4, 'stroke-linecap': 'round' });
    line(svg, r.a, r.b, { class: 'ruler-line', stroke: color, 'stroke-width': isSel || isHover ? 2.5 : 1.75, 'stroke-linecap': 'round' });
    drawTicks(svg, r, color, tickStep);

    if (isSel) {
      for (const end of ['a', 'b'] as const) {
        const hot = st.hover?.kind === 'handle' && st.hover.id === r.id && st.hover.end === end;
        svg.appendChild(
          svgEl('circle', {
            class: 'handle',
            cx: r[end].x,
            cy: r[end].y,
            r: hot ? 7 : 5,
            fill: hot ? color : '#fff',
            stroke: hot ? '#fff' : color,
            'stroke-width': 2,
          })
        );
      }
    } else {
      endBar(svg, r.a, r, color);
      endBar(svg, r.b, r, color);
      // Hovering another ruler's end: show that a new ruler will join here.
      if (st.hover?.kind === 'join' && st.hover.id === r.id && !g) {
        const p = r[st.hover.end];
        svg.appendChild(svgEl('circle', { class: 'join-ring', cx: p.x, cy: p.y, r: 8, fill: 'none', stroke: '#fff', 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }));
      }
    }
  }

  // 4. Angles where rulers meet.
  const joints = computeJoints(rulers);
  for (const j of joints) {
    const color = colorForIndex(j.colorIndex);
    svg.appendChild(svgEl('path', { d: arcPath(j), fill: 'none', stroke: 'rgba(0,0,0,0.5)', 'stroke-width': 4 }));
    svg.appendChild(svgEl('path', { class: 'joint-arc', d: arcPath(j), fill: 'none', stroke: color, 'stroke-width': 2 }));
  }

  // 5. Snap feedback at the point being placed.
  if (editing && g && (g.kind === 'create' || g.kind === 'handle')) {
    const p = g.current;
    if (g.snap === 'edge') {
      svg.appendChild(svgEl('rect', { x: p.x - 4, y: p.y - 4, width: 8, height: 8, fill: 'none', stroke: '#000', 'stroke-width': 3 }));
      svg.appendChild(svgEl('rect', { class: 'snap-mark', x: p.x - 4, y: p.y - 4, width: 8, height: 8, fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }));
    } else if (g.snap === 'endpoint') {
      svg.appendChild(svgEl('circle', { class: 'snap-mark', cx: p.x, cy: p.y, r: 10, fill: 'none', stroke: '#fff', 'stroke-width': 2 }));
    }
  }

  // 6. Spacing tool.
  const sp = editing && st.tool === 'spacing' ? st.spacing : null;
  if (sp) {
    const { origin: o } = sp;
    const hA = { x: sp.left, y: o.y };
    const hB = { x: sp.right, y: o.y };
    const vA = { x: o.x, y: sp.top };
    const vB = { x: o.x, y: sp.bottom };
    for (const [a, b] of [
      [hA, hB],
      [vA, vB],
    ] as const) {
      line(svg, a, b, { stroke: 'rgba(0,0,0,0.5)', 'stroke-width': 3.5 });
      line(svg, a, b, { class: 'spacing-line', stroke: '#FFD60A', 'stroke-width': 1.5 });
    }
    for (const [p, horiz] of [
      [hA, true],
      [hB, true],
      [vA, false],
      [vB, false],
    ] as const) {
      const a = horiz ? { x: p.x, y: p.y - 6 } : { x: p.x - 6, y: p.y };
      const b = horiz ? { x: p.x, y: p.y + 6 } : { x: p.x + 6, y: p.y };
      line(svg, a, b, { stroke: '#FFD60A', 'stroke-width': 1.5 });
    }
  }

  // 7. Labels (HTML, so text stays crisp and is easy to style).
  const occupied: Rect[] = [...reserved];
  const avoid = rulers.flatMap((r) => [r.a, r.b]);
  for (const r of rulers) {
    const color = colorForIndex(r.colorIndex);
    const el = pill(labels, 'ruler-label', measurementText(r.a, r.b, st.scale, st.units), color);
    if (editing && (r.id === st.selectedId || r.id === PREVIEW_ID)) el.classList.add('selected');
    const w = el.offsetWidth || 120;
    const h = el.offsetHeight || 22;
    const pos = placeLabel({ a: r.a, b: r.b, labelWidth: w, labelHeight: h, screenWidth: W, screenHeight: H, occupied, avoid });
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    occupied.push({ x: pos.x, y: pos.y, width: w, height: h });
  }
  for (const j of joints) {
    const el = pill(labels, 'angle-label', angleText(j.degrees), null);
    el.style.color = colorForIndex(j.colorIndex);
    const at = arcLabelAnchor(j, 16);
    const w = el.offsetWidth || 48;
    const h = el.offsetHeight || 22;
    el.style.left = `${Math.max(4, Math.min(W - w - 4, at.x - w / 2))}px`;
    el.style.top = `${Math.max(4, Math.min(H - h - 4, at.y - h / 2))}px`;
  }
  if (sp) {
    const w = sp.right - sp.left;
    const h = sp.bottom - sp.top;
    const k = st.units === 'physical' ? st.scale : 1;
    const el = pill(labels, 'spacing-label', `${fmtInt(w * k)} × ${fmtInt(h * k)}`, '#FFD60A');
    el.style.left = `${Math.min(W - 140, sp.origin.x + 10)}px`;
    el.style.top = `${Math.max(4, sp.origin.y - 30)}px`;
  }
}

function fmtInt(n: number): string {
  return String(Math.round(n * 10) / 10);
}
