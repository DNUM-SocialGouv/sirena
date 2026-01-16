import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import {
  MIS_EN_CAUSE_TYPE,
  type MisEnCauseType,
  MOTIFS_HIERARCHICAL_DATA,
  misEnCauseTypeLabels,
} from '@sirena/common/constants';
import { valueToLabel } from '@sirena/common/utils';
import type { ReactNode } from 'react';
import type { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';

type RequeteEntiteRow = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number];

/**
 * Extracts the parent label (first level) of a motif from its hierarchical ID
 */
const getParentLabel = (motifId: string | undefined): { label: string | null; isMaltraitance: boolean } => {
  if (!motifId) return { label: null, isMaltraitance: false };
  const parts = motifId.split('/');
  if (parts.length !== 2) return { label: null, isMaltraitance: false };

  const [parentValue] = parts;
  const parent = MOTIFS_HIERARCHICAL_DATA.find((p) => p.value === parentValue);
  if (!parent) return { label: null, isMaltraitance: false };

  // If it's "Maltraitance professionnels ou entourage", return null for the label
  // because we'll display the "Maltraitance" tag at the beginning of the line instead
  if (parentValue === 'MALTRAITANCE_PROFESSIONNELS_ENTOURAGE') {
    return { label: null, isMaltraitance: true };
  }

  return { label: parent.label, isMaltraitance: false };
};

/**
 * Renders the "Motifs" cell for a "requête" row
 */
export function renderMotifsCell(row: RequeteEntiteRow): ReactNode {
  const requete = row.requete;

  // Check if the "requête" comes from demat.social
  const isFromDematSocial = requete.dematSocialId != null;

  const situations = requete.situations || [];

  // Collect all "motifs qualifiés" from all "situations" and all "faits"
  const motifsQualifies: Array<{ motifId?: string; motif?: { id?: string; label?: string } }> = [];
  // Collect all "motifs déclaratifs" from all "situations" and all "faits"
  const motifsDeclaratifs: Array<{
    motifDeclaratifId?: string;
    motifDeclaratif?: { id?: string; label?: string };
  }> = [];
  // Check if at least one "fait" has a "yes" answer to the "maltraitance" question
  let hasMaltraitanceAnswer = false;

  situations.forEach((situation) => {
    const faits = situation?.faits || [];
    faits.forEach((fait) => {
      // Collect "motifs qualifiés"
      if (fait?.motifs) {
        motifsQualifies.push(...fait.motifs);
      }
      // Collect "motifs déclaratifs"
      if (fait?.motifsDeclaratifs) {
        motifsDeclaratifs.push(...fait.motifsDeclaratifs);
      }
      // Check if the user answered yes to the "maltraitance" question
      // (exclude "NON" and "NE_SAIS_PAS" which are negative answers)
      const maltraitanceTypes = fait?.maltraitanceTypes || [];
      if (
        maltraitanceTypes.length > 0 &&
        maltraitanceTypes.some(
          (type) => type?.maltraitanceTypeId !== 'NON' && type?.maltraitanceTypeId !== 'NE_SAIS_PAS',
        )
      ) {
        hasMaltraitanceAnswer = true;
      }
    });
  });

  // Collect unique motifs (without duplicates)
  const motifItems = new Set<string>();
  let showMaltraitanceBadge = false;

  // If "motifs qualifiés" exist, use the same rules for "requêtes manuelles" and demat.social
  if (motifsQualifies.length > 0) {
    motifsQualifies.forEach((motif) => {
      const { label, isMaltraitance } = getParentLabel(motif?.motif?.id || motif?.motifId);
      if (isMaltraitance) {
        showMaltraitanceBadge = true;
      } else if (label) {
        motifItems.add(label);
      }
    });
  }
  // Otherwise, if it's a demat.social "requête", use "motifs déclaratifs"
  else if (isFromDematSocial && motifsDeclaratifs.length > 0) {
    motifsDeclaratifs.forEach((motifDeclaratif) => {
      const label = motifDeclaratif?.motifDeclaratif?.label || '';
      if (label) {
        motifItems.add(valueToLabel(label) || label);
      }
    });
    // Display the "Maltraitance" tag if the user answered yes
    if (hasMaltraitanceAnswer) {
      showMaltraitanceBadge = true;
    }
  }

  // If no motif, display nothing
  if (motifItems.size === 0 && !showMaltraitanceBadge) {
    return '-';
  }

  const itemsArray = Array.from(motifItems);

  return (
    <>
      {showMaltraitanceBadge && (
        <div>
          <Badge noIcon className={fr.cx('fr-badge--purple-glycine')}>
            Maltraitance
          </Badge>
        </div>
      )}
      {itemsArray.length > 0 && (
        <span className={showMaltraitanceBadge ? 'fr-mt-1w' : ''}>{itemsArray.join(',\u00A0')}</span>
      )}
    </>
  );
}

/**
 * Renders the "Mis en cause" cell for a "requête" row
 *
 * Rules:
 * - PROFESSIONNEL_SANTE with identity (commentaire field) → display the identity
 * - ETABLISSEMENT with name (finess, lieuPrecision or adresse.label) → display the establishment name
 * - Otherwise → display type precision (2nd level) if available, otherwise type (1st level)
 * - No duplicates
 * - Display mis en cause from all situations
 */
export function renderMisEnCauseCell(row: RequeteEntiteRow): ReactNode {
  const requete = row.requete;
  const situations = requete.situations || [];

  const misEnCauseItems = new Set<string>();

  situations.forEach((situation) => {
    const { misEnCause, lieuDeSurvenue } = situation;

    const misEnCauseTypeId =
      (misEnCause?.misEnCauseType?.id as MisEnCauseType | undefined) ||
      (misEnCause?.misEnCauseTypeId as MisEnCauseType | undefined);

    if (!misEnCauseTypeId) {
      return;
    }

    const misEnCauseTypeLabel =
      misEnCause?.misEnCauseType?.label ||
      (misEnCauseTypeId in misEnCauseTypeLabels ? misEnCauseTypeLabels[misEnCauseTypeId] : undefined) ||
      misEnCauseTypeId;

    const precisionLabel = misEnCause?.misEnCauseTypePrecision?.label;

    // PROFESSIONNEL_SANTE: display identity if available (stored in commentaire field)
    if (misEnCauseTypeId === MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE) {
      const identite = misEnCause?.commentaire?.trim();
      if (identite) {
        misEnCauseItems.add(identite);
      } else {
        misEnCauseItems.add(precisionLabel || misEnCauseTypeLabel);
      }
    }
    // ETABLISSEMENT: display establishment name from lieuDeSurvenue if available
    else if (misEnCauseTypeId === MIS_EN_CAUSE_TYPE.ETABLISSEMENT) {
      const etablissementName =
        lieuDeSurvenue?.finess || lieuDeSurvenue?.lieuPrecision || lieuDeSurvenue?.adresse?.label || null;

      if (etablissementName) {
        misEnCauseItems.add(etablissementName);
      } else {
        misEnCauseItems.add(precisionLabel || misEnCauseTypeLabel);
      }
    }
    // Other types: display precision (2nd level) if available, otherwise type (1st level)
    else {
      misEnCauseItems.add(precisionLabel || misEnCauseTypeLabel);
    }
  });

  if (misEnCauseItems.size === 0) {
    return '-';
  }

  const itemsArray = Array.from(misEnCauseItems);

  return <span>{itemsArray.join(',\u00A0')}</span>;
}

type AffectationData = {
  entiteId: string;
  entiteName: string;
  services: Array<{ id: string; name: string; parentName?: string }>;
};

function extractAffectations(row: RequeteEntiteRow, userTopEntiteId: string): AffectationData[] {
  const situations = row.requete?.situations || [];
  const affectationsMap = new Map<string, AffectationData>();

  for (const situation of situations) {
    const situationEntites = situation?.situationEntites || [];

    for (const situationEntite of situationEntites) {
      const entite = situationEntite?.entite;
      if (!entite) continue;

      const isRootEntite = entite.entiteMereId === null;

      if (isRootEntite) {
        if (entite.id !== userTopEntiteId) continue;

        if (!affectationsMap.has(entite.id)) {
          affectationsMap.set(entite.id, {
            entiteId: entite.id,
            entiteName: entite.label || entite.nomComplet,
            services: [],
          });
        }
      } else {
        let parentEntite: AffectationData | undefined;

        const parentMatch = situationEntites.find((se) => {
          const parent = se?.entite;
          return parent && parent.id === entite.entiteMereId;
        });

        const parentEntiteName = parentMatch?.entite?.label || parentMatch?.entite?.nomComplet || '';
        let grandParentName: string | undefined;

        if (parentMatch?.entite?.entiteMereId) {
          grandParentName = parentEntiteName;
        }

        let currentEntiteId: string | null = entite.entiteMereId;
        let belongsToUserEntity = false;
        const checkedIds = new Set<string>();

        while (currentEntiteId && !checkedIds.has(currentEntiteId)) {
          checkedIds.add(currentEntiteId);
          if (currentEntiteId === userTopEntiteId) {
            belongsToUserEntity = true;
            break;
          }
          const parentSe = situationEntites.find((se) => se?.entite?.id === currentEntiteId);
          currentEntiteId = parentSe?.entite?.entiteMereId || null;
        }

        if (!belongsToUserEntity) continue;

        if (!affectationsMap.has(userTopEntiteId)) {
          const userEntiteSe = situationEntites.find(
            (se) => se?.entite?.id === userTopEntiteId && se?.entite?.entiteMereId === null,
          );
          affectationsMap.set(userTopEntiteId, {
            entiteId: userTopEntiteId,
            entiteName: userEntiteSe?.entite?.label || userEntiteSe?.entite?.nomComplet || '',
            services: [],
          });
        }

        parentEntite = affectationsMap.get(userTopEntiteId);
        if (parentEntite) {
          const serviceExists = parentEntite.services.some((s) => s.id === entite.id);
          if (!serviceExists) {
            parentEntite.services.push({
              id: entite.id,
              name: entite.label || entite.nomComplet,
              parentName: grandParentName,
            });
          }
        }
      }
    }
  }

  return Array.from(affectationsMap.values());
}

function sortAffectationServices(
  services: Array<{ id: string; name: string; parentName?: string }>,
  userEntiteId?: string,
): Array<{ id: string; name: string; parentName?: string }> {
  return [...services].sort((a, b) => {
    if (userEntiteId) {
      if (a.id === userEntiteId) return -1;
      if (b.id === userEntiteId) return 1;
    }
    return a.name.localeCompare(b.name, 'fr');
  });
}

export function renderAffectationCell(
  row: RequeteEntiteRow,
  userTopEntiteId: string,
  userEntiteId?: string,
): ReactNode {
  const affectations = extractAffectations(row, userTopEntiteId);

  if (affectations.length === 0) {
    return '-';
  }

  const allItems: string[] = [];

  for (const affectation of affectations) {
    const sortedServices = sortAffectationServices(affectation.services, userEntiteId);

    if (sortedServices.length === 0) {
      allItems.push(affectation.entiteName);
    } else {
      for (const service of sortedServices) {
        allItems.push(service.parentName ? `${service.name} (${service.parentName})` : service.name);
      }
    }
  }

  if (allItems.length === 0) {
    return '-';
  }

  return <span>{allItems.join(',\u00A0')}</span>;
}
