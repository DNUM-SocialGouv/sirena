export const getCreateEntiteTitle = (depth: number) => {
  const TITLE_SUFFIX = 'Gestion des entités - SIRENA';

  if (depth === 1) return `Créer une direction - ${TITLE_SUFFIX}`;
  if (depth === 2) return `Créer un service - ${TITLE_SUFFIX}`;
  return 'Créer une entité';
};

export function getEditEntiteTitle(nom?: string) {
  return nom ? `Modifier l’entité ${nom}` : 'Modifier une entité';
}
