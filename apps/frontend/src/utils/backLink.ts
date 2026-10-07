/**
 * Active options for links that navigate back to a previous page, such as "retour" and "Annuler" links.
 *
 * By default TanStack Router flags a link as active when it targets a parent of the
 * current path, and then adds `aria-current="page"` (it cannot be overridden by props).
 * Such a link never targets the current page, so it must only match exactly (RGAA 6.1).
 */
export const BACK_LINK_ACTIVE_OPTIONS = { exact: true } as const;
