// Rasterizes assets/icon.svg to assets/icon-1024.png (input for `npm run tauri icon`). Pass a size to also write a preview: node icon.mjs 32 out.png
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync(new URL('../../assets/icon.svg', import.meta.url));
const render = (width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

const [size, out] = process.argv.slice(2);
if (size) writeFileSync(out, render(Number(size)));
else writeFileSync(new URL('../../assets/icon-1024.png', import.meta.url), render(1024));
