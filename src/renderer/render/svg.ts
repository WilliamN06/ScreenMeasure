const NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {}
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export function ensureRoot(id: string, parent: HTMLElement): SVGSVGElement {
  let root = document.getElementById(id) as SVGSVGElement | null;
  if (!root) {
    root = svgEl('svg', { id, class: 'overlay-svg' });
    parent.appendChild(root);
  }
  const { innerWidth: w, innerHeight: h } = window;
  root.setAttribute('width', String(w));
  root.setAttribute('height', String(h));
  root.setAttribute('viewBox', `0 0 ${w} ${h}`);
  return root;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
