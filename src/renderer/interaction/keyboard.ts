import { measurementText } from '../lib/format';
import {
  deleteRuler,
  nudge,
  redo,
  selectedRuler,
  toggleExtended,
  undo,
  type AppState,
  type Tool,
} from '../state';

export interface KeyboardDeps {
  getState(): AppState;
  setState(next: AppState): void;
  refreshPointer(shift: boolean, alt: boolean): void;
  cancelGesture(): void;
  close(): void;
  pin(): void;
  copy(text: string): void;
  toast(msg: string): void;
}

export function attachKeyboardHandlers(deps: KeyboardDeps): () => void {
  function setTool(st: AppState, tool: Tool): void {
    deps.setState({ ...st, tool, hover: null, spacing: null, selectedId: tool === 'ruler' ? st.selectedId : null });
  }

  function handle(ev: KeyboardEvent): void {
    const st = deps.getState();
    if (st.pinned) return;

    if (ev.key === 'Shift' || ev.key === 'Alt') {
      if (ev.key === 'Alt') ev.preventDefault(); // don't let Alt focus a (non-existent) menu
      deps.refreshPointer(ev.shiftKey, ev.altKey);
      return;
    }

    const mod = ev.ctrlKey || ev.metaKey;
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    let handled = true;

    if (mod) {
      if (key === 'z' && !ev.shiftKey) deps.setState(undo(st));
      else if (key === 'y' || (key === 'z' && ev.shiftKey)) deps.setState(redo(st));
      else if (key === 'c') copySelection(st);
      else handled = false;
      if (handled) ev.preventDefault();
      return;
    }

    const sel = selectedRuler(st);
    switch (key) {
      case 'Escape':
        if (st.helpOpen) deps.setState({ ...st, helpOpen: false });
        else if (st.gesture) deps.cancelGesture();
        else if (st.selectedId) deps.setState({ ...st, selectedId: null });
        else if (st.tool !== 'ruler') setTool(st, 'ruler');
        else deps.close();
        break;
      case 'Delete':
      case 'Backspace': {
        const id = st.selectedId ?? st.hover?.id;
        if (id) deps.setState(deleteRuler(st, id));
        break;
      }
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (!sel) break;
        const step = ev.shiftKey ? 10 : 1;
        const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
        const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
        deps.setState(nudge(st, sel.id, dx, dy));
        break;
      }
      case 'e':
        if (sel) deps.setState(toggleExtended(st, sel.id));
        break;
      case '1':
      case 'r':
        setTool(st, 'ruler');
        break;
      case '2':
      case 's':
        if (st.hasCapture) setTool(st, 'spacing');
        break;
      case 'g':
        deps.setState({ ...st, snapEdges: !st.snapEdges });
        deps.toast(st.snapEdges ? 'Edge snapping off' : 'Edge snapping on');
        break;
      case 'l':
        deps.setState({ ...st, loupeAlways: !st.loupeAlways });
        break;
      case 'u':
        if (Math.abs(st.scale - 1) >= 0.01) deps.setState({ ...st, units: st.units === 'px' ? 'physical' : 'px' });
        break;
      case 'p':
        if (st.rulers.length > 0) deps.pin();
        else deps.toast('Draw a ruler first, then pin it');
        break;
      case '?':
      case '/':
      case 'h':
      case 'F1':
        deps.setState({ ...st, helpOpen: !st.helpOpen });
        break;
      default:
        handled = false;
    }
    if (handled) ev.preventDefault();
  }

  function copySelection(st: AppState): void {
    const r = selectedRuler(st) ?? st.rulers[st.rulers.length - 1] ?? null; // default: the latest
    if (!r) {
      deps.toast('Nothing to copy yet');
      return;
    }
    const text = measurementText(r.a, r.b, st.scale, st.units);
    deps.copy(text);
    deps.toast(`Copied  ${text}`);
  }

  function handleUp(ev: KeyboardEvent): void {
    if (ev.key === 'Shift' || ev.key === 'Alt') deps.refreshPointer(ev.shiftKey, ev.altKey);
  }

  const onBlur = (): void => deps.refreshPointer(false, false);

  window.addEventListener('keydown', handle);
  window.addEventListener('keyup', handleUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', handle);
    window.removeEventListener('keyup', handleUp);
    window.removeEventListener('blur', onBlur);
  };
}
