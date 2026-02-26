export type BreadCrumbItem = { text: string; to: string; current: boolean };

const breadCrumbLabels: Record<string, string> = {
  __root__: 'Accueil',
  '/accessibilite': 'Accessibilité',
  '/mentions-legales': 'Mentions légales',
  '/donnees-personnelles': 'Données personnelles',
  '/gestion-cookies': 'Gestion des cookies',
};

export function useBreadCrumb(currentPath: string): BreadCrumbItem[] {
  const segments = currentPath.split('/').filter(Boolean);

  const items: BreadCrumbItem[] = [{ text: 'Accueil', to: '/', current: currentPath === '/' }];

  let pathAcc = '';
  for (const segment of segments) {
    pathAcc += `/${segment}`;
    items.push({
      text: breadCrumbLabels[pathAcc] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      to: pathAcc,
      current: pathAcc === currentPath,
    });
  }

  return items;
}
