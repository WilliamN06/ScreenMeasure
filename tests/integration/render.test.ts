import { beforeEach, describe, expect, it } from 'vitest';

import { createRenderContext, render } from '../../src/renderer/render/index';
import { addRuler, createInitialState } from '../../src/renderer/state';

describe('render pipeline (jsdom smoke)', () => {
  let stage: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    stage.id = 'stage';
    document.body.appendChild(stage);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
  });

  it('renders nothing for empty state without throwing', () => {
    const ctx = createRenderContext(stage);
    expect(() => render(ctx, createInitialState(800, 600))).not.toThrow();
    expect(stage.querySelectorAll('.ruler-line').length).toBe(0);
  });

  it('renders one line and one label per ruler', () => {
    const s = addRuler(createInitialState(800, 600), { x: 100, y: 100 }, { x: 300, y: 100 });
    const ctx = createRenderContext(stage);
    render(ctx, s);
    expect(stage.querySelectorAll('.ruler-line').length).toBe(1);
    const labels = stage.querySelectorAll('.ruler-label');
    expect(labels.length).toBe(1);
    expect(labels[0]!.textContent).toBe('200 px · 0°');
  });

  it('shows handles on the selected ruler', () => {
    const added = addRuler(createInitialState(800, 600), { x: 100, y: 100 }, { x: 300, y: 100 });
    const s = { ...added, selectedId: added.rulers[0]!.id };
    const ctx = createRenderContext(stage);
    render(ctx, s);
    expect(stage.querySelectorAll('.handle').length).toBe(2);
    render(ctx, { ...s, selectedId: null });
    expect(stage.querySelectorAll('.handle').length).toBe(0);
  });

  it('draws an angle where two rulers meet', () => {
    let s = addRuler(createInitialState(800, 600), { x: 100, y: 300 }, { x: 400, y: 300 });
    s = addRuler(s, { x: 100, y: 300 }, { x: 100, y: 50 });
    const ctx = createRenderContext(stage);
    render(ctx, s);
    expect(stage.querySelectorAll('.joint-arc').length).toBe(1);
    expect(stage.querySelector('.angle-label')!.textContent).toBe('90°');
  });

  it('crossing (not touching) rulers do not clutter the screen with angles', () => {
    let s = addRuler(createInitialState(800, 600), { x: 100, y: 300 }, { x: 700, y: 300 });
    s = addRuler(s, { x: 400, y: 100 }, { x: 400, y: 500 });
    const ctx = createRenderContext(stage);
    render(ctx, s);
    expect(stage.querySelectorAll('.joint-arc').length).toBe(0);
  });

  it('shows the live ruler while drawing', () => {
    const s = createInitialState(800, 600);
    const ctx = createRenderContext(stage);
    render(ctx, {
      ...s,
      gesture: { kind: 'create', start: { x: 10, y: 10 }, startSnap: 'none', current: { x: 110, y: 10 }, snap: 'edge' },
    });
    expect(stage.querySelectorAll('.ruler-line').length).toBe(1);
    expect(stage.querySelectorAll('.snap-mark').length).toBe(1);
  });
});
