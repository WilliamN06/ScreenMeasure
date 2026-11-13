import type { PixelSource } from '../lib/snapping';
import type { AppState } from '../state';

import type { Chrome } from './chrome';
import { renderHud, type Hud } from './hud';
import { renderScene } from './scene';
import { ensureRoot } from './svg';

export interface RenderContext {
  stage: HTMLElement;
  svg: SVGSVGElement;
  labels: HTMLElement;
  hud: Hud | null;
  chrome: Chrome | null;
}

export function createRenderContext(stage: HTMLElement, hud: Hud | null = null, chrome: Chrome | null = null): RenderContext {
  const svg = ensureRoot('overlay-svg', stage);
  let labels = document.getElementById('labels');
  if (!labels) {
    labels = document.createElement('div');
    labels.id = 'labels';
    stage.appendChild(labels);
  }
  return { stage, svg, labels, hud, chrome };
}

const CURSORS = { handle: 'move', join: 'crosshair', body: 'grab' } as const;

export function render(
  ctx: RenderContext,
  st: AppState,
  src: PixelSource | null = null,
  image: HTMLCanvasElement | null = null
): void {
  ctx.chrome?.update(st);
  renderScene(ctx.svg, ctx.labels, st, ctx.chrome?.reserved() ?? []);
  if (ctx.hud) renderHud(ctx.hud, st, src, image);

  let cursor = 'crosshair';
  if (st.gesture?.kind === 'body' && st.gesture.moved) cursor = 'grabbing';
  else if (st.gesture) cursor = 'crosshair';
  else if (st.hover && st.tool === 'ruler') cursor = CURSORS[st.hover.kind];
  ctx.stage.style.cursor = cursor;
}
