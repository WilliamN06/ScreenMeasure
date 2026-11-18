// Renders assets/icon.svg into the PNG / ICO files the app and installer use.
// Run with: npm run icons
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const svg = readFileSync(join(assets, 'icon.svg'), 'utf8');

const render = (size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

// ICO with embedded PNGs (supported since Windows Vista).
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

writeFileSync(join(assets, 'icon.png'), render(512));
writeFileSync(join(assets, 'icon.ico'), ico([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: render(size) }))));
// Tray: Windows shows it at 16–32 px; a larger source keeps it crisp on scaled displays.
writeFileSync(join(assets, 'tray.png'), render(32));
writeFileSync(join(assets, 'tray@2x.png'), render(64));
console.log('icons written to', assets);
