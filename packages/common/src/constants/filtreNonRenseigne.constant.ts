// Valeur sentinelle des filtres multi-sélection représentant « le champ filtré n'est pas
// renseigné ». Elle voyage comme n'importe quelle autre valeur cochée : dans l'URL
// (`?domaineIds=SOCIAL,NON_RENSEIGNE`), dans la query de l'API, puis jusqu'au filtrage (clause
// Prisma ou paramètre Metabase). Un seul jeton partagé évite d'inventer une convention par
// filtre et rend le comportement automatique pour les filtres à venir.
//
// Le jeton doit rester distinct de tout identifiant de référentiel filtrable, sans quoi une
// valeur réelle serait interprétée comme « non renseigné » : un test le vérifie pour les
// référentiels concernés.
export const FILTRE_NON_RENSEIGNE = 'NON_RENSEIGNE';

export const FILTRE_NON_RENSEIGNE_LABEL = 'Non renseigné';
