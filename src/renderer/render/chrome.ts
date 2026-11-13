import type { Rect } from '../lib/types';
import type { AppState, Tool } from '../state';

/** Everything that isn't a measurement: toolbar, contextual hint, help sheet, pinned chip, toast. */
export interface ChromeActions {
  setTool(t: Tool): void;
  toggleSnap(): void;
  toggleLoupe(): void;
  toggleUnits(): void;
  undo(): void;
  clear(): void;
  pin(): void;
  unpin(): void;
  toggleHelp(): void;
  close(): void;
  setInteractive(on: boolean): void;
}

const ICONS = {
  ruler:
    '<svg viewBox="0 0 24 24"><path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/></svg>',
  spacing:
    '<svg viewBox="0 0 24 24"><path d="M4 4v16M20 4v16M7 12h10M7 12l3-3M7 12l3 3M17 12l-3-3M17 12l-3 3"/></svg>',
  snap: '<svg viewBox="0 0 24 24"><path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 8h4M14 8h4"/></svg>',
  loupe: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M10 7v6M7 10h6"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  clear: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M9 4h6l-1 6 4 4H6l4-4zM12 14v7"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

export interface Chrome {
  update(st: AppState): void;
  toast(msg: string): void;
  /** Screen areas labels should keep clear of. */
  reserved(): Rect[];
  toolbar: HTMLElement;
}

export function createChrome(parent: HTMLElement, actions: ChromeActions, mod: string): Chrome {
  const frame = div('frame');
  const hint = div('hint');
  const toast = div('toast');
  const toolbar = div('toolbar');
  toolbar.setAttribute('role', 'toolbar');

  const btn = (key: keyof typeof ICONS, label: string, tip: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.action = key;
    b.title = tip;
    b.setAttribute('aria-label', tip);
    b.innerHTML = `${ICONS[key]}<span>${label}</span>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  };
  const sep = (): HTMLElement => div('sep');

  const bRuler = btn('ruler', 'Ruler', 'Ruler — drag to measure length & angle (1)', () => actions.setTool('ruler'));
  const bSpacing = btn('spacing', 'Spacing', 'Spacing — hover to measure gaps & elements (2)', () => actions.setTool('spacing'));
  const bSnap = btn('snap', 'Snap', 'Snap to edges (G) — hold Alt to bypass', actions.toggleSnap);
  const bLoupe = btn('loupe', 'Loupe', 'Always show the pixel loupe (L)', actions.toggleLoupe);
  const bUnits = document.createElement('button');
  bUnits.type = 'button';
  bUnits.className = 'units';
  bUnits.title = 'Switch between screen px and physical px (U)';
  bUnits.addEventListener('click', (e) => {
    e.stopPropagation();
    actions.toggleUnits();
  });
  const bUndo = btn('undo', '', `Undo (${mod}+Z)`, actions.undo);
  const bClear = btn('clear', '', 'Clear all rulers', actions.clear);
  const bPin = btn('pin', 'Pin', 'Pin rulers on screen and draw underneath (P)', actions.pin);
  const bHelp = btn('help', '', 'Shortcuts (?)', actions.toggleHelp);
  const bClose = btn('close', '', 'Close (Esc)', actions.close);
  toolbar.append(bRuler, bSpacing, sep(), bSnap, bLoupe, bUnits, sep(), bUndo, bClear, sep(), bPin, bHelp, bClose);

  const chip = div('pinned-chip');
  chip.innerHTML = `${ICONS.pin}<span>Pinned — click to edit</span><kbd>${mod}+Shift+M</kbd>`;
  chip.addEventListener('mouseenter', () => actions.setInteractive(true));
  chip.addEventListener('mouseleave', () => actions.setInteractive(false));
  chip.addEventListener('click', () => actions.unpin());

  const help = div('help');
  help.innerHTML = helpHtml(mod);
  help.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    actions.toggleHelp();
  });

  parent.append(frame, hint, toast, toolbar, chip, help);

  let toastTimer = 0;
  return {
    toolbar,
    toast(msg) {
      toast.textContent = msg;
      toast.classList.add('visible');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1400);
    },
    reserved() {
      if (toolbar.offsetParent === null) return [];
      const r = toolbar.getBoundingClientRect();
      return [{ x: r.left - 8, y: r.top - 40, width: r.width + 16, height: r.height + 48 }];
    },
    update(st) {
      document.body.classList.toggle('pinned', st.pinned);
      bRuler.classList.toggle('active', st.tool === 'ruler');
      bSpacing.classList.toggle('active', st.tool === 'spacing');
      bSpacing.disabled = !st.hasCapture;
      bSnap.classList.toggle('active', st.snapEdges);
      bSnap.disabled = !st.hasCapture;
      bLoupe.classList.toggle('active', st.loupeAlways);
      bLoupe.disabled = !st.hasCapture;
      bUnits.hidden = Math.abs(st.scale - 1) < 0.01;
      bUnits.textContent = st.units === 'px' ? 'px' : `phys px ×${st.scale}`;
      bUndo.disabled = st.past.length === 0;
      bClear.disabled = st.rulers.length === 0;
      bPin.disabled = st.rulers.length === 0;
      help.classList.toggle('visible', st.helpOpen);

      // Get out of the way while the user is drawing near the toolbar.
      const c = st.cursor;
      let dodge = false;
      if (st.gesture && c) {
        const r = toolbar.getBoundingClientRect();
        dodge = c.x > r.left - 60 && c.x < r.right + 60 && c.y > r.top - 60 && c.y < r.bottom + 60;
      }
      toolbar.classList.toggle('dodge', dodge);
      hint.classList.toggle('dodge', dodge);

      const text = hintText(st, mod);
      hint.textContent = text;
      hint.classList.toggle('visible', text !== '' && !st.gesture);
    },
  };
}

function hintText(st: AppState, mod: string): string {
  if (st.pinned || st.helpOpen) return '';
  if (st.tool === 'spacing') return 'Hover a gap or element to see its size  ·  Click to keep it as rulers  ·  1 for the Ruler';
  if (st.selectedId) return `Drag ends to adjust  ·  Arrows nudge  ·  E extend line  ·  Del delete  ·  ${mod}+C copy`;
  if (st.rulers.length === 0) {
    const restore = st.past.length > 0 ? `  ·  ${mod}+Z brings back your last rulers` : '';
    return `Drag anywhere to measure  ·  Hold Shift for 15° steps${restore}  ·  Esc closes`;
  }
  return 'Start on a ruler’s end to measure an angle  ·  Click a ruler to adjust it  ·  P pins rulers while you draw';
}

function helpHtml(mod: string): string {
  const rows: [string, string][] = [
    ['Drag', 'Draw a ruler (length + angle)'],
    ['Shift', 'Lock angle to 15° steps / move straight'],
    ['Alt', 'Hold to ignore edge snapping'],
    ['Click a ruler', 'Select it — then drag its ends to adjust'],
    ['Start on an end', 'Draw from a ruler’s end → the angle appears'],
    ['Drag a line', 'Move the ruler'],
    ['Double-click', 'Extend into an infinite guide line (E)'],
    ['Right-click', 'Delete a ruler (Del)'],
    ['Arrows', 'Nudge selected ruler 1 px (Shift: 10 px)'],
    [`${mod}+C`, 'Copy the selected measurement'],
    [`${mod}+Z / ${mod}+Y`, 'Undo / redo'],
    ['1 / 2', 'Ruler / Spacing tool'],
    ['G · L · U', 'Snap · Loupe · Units'],
    ['P', 'Pin rulers on screen — draw underneath them'],
    [`${mod}+Shift+M`, 'Open / close from anywhere'],
    ['Esc', 'Cancel → deselect → close'],
  ];
  return (
    `<div class="help-card"><h2>ScreenMeasure</h2><dl>` +
    rows.map(([k, v]) => `<dt><kbd>${k}</kbd></dt><dd>${v}</dd>`).join('') +
    `</dl><p>Click anywhere to close</p></div>`
  );
}

function div(id: string): HTMLDivElement {
  const el = document.createElement('div');
  el.id = id;
  return el;
}
