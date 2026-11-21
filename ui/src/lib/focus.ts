// Remembers the last focused element outside dialogs so closing a dialog can put focus back.
let last: HTMLElement | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest('[role=dialog]')) last = t;
  });
}

export function restoreFocus() {
  if (last?.isConnected) last.focus();
}
