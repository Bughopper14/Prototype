/** Keeps an element at the same place on screen while the content around it changes height. */

function scrollParent(el: HTMLElement): HTMLElement | Window {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflowY = getComputedStyle(p).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
}

/** Position of the element before a change; pass it to restoreInView() after the change has rendered. */
export function markInView(el: HTMLElement | null): number | null {
  return el ? el.getBoundingClientRect().top : null;
}

export function restoreInView(el: HTMLElement | null, topBefore: number | null) {
  if (!el || topBefore === null) return;
  const delta = el.getBoundingClientRect().top - topBefore;
  if (Math.abs(delta) < 1) return;
  scrollParent(el).scrollBy(0, delta);
}
