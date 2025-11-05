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
        <ul className={showMaltraitanceBadge ? 'fr-mt-1w' : ''}>
          {itemsArray.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Renders the "Mis en cause" cell for a "requête" row
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

    // if it's ETABLISSEMENT, display the "établissement" name from "lieuDeSurvenue"
    if (misEnCauseTypeId === MIS_EN_CAUSE_TYPE.ETABLISSEMENT) {
      const etablissementName =
        lieuDeSurvenue?.finess || lieuDeSurvenue?.lieuPrecision || lieuDeSurvenue?.adresse?.label || null;

      if (etablissementName) {
        misEnCauseItems.add(etablissementName);
      }
    }
    // for MEMBRE_FAMILLE, PROCHE, AUTRE : display the type (and the "précision" if it exists)
    else if (
      misEnCauseTypeId === MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE ||
      misEnCauseTypeId === MIS_EN_CAUSE_TYPE.PROCHE ||
      misEnCauseTypeId === MIS_EN_CAUSE_TYPE.AUTRE
    ) {
      let displayText = misEnCauseTypeLabel;
      const precisionLabel = misEnCause?.misEnCauseTypePrecision?.label;
      if (precisionLabel) {
        displayText = `${displayText} - ${precisionLabel}`;
      }
      misEnCauseItems.add(displayText);
    }
    // for other types, display just the label
    else {
      misEnCauseItems.add(misEnCauseTypeLabel);
    }
  });

  if (misEnCauseItems.size === 0) {
    return '-';
  }

  const itemsArray = Array.from(misEnCauseItems);

  if (itemsArray.length === 1) {
    return <span className="one-line">{itemsArray[0]}</span>;
  }

  return (
    <ul className="fr-mb-0">
      {itemsArray.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
