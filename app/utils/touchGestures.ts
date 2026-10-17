const INTERACTIVE_SELECTOR = 'input, textarea, select, button, a, label, nav, [href], [role="button"], [data-no-tab-swipe]'

function isInteractiveElement(element: Element): boolean {
  return Boolean(element.closest(INTERACTIVE_SELECTOR))
}

export function shouldIgnoreTabGestureTarget(event: TouchEvent | Event): boolean {
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    for (const node of event.composedPath()) {
      if (node instanceof Element && isInteractiveElement(node)) {
        return true
      }
    }
    return false
  }
  if (event.target instanceof Element) {
    return isInteractiveElement(event.target)
  }
  return false
}
