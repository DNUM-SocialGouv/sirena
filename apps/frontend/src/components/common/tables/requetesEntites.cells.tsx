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
import styles from './requetesEntites.cells.module.css';

type RequeteEntiteRow = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number];
type Situation = RequeteEntiteRow['requete']['situations'][number];
type Fait = NonNullable<Situation['faits']>[number];
type MisEnCause = Situation['misEnCause'];
type LieuDeSurvenue = Situation['lieuDeSurvenue'];
type SituationEntite = NonNullable<Situation['situationEntites']>[number];
type EntiteInfo = NonNullable<SituationEntite['entite']>;

type LabeledItem = { label: string; title: string };
type ServiceInfo = { id: string; name: string; nomComplet: string; parentName?: string; parentNomComplet?: string };

const UNKNOWN_VALUE = 'Non renseigné';
const MALTRAITANCE_PARENT_VALUE = 'MALTRAITANCE_PROFESSIONNELS_ENTOURAGE';
const NEGATIVE_MALTRAITANCE_ANSWERS = ['NON', 'NE_SAIS_PAS'];

const getDisplayName = (e: EntiteInfo): string => e.label || e.nomComplet;
const getFullName = (e: EntiteInfo): string => e.nomComplet || e.label;
const isRootEntite = (e: EntiteInfo): boolean => e.entiteMereId === null;

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
  const { qualifies, declaratifs, hasMaltraitance } = collectMotifs(situations ?? []);

  let labels: string[] = [];
  let showMaltraitanceBadge = false;

  if (qualifies.length > 0) {
    const processed = processQualifiedMotifs(qualifies);
    labels = processed.labels;
    showMaltraitanceBadge = processed.showMaltraitance;
  } else if (dematSocialId != null && declaratifs.length > 0) {
    labels = processDeclarativeMotifs(declaratifs);
    showMaltraitanceBadge = hasMaltraitance;
  }

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

const buildEntitesMap = (situations: Situation[]): Map<string, EntiteInfo> =>
  new Map(
    flatMap(situations, (s) => s?.situationEntites ?? [])
      .filter((se) => se?.entite)
      .map((se) => [se.entite.id, se.entite]),
  );

const createServiceInfo = (entite: EntiteInfo, parent: EntiteInfo | undefined): ServiceInfo => ({
  id: entite.id,
  name: getDisplayName(entite),
  nomComplet: getFullName(entite),
  parentName: parent && !isRootEntite(parent) ? getDisplayName(parent) : undefined,
  parentNomComplet: parent && !isRootEntite(parent) ? getFullName(parent) : undefined,
});

const extractServicesFromSituations = (situations: Situation[], entitesMap: Map<string, EntiteInfo>): ServiceInfo[] => {
  const allEntites = flatMap(situations, (s) => s?.situationEntites ?? [])
    .map((se) => se?.entite)
    .filter((e): e is EntiteInfo => e != null && !isRootEntite(e));

  const uniqueEntites = uniqueBy(allEntites, (e) => e.id);

  return uniqueEntites.map((entite) => {
    const parent = entitesMap.get(entite.entiteMereId ?? '');
    return createServiceInfo(entite, parent);
  });
};

const extractRootEntites = (entitesMap: Map<string, EntiteInfo>): EntiteInfo[] =>
  [...entitesMap.values()].filter(isRootEntite);

const sortServices = (services: ServiceInfo[], userEntiteId?: string): ServiceInfo[] =>
  [...services].sort((a, b) => {
    if (userEntiteId) {
      if (a.id === userEntiteId) return -1;
      if (b.id === userEntiteId) return 1;
    }
    return a.name.localeCompare(b.name, 'fr');
  });

const serviceToLabeledItem = (service: ServiceInfo): LabeledItem => ({
  label: service.parentName ? `${service.name} (${service.parentName})` : service.name,
  title: service.parentNomComplet ? `${service.nomComplet} (${service.parentNomComplet})` : service.nomComplet,
});

const entiteToLabeledItem = (entite: EntiteInfo): LabeledItem => ({
  label: getDisplayName(entite),
  title: getFullName(entite),
});

export function renderAffectationCell(
  row: RequeteEntiteRow,
  userTopEntiteId: string,
  userEntiteId?: string,
): ReactNode {
  const situations = row.requete.situations ?? [];
  const entitesMap = buildEntitesMap(situations);
  const userEntityPresent = entitesMap.has(userTopEntiteId);

  // If user's entity not present, show other root entities
  if (!userEntityPresent) {
    const rootEntites = extractRootEntites(entitesMap);
    if (rootEntites.length === 0) return UNKNOWN_VALUE;

    const items = uniqueBy(rootEntites.map(entiteToLabeledItem), (i) => i.label);
    return renderLabeledItems(items, true);
  }

  const services = extractServicesFromSituations(situations, entitesMap);

  if (services.length > 0) {
    const sortedServices = sortServices(services, userEntiteId);
    const items = uniqueBy(sortedServices.map(serviceToLabeledItem), (i) => i.label);
    return renderLabeledItems(items, true);
  }

  const rootEntite = entitesMap.get(userTopEntiteId);
  if (!rootEntite) return UNKNOWN_VALUE;

  return renderLabeledItems([entiteToLabeledItem(rootEntite)], true);
}
