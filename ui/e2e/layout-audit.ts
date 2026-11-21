// In-page check: every element inside the band, hero and time panels sits fully inside its container and the
// viewport, and no container clips content vertically. The hourly strip scrolls sideways by design, so
// horizontal containment is skipped for things inside it.
export function audit() {
  const vw = innerWidth;
  const vh = innerHeight;
  const out: string[] = [];
  const name = (e: Element) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''}`;
  const inside = (r: DOMRect, b: { left: number; right: number; top: number; bottom: number }, x: boolean) =>
    r.top >= b.top - 1 && r.bottom <= b.bottom + 1 && (!x || (r.left >= b.left - 1 && r.right <= b.right + 1));
  for (const sel of ['.band', '.hero', '.time']) {
    const root = document.querySelector<HTMLElement>(sel)!;
    const rr = root.getBoundingClientRect();
    if (!inside(rr, { left: 0, right: vw, top: 0, bottom: vh }, true)) out.push(`${sel} outside viewport (bottom ${Math.round(rr.bottom)} > ${vh})`);
    for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
      if (el.closest('.sr-only, .strip')) continue; // odometer digit strips are clipped by their .d window on purpose
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const x = !el.closest('[aria-label="Hourly forecast"]');
      if (!inside(r, rr, x)) out.push(`${name(el)} leaves ${sel} by ${Math.round(Math.max(r.bottom - rr.bottom, rr.top - r.top))}px`);
      if (!inside(r, { left: 0, right: vw, top: 0, bottom: vh }, x)) out.push(`${name(el)} leaves viewport (bottom ${Math.round(r.bottom)} > ${vh})`);
      const cs = getComputedStyle(el);
      if (cs.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1 && !el.matches('.d'))
        out.push(`${name(el)} clips ${el.scrollHeight - el.clientHeight}px`);
    }
  }
  // The hero and time panels must also end above the band, not just inside the window.
  const bandTop = document.querySelector('.band')!.getBoundingClientRect().top;
  for (const sel of ['.hero', '.time']) {
    const b = document.querySelector(sel)!.getBoundingClientRect().bottom;
    if (b > bandTop + 1) out.push(`${sel} overlaps the band by ${Math.round(b - bandTop)}px`);
  }
  return [...new Set(out)];
}

