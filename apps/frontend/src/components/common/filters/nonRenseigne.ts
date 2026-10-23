import { FILTRE_NON_RENSEIGNE, FILTRE_NON_RENSEIGNE_LABEL } from '@sirena/common/constants';

type Option = {
  value: string;
  label: string;
};

/**
 * Faut-il proposer « Non renseigné » ?
 *
 * `counts` est l'effectif par valeur renvoyé par le backend, quand le filtre en dispose. Il porte
 * aussi l'effectif de la sentinelle, ce qui permet de n'offrir l'option que s'il existe
 * réellement des données dont le champ n'est pas renseigné (CA1).
 *
 * `null`/`undefined` signifie « effectifs inconnus » — le cas des filtres du tableau de bord, dont
 * les cartes Metabase ne remontent pas d'effectif par valeur. On propose alors l'option : la
 * masquer rendrait ces données définitivement inatteignables, alors que l'offrir au pire aboutit à
 * une sélection vide, comme n'importe quelle autre valeur sans occurrence.
 *
 * `selectedValues` lève la même impasse à effectif connu : les effectifs dépendent de la recherche
 * et du périmètre, donc celui de la sentinelle peut tomber à zéro alors qu'elle est cochée. Masquer
 * l'option retirerait la seule case permettant de la décocher, laissant un filtre actif que rien ne
 * peut plus lever. Une valeur sélectionnée reste donc toujours proposée.
 */
export const shouldOfferNonRenseigne = (counts?: Record<string, number> | null, selectedValues?: string[]): boolean =>
  counts == null || (counts[FILTRE_NON_RENSEIGNE] ?? 0) > 0 || selectedValues?.includes(FILTRE_NON_RENSEIGNE) === true;

const withCount = (label: string, count?: number) => (count === undefined ? label : `${label} (${count})`);

export const nonRenseigneOption = (counts?: Record<string, number> | null): Option => ({
  value: FILTRE_NON_RENSEIGNE,
  label: withCount(FILTRE_NON_RENSEIGNE_LABEL, counts?.[FILTRE_NON_RENSEIGNE]),
});

/**
 * Place « Non renseigné » en tête de la liste des valeurs d'un filtre multi-sélection (CA1).
 *
 * Générique à dessein : tout filtre de ce type l'applique en enveloppant ses options, sans
 * réimplémenter la règle (CA5).
 */
export const withNonRenseigneOption = <T extends Option>(
  options: T[],
  counts?: Record<string, number> | null,
  selectedValues?: string[],
): (T | Option)[] =>
  shouldOfferNonRenseigne(counts, selectedValues) ? [nonRenseigneOption(counts), ...options] : options;
