import { FILTRE_NON_RENSEIGNE } from '../constants/filtreNonRenseigne.constant.js';

export type ValeursFiltre = {
  /** Valeurs cochées correspondant à un identifiant du référentiel, sentinelle exclue. */
  valeurs: string[];
  /** `true` si « Non renseigné » est coché. */
  nonRenseigne: boolean;
};

/**
 * Sépare la sentinelle « Non renseigné » des valeurs de référentiel d'un filtre multi-sélection.
 *
 * C'est le point d'entrée unique côté front comme côté back : le filtrage se construit ensuite
 * en OU entre les valeurs de référentiel et, si la sentinelle est cochée, les données dont le
 * champ n'est pas renseigné. Tout coché (sentinelle incluse) couvre donc l'ensemble des données,
 * et rien de coché ne restreint rien — l'appelant ne transmet alors aucun filtre.
 */
export const separerNonRenseigne = (values: readonly string[]): ValeursFiltre => ({
  valeurs: values.filter((value) => value !== FILTRE_NON_RENSEIGNE),
  nonRenseigne: values.includes(FILTRE_NON_RENSEIGNE),
});

export const estNonRenseigne = (value: string): boolean => value === FILTRE_NON_RENSEIGNE;
