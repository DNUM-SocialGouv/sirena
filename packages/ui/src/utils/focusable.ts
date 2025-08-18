const FOCUSABLE_SEL = [
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'iframe:not([tabindex="-1"])',
  '[contenteditable=""], [contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isVisible = (el: HTMLElement) => {
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  if (el.hasAttribute('hidden')) return false;
  if (el.closest('[aria-hidden="true"],[inert],fieldset[disabled]')) return false;
  if (el.getClientRects().length === 0) return false;
  return true;
};

const isTabbable = (el: HTMLElement) => {
  if ('disabled' in el && typeof el.disabled === 'boolean' && el.disabled) return false;
  const tiAttr = el.getAttribute('tabindex');
  if (tiAttr !== null && Number(tiAttr) < 0) return false;
  return el.tabIndex >= 0;
};

export const getFocusable = (root: HTMLElement) => {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)).filter(
    (el) => isVisible(el) && isTabbable(el),
  );
  if (root.matches(FOCUSABLE_SEL) && isVisible(root) && isTabbable(root)) {
    nodes.unshift(root);
  }
  return nodes;
};
