import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import {
  MALTRAITANCE_PARENT_VALUE,
  MIS_EN_CAUSE_TYPE,
  type MisEnCauseType,
  MOTIFS_HIERARCHICAL_DATA,
  misEnCauseTypeLabels,
} from '@sirena/common/constants';
import { valueToLabel } from '@sirena/common/utils';
import type { ReactNode } from 'react';
import type { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';
import { situationHasMaltraitanceTag } from '@/utils/maltraitanceHelpers';
import styles from './requetesEntites.cells.module.css';

type RequeteEntiteRow = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number];
type Situation = RequeteEntiteRow['requete']['situations'][number];
type Fait = NonNullable<Situation['faits']>[number];
type MisEnCause = Situation['misEnCause'];
type LieuDeSurvenue = Situation['lieuDeSurvenue'];
type LabeledItem = { label: string; title: string };

const UNKNOWN_VALUE = 'Non renseigné';
const NEGATIVE_MALTRAITANCE_ANSWERS = ['NON', 'NE_SAIS_PAS'];

const uniqueBy = <T, K>(items: T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const flatMap = <T, U>(items: T[], fn: (item: T) => U[]): U[] => items.flatMap(fn);

const renderLabeledItems = (items: LabeledItem[], alwaysShowAbbr = false): ReactNode => (
  <ul className={styles.inlineList}>
    {items.map((item) => (
      <li key={item.label}>
        {alwaysShowAbbr || item.label !== item.title ? (
          <abbr title={item.title} style={{ textDecoration: 'none', cursor: 'help' }}>
            {item.label}
          </abbr>
        ) : (
          item.label
        )}
      </li>
    ))}
  </ul>
);

const renderInlineList = (items: string[]): ReactNode => (
  <ul className={styles.inlineList}>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const renderList = (items: string[]): ReactNode => (
  <ul className={styles.list}>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const getMotifParentInfo = (motifId: string | undefined): { label: string | null; isMaltraitance: boolean } => {
  if (!motifId) return { label: null, isMaltraitance: false };
  const parts = motifId.split('/');
  if (parts.length !== 2) return { label: null, isMaltraitance: false };

  const [parentValue] = parts;
  const parent = MOTIFS_HIERARCHICAL_DATA.find((p) => p.value === parentValue);
  if (!parent) return { label: null, isMaltraitance: false };

  return parentValue === MALTRAITANCE_PARENT_VALUE
    ? { label: null, isMaltraitance: true }
    : { label: parent.label, isMaltraitance: false };
};

const extractMotifsFromFait = (fait: Fait) => ({
  qualifies: fait?.motifs ?? [],
  declaratifs: fait?.motifsDeclaratifs ?? [],
  hasMaltraitance: (fait?.maltraitanceTypes ?? []).some(
    (t) => !NEGATIVE_MALTRAITANCE_ANSWERS.includes(t?.maltraitanceTypeId ?? ''),
  ),
});

const collectMotifs = (situations: Situation[]) => {
  const allFaits = flatMap(situations, (s) => s?.faits ?? []);
  const extracted = allFaits.map(extractMotifsFromFait);

  return {
    qualifies: flatMap(extracted, (e) => e.qualifies),
    declaratifs: flatMap(extracted, (e) => e.declaratifs),
    hasMaltraitance: extracted.some((e) => e.hasMaltraitance),
  };
};

const processQualifiedMotifs = (motifs: ReturnType<typeof collectMotifs>['qualifies']) => {
  const results = motifs.map((m) => getMotifParentInfo(m?.motif?.id || m?.motifId));
  return {
    labels: [...new Set(results.filter((r) => r.label).map((r) => r.label as string))],
    showMaltraitance: results.some((r) => r.isMaltraitance),
  };
};

const processDeclarativeMotifs = (motifs: ReturnType<typeof collectMotifs>['declaratifs']) => [
  ...new Set(
    motifs
      .map((m) => m?.motifDeclaratif?.label)
      .filter((l): l is string => Boolean(l))
      .map((l) => valueToLabel(l) || l),
  ),
];

export function renderMotifsCell(row: RequeteEntiteRow): ReactNode {
  const { situations, dematSocialId } = row.requete;
  const allLabels: string[] = [];
  let showMaltraitanceBadge = false;

  for (const situation of situations ?? []) {
    const faits = situation?.faits ?? [];
    const extracted = faits.map(extractMotifsFromFait);
    const qualifies = flatMap(extracted, (e) => e.qualifies);
    const declaratifs = flatMap(extracted, (e) => e.declaratifs);

    if (situationHasMaltraitanceTag(situation)) {
      showMaltraitanceBadge = true;
    }

    if (qualifies.length > 0) {
      const processed = processQualifiedMotifs(qualifies);
      allLabels.push(...processed.labels);
    } else if (dematSocialId != null && declaratifs.length > 0) {
      allLabels.push(...processDeclarativeMotifs(declaratifs));
    }
  }

  const labels = [...new Set(allLabels)];

  if (labels.length === 0 && !showMaltraitanceBadge) return UNKNOWN_VALUE;

  return (
    <>
      {showMaltraitanceBadge && (
        <div>
          <Badge noIcon className={fr.cx('fr-badge--purple-glycine')}>
            Maltraitance
          </Badge>
        </div>
      )}
      {labels.length > 0 && <div className={showMaltraitanceBadge ? 'fr-mt-1w' : ''}>{renderList(labels)}</div>}
    </>
  );
}

const getMisEnCauseTypeInfo = (misEnCause: MisEnCause) => {
  const typeId = (misEnCause?.misEnCauseType?.id ?? misEnCause?.misEnCauseTypeId) as MisEnCauseType | undefined;
  if (!typeId) return null;

  const typeLabel =
    misEnCause?.misEnCauseType?.label ??
    (typeId in misEnCauseTypeLabels ? misEnCauseTypeLabels[typeId] : undefined) ??
    typeId;

  return { typeId, typeLabel, precisionLabel: misEnCause?.misEnCauseTypePrecision?.label };
};

const getMisEnCauseDisplayValue = (
  typeId: MisEnCauseType,
  typeLabel: string,
  precisionLabel: string | undefined,
  misEnCause: MisEnCause,
  lieuDeSurvenue: LieuDeSurvenue,
): string => {
  switch (typeId) {
    case MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE:
      return misEnCause?.commentaire?.trim() || precisionLabel || typeLabel;

    case MIS_EN_CAUSE_TYPE.ETABLISSEMENT:
      return lieuDeSurvenue?.adresse?.label || precisionLabel || typeLabel;

    default:
      return precisionLabel || typeLabel;
  }
};

const extractMisEnCauseFromSituation = (situation: Situation): string | null => {
  const typeInfo = getMisEnCauseTypeInfo(situation.misEnCause);
  if (!typeInfo) return null;

  return getMisEnCauseDisplayValue(
    typeInfo.typeId,
    typeInfo.typeLabel,
    typeInfo.precisionLabel,
    situation.misEnCause,
    situation.lieuDeSurvenue,
  );
};

export function renderMisEnCauseCell(row: RequeteEntiteRow): ReactNode {
  const items = (row.requete.situations ?? [])
    .map(extractMisEnCauseFromSituation)
    .filter((v): v is string => v !== null);

  const uniqueItems = [...new Set(items)];

  return uniqueItems.length === 0 ? UNKNOWN_VALUE : renderInlineList(uniqueItems);
}

export function renderAffectationCell(row: RequeteEntiteRow, userTopEntiteId: string): ReactNode {
  const situations = row.requete.situations ?? [];

  const allEntitesTraitement = flatMap(situations, (s) => s.traitementDesFaits?.entites ?? []);

  if (allEntitesTraitement.length === 0) {
    return UNKNOWN_VALUE;
  }

  // Filter: only keep entites that belong to user's top entite
  const userEntitesTraitement = allEntitesTraitement.filter((curr) => curr.entiteId === userTopEntiteId);

  if (userEntitesTraitement.length === 0) {
    return UNKNOWN_VALUE;
  }

  // Group by entiteName and collect directionServiceName
  const traitements = userEntitesTraitement.reduce(
    (acc, curr) => {
      if (!acc[curr.entiteName ?? '']) {
        acc[curr.entiteName ?? ''] = [];
      }
      if (curr.directionServiceName) {
        let name = curr.directionServiceName;
        // If chain.length > 2, it's a service (3rd level), add direction parent
        if (curr.chain && curr.chain.length > 2) {
          name += ` (${curr.chain[curr.chain.length - 2].label})`;
        }
        acc[curr.entiteName ?? ''].push(name);
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const entries = Object.entries(traitements);
  if (entries.length === 0) return UNKNOWN_VALUE;

  // Flatten all services from all entites
  const allServices = flatMap(entries, ([, services]) => services);
  const uniqueServices = [...new Set(allServices)];

  if (uniqueServices.length > 0) {
    const items = uniqueServices.map((service) => ({
      label: service,
      title: service,
    }));
    return renderLabeledItems(items, true);
  }

  // If no services but entite exists, show entite name
  const entiteNames = entries.map(([entiteName]) => entiteName);
  if (entiteNames.length > 0) {
    const items = uniqueBy(
      entiteNames.map((name) => ({
        label: name,
        title: name,
      })),
      (i) => i.label,
    );
    return renderLabeledItems(items, true);
  }

  return UNKNOWN_VALUE;
}
