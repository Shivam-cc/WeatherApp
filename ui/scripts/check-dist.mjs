// Post-build guard: the release CSP has font-src 'self', so a font inlined as a data: URI would be blocked in the shipped app.
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../dist/assets/', import.meta.url);
const bad = readdirSync(dir).filter((f) => f.endsWith('.css') && /data:(application|font)\/[^"')]*(woff|ttf|otf)/i.test(readFileSync(new URL(f, dir), 'utf8')));
if (bad.length) {
  console.error(`Inlined font data: URI in ${bad.join(', ')}; the CSP (font-src 'self') would block it. Keep build.assetsInlineLimit at 0.`);
  process.exit(1);
}
console.log('dist check: no inlined fonts');
