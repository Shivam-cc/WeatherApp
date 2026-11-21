// Remembers the last focused element outside dialogs so closing a dialog can put focus back.
let last: HTMLElement | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest('[role=dialog]')) last = t;
  });
}

/** Keeps Tab / Shift+Tab inside `root`: wraps at the first and last focusable instead of leaving the dialog. */
export function trapTab(e: KeyboardEvent, root: HTMLElement) {
  if (e.key !== 'Tab') return;
  const stops = root.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
  const [first, last] = [stops[0], stops[stops.length - 1]];
  if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
  else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
}

export function restoreFocus() {
  if (last?.isConnected) last.focus();
}
