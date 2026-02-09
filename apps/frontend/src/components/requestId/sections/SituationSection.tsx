import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import {
  demarcheEngageeLabels,
  LIEU_TYPE,
  MALTRAITANCEQUALIFIED_TYPE,
  MOTIFS_HIERARCHICAL_DATA,
  misEnCauseTypeLabels,
  RECEPTION_TYPE,
} from '@sirena/common/constants';
import { getLieuPrecisionLabel } from '@sirena/common/utils';
import { InfoSection } from '@sirena/ui';
import { FileList } from '@/components/common/FileList';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import { formatFileFromServer } from '@/utils/fileHelpers';
import { situationHasMaltraitanceTag } from '@/utils/maltraitanceHelpers';
import { hasSituationContent } from '@/utils/situationHelpers';
import { SectionTitle } from './helpers';

const ETABLISSEMENTS: string[] = [
  LIEU_TYPE.ETABLISSEMENT_SANTE,
  LIEU_TYPE.ETABLISSEMENT_PERSONNES_AGEES,
  LIEU_TYPE.ETABLISSEMENT_HANDICAP,
];

const groupMotifsByParent = (
  motifs: Array<{ motif?: { id?: string; label?: string } | null }>,
): Map<string, { parentLabel: string; children: string[] }> => {
  const grouped = new Map<string, { parentLabel: string; children: string[] }>();

  for (const motif of motifs) {
    const motifId = motif?.motif?.id || '';
    const parts = motifId.split('/');
    if (parts.length !== 2) continue;

    const [parentValue, childValue] = parts;
    const parent = MOTIFS_HIERARCHICAL_DATA.find((p) => p.value === parentValue);
    if (!parent) continue;

    const child = parent.children.find((c) => c.value === childValue);
    if (!child) continue;

    if (!grouped.has(parentValue)) {
      grouped.set(parentValue, { parentLabel: parent.label, children: [] });
    }

    grouped.get(parentValue)?.children.push(child.label);
  }

  return grouped;
};

type SituationData = NonNullable<
  NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['situations']
>[number];

const getLieuDeSurvenue = (situation: SituationData) => {
  if (situation.lieuDeSurvenue.adresse?.label) {
    return situation.lieuDeSurvenue.adresse?.label;
  }
  let text = '';
  if (situation.lieuDeSurvenue.lieuType?.label) {
    text += situation.lieuDeSurvenue.lieuType.label;
    const lieuPrecision = getLieuPrecisionLabel(
      situation.lieuDeSurvenue.lieuType?.id,
      situation.lieuDeSurvenue.lieuPrecision,
    );
    if (lieuPrecision) {
      text += ` - ${lieuPrecision}`;
    }
  }
  return text;
};

const Affectations = ({ situation }: { situation?: SituationData | null }) => {
  if (!situation?.traitementDesFaits?.entites || situation.traitementDesFaits.entites.length === 0) {
    return null;
  }
  const traitements = situation.traitementDesFaits.entites.reduce(
    (acc, curr) => {
      if (!acc[curr.entiteName]) {
        acc[curr.entiteName] = [];
      }
      if (curr.directionServiceName) {
        let name = curr.directionServiceName;
        if (curr.chain.length > 2) {
          name += ` (${curr.chain[curr.chain.length - 2].label})`;
        }
        acc[curr.entiteName].push(name);
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
  const entries = Object.entries(traitements).sort(([_, a], [__, b]) => b.length - a.length);
  return (
    <div>
      {entries.map(([entiteName, services]) => (
        <Affectation key={entiteName} entiteName={entiteName} services={services} />
      ))}
    </div>
  );
};

const Affectation = ({ entiteName, services }: { entiteName: string; services: string[] }) => {
  return (
    <ul className="fr-tags-group">
      <li>
        <p className="fr-tag fr-tag--sm color-purple-glycine">{entiteName}</p>
      </li>
      {services.length !== 0 && (
        <li>
          {services.map((service) => (
            <span key={service} className="fr-tag fr-tag--sm fr-tag-default">
              {service}
            </span>
          ))}
        </li>
      )}
    </ul>
  );
};

const TraitementDesFaits = ({ situation, details }: { situation?: SituationData | null; details: boolean }) => {
  return (
    <div className="fr-col-12">
      <div className={fr.cx('fr-mb-0')}>
        {details ? (
          <SectionTitle level={4}>Traitement des faits</SectionTitle>
        ) : (
          <span className="bold">Traitement :</span>
        )}
      </div>
      <div className={fr.cx('fr-mt-1w')}>
        <Affectations situation={situation} />
      </div>
    </div>
  );
};

const Motifs = ({ motifs, isQualified }: { motifs: string[]; isQualified: boolean }) => {
  const formater = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' });
  const formated = formater.format(motifs);
  const icon = isQualified ? 'fr-icon-clipboard-line' : 'fr-icon-todo-line';
  const labelText = isQualified ? 'Motifs qualifiés' : 'Motifs déclaratifs';

  return (
    <p className={fr.cx('fr-mb-0')}>
      <span className={fr.cx(icon, 'fr-icon--sm')} aria-hidden="true" /> {labelText}: {formated || 'À renseigner'}
    </p>
  );
};

const MotifsQualified = ({ situation }: { situation?: SituationData | null }) => {
  if (!situation) return null;

  const motifs = new Set<string>();
  situation.faits.forEach((fait) => {
    fait.motifs?.forEach((m) => {
      if (m.motif.label) {
        motifs.add(m.motif.label);
      }
    });
  });
  return <Motifs motifs={Array.from(motifs)} isQualified={true} />;
};

const MotifsDeclared = ({ situation }: { situation?: SituationData | null }) => {
  if (!situation) return null;

  const motifs = new Set<string>();
  situation.faits.forEach((fait) => {
    fait.motifsDeclaratifs?.forEach((motif) => {
      if (motif.motifDeclaratif.label) {
        motifs.add(motif.motifDeclaratif.label);
      }
    });
  });
  return motifs.size > 0 ? <Motifs motifs={Array.from(motifs)} isQualified={false} /> : null;
};

interface SituationSectionProps {
  id: string;
  requestId?: string;
  receptionType: string | null;
  situation?: SituationData | null;
  onEdit: (situationId?: string) => void;
}

export const SituationSection = ({ id, requestId, situation, receptionType, onEdit }: SituationSectionProps) => {
  const situationId = situation?.id;
  const { canEdit } = useCanEdit({ requeteId: requestId });
  const [fait] = situation?.faits ?? [];
  const hasLieu = situation?.lieuDeSurvenue?.lieuType?.label;
  const hasMisEnCause = situation?.misEnCause?.misEnCauseType?.label;
  const hasMotifs = fait?.motifs?.length > 0;

  const motifsDeclares: string[] = [];

  situation?.faits.forEach((fait) => {
    fait.maltraitanceTypes?.forEach((maltraitance) => {
      if (maltraitance.maltraitanceType.id === MALTRAITANCEQUALIFIED_TYPE.NON) {
        return;
      }
      if (motifsDeclares.indexOf(maltraitance.maltraitanceType.label) === -1) {
        motifsDeclares.push(maltraitance.maltraitanceType.label);
      }
    });
    fait.motifsDeclaratifs?.forEach((motif) => {
      if (motifsDeclares.indexOf(motif.motifDeclaratif.label) === -1) {
        motifsDeclares.push(motif.motifDeclaratif.label);
      }
    });
  });

  const isFulfilled = hasSituationContent(situation);

  const traitementDesFaits = situation?.traitementDesFaits;

  const renderSummary = () => {
    const hasTraitementDesFaits = traitementDesFaits?.entites && traitementDesFaits.entites.length > 0;
    if (!hasLieu && !hasMisEnCause && !hasMotifs && !hasTraitementDesFaits) return null;

    return (
      <div className="fr-grid-row fr-grid-row--gutters">
        {hasLieu && (
          <div className="fr-col-auto">
            <p className={fr.cx('fr-mb-0')}>
              <span className={fr.cx('fr-icon-map-pin-2-line', 'fr-icon--sm')} aria-hidden="true" />
              <span className="fr-sr-only"> Lieu de survenue des faits :</span> {getLieuDeSurvenue(situation)}
            </p>
          </div>
        )}

        {hasMisEnCause && (
          <div className="fr-col-auto">
            <p className={fr.cx('fr-mb-0')}>
              <span className={fr.cx('fr-icon-error-warning-line', 'fr-icon--sm')} aria-hidden="true" />
              <span className="fr-sr-only">Identité de la personne concernée :</span>{' '}
              {situation?.misEnCause?.commentaire && `${situation.misEnCause.commentaire} - `}
              {situation?.misEnCause?.misEnCauseType?.label}
            </p>
          </div>
        )}

        <div className="fr-col-auto">
          <MotifsQualified situation={situation} />
          {receptionType === RECEPTION_TYPE.FORMULAIRE ? <MotifsDeclared situation={situation} /> : null}
        </div>
        {hasTraitementDesFaits && <TraitementDesFaits situation={situation} details={false} />}
      </div>
    );
  };

  const renderDetails = () => {
    if (!isFulfilled) return null;

    const hasTraitementDesFaits = traitementDesFaits?.entites && traitementDesFaits.entites.length > 0;

    return (
      <>
        {hasMisEnCause && (
          <>
            <SectionTitle level={4}>Mis en cause</SectionTitle>
            <p className={fr.cx('fr-mb-1w')}>
              <span>Type de mis en cause :</span> {situation?.misEnCause?.misEnCauseType?.label}
            </p>
            {situation?.misEnCause?.misEnCauseTypePrecision && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Précision :</span> {situation.misEnCause.misEnCauseTypePrecision.label}
              </p>
            )}
            {situation?.misEnCause?.autrePrecision && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Précision supplémentaire :</span> {situation.misEnCause.autrePrecision}
              </p>
            )}
            {situation?.misEnCause?.rpps && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Numéro RPPS :</span> {situation.misEnCause.rpps}
              </p>
            )}
            {situation?.misEnCause?.commentaire &&
              situation?.misEnCause?.misEnCauseType?.label === misEnCauseTypeLabels.PROFESSIONNEL_SANTE && (
                <p className={fr.cx('fr-mb-2w')}>
                  <span>Identité du professionnel :</span> {situation.misEnCause.commentaire}
                </p>
              )}
            {situation?.misEnCause?.commentaire &&
              situation?.misEnCause?.misEnCauseType?.label === misEnCauseTypeLabels.MEMBRE_FAMILLE && (
                <>
                  <p className={fr.cx('fr-text--bold', 'fr-mb-1w')}>Identité du mis en cause</p>
                  <p className={fr.cx('fr-mb-3w')}>{situation.misEnCause.commentaire}</p>
                </>
              )}
          </>
        )}
        {hasLieu && (
          <>
            <SectionTitle level={4}>Lieu où se sont déroulés les faits</SectionTitle>
            <p className={fr.cx('fr-mb-1w')}>
              <span>Type de lieu :</span> {situation?.lieuDeSurvenue?.lieuType?.label}
            </p>
            {situation?.lieuDeSurvenue.codePostal && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Code postal :</span> {situation.lieuDeSurvenue.codePostal}
              </p>
            )}
            {situation?.lieuDeSurvenue?.lieuPrecision && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Précision du lieu :</span>{' '}
                {getLieuPrecisionLabel(situation.lieuDeSurvenue.lieuType?.id, situation.lieuDeSurvenue.lieuPrecision)}
              </p>
            )}
            {situation?.lieuDeSurvenue?.adresse?.label && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>
                  {ETABLISSEMENTS.includes(situation.lieuDeSurvenue.lieuTypeId || '')
                    ? "Nom de l'établissement :"
                    : 'Adresse :'}
                </span>{' '}
                {situation.lieuDeSurvenue.adresse.label}
              </p>
            )}
            {situation?.lieuDeSurvenue?.adresse?.numero && situation?.lieuDeSurvenue?.adresse?.rue && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Adresse :</span> {situation.lieuDeSurvenue.adresse.numero} {situation.lieuDeSurvenue.adresse.rue}
              </p>
            )}
            {situation?.lieuDeSurvenue?.adresse?.codePostal && situation?.lieuDeSurvenue?.adresse?.ville && (
              <p className={fr.cx('fr-mb-2w')}>
                <span>Code postal :</span> {situation.lieuDeSurvenue.adresse.codePostal}{' '}
                {situation.lieuDeSurvenue.adresse.ville}
              </p>
            )}
            {situation?.lieuDeSurvenue?.societeTransport && (
              <p className={fr.cx('fr-mb-2w')}>
                <span>Société de transport concernée :</span> {situation.lieuDeSurvenue.societeTransport}
              </p>
            )}
            {situation?.lieuDeSurvenue?.finess && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Numéro FINESS :</span> {situation.lieuDeSurvenue.finess}
              </p>
            )}
          </>
        )}

        {motifsDeclares.length > 0 && (
          <>
            <SectionTitle level={4}>Motifs renseignés par le déclarant</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {motifsDeclares.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </>
        )}

        {((fait?.motifs && fait.motifs.length > 0) ||
          (fait?.motifs && receptionType === RECEPTION_TYPE.FORMULAIRE)) && (
          <>
            <SectionTitle level={4}>Motifs qualifiés</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {fait.motifs.length ? (
                Array.from(groupMotifsByParent(fait.motifs).entries()).map(
                  ([parentValue, { parentLabel, children }]) => (
                    <li key={parentValue}>
                      {parentLabel}
                      <ul>
                        {children.map((childLabel) => (
                          <li key={childLabel}>{childLabel}</li>
                        ))}
                      </ul>
                    </li>
                  ),
                )
              ) : (
                <li>Motif à renseigner</li>
              )}
            </ul>
          </>
        )}

        {fait?.consequences && fait.consequences.length > 0 && (
          <>
            <SectionTitle level={4}>Conséquences sur la personne</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {fait.consequences.map((consequence) => (
                <li key={consequence.consequence.label}>{consequence.consequence.label}</li>
              ))}
            </ul>
          </>
        )}

        {(fait?.dateDebut || fait?.dateFin) && (
          <>
            <SectionTitle level={4}>Période des faits</SectionTitle>
            <p className={fr.cx('fr-mb-3w')}>
              {fait.dateDebut && `Du ${new Date(fait.dateDebut).toLocaleDateString('fr-FR')}`}
              {fait.dateDebut && fait.dateFin && ' '}
              {fait.dateFin && `au ${new Date(fait.dateFin).toLocaleDateString('fr-FR')}`}
            </p>
          </>
        )}

        {fait?.commentaire && (
          <>
            <SectionTitle level={4}>Explication des faits</SectionTitle>
            <p className={fr.cx('fr-mb-3w')}>{fait.commentaire}</p>
          </>
        )}

        {fait?.autresPrecisions && (
          <>
            <SectionTitle level={4}>Autres précisions</SectionTitle>
            <p className={fr.cx('fr-mb-3w')}>{fait.autresPrecisions}</p>
          </>
        )}

        {fait?.fichiers?.length > 0 && (
          <>
            <SectionTitle level={4}>Pièces jointes</SectionTitle>
            <FileList
              files={fait.fichiers.map(formatFileFromServer)}
              getFileUrl={(fileId) => `/api/requetes-entite/${requestId}/situation/${situationId}/file/${fileId}`}
              getSafeFileUrl={(fileId) =>
                `/api/requetes-entite/${requestId}/situation/${situationId}/file/${fileId}/safe`
              }
              title=""
            />
          </>
        )}

        {situation?.demarchesEngagees?.demarches && situation.demarchesEngagees.demarches.length > 0 && (
          <>
            <SectionTitle level={4}>Démarches engagées</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {situation.demarchesEngagees.demarches.map((demarche) => (
                <li key={demarche.id}>
                  {demarche.label}
                  {demarche.label === demarcheEngageeLabels.CONTACT_RESPONSABLES && (
                    <ul>
                      {situation.demarchesEngagees?.dateContactEtablissement && (
                        <li>
                          <span>Date de prise de contact :</span>{' '}
                          {new Date(situation.demarchesEngagees.dateContactEtablissement).toLocaleDateString('fr-FR')}
                        </li>
                      )}
                      {situation.demarchesEngagees?.etablissementARepondu && <li>Le déclarant a reçu une réponse</li>}
                    </ul>
                  )}
                  {demarche.label === demarcheEngageeLabels.CONTACT_ORGANISME &&
                    situation.demarchesEngagees?.organisme && (
                      <ul>
                        <li>
                          <span>Précisions sur l'organisme contacté :</span> {situation.demarchesEngagees.organisme}
                        </li>
                      </ul>
                    )}
                  {demarche.label === demarcheEngageeLabels.PLAINTE && (
                    <ul>
                      {situation.demarchesEngagees?.datePlainte && (
                        <li>
                          <span>Date du dépôt de plainte :</span>{' '}
                          {new Date(situation.demarchesEngagees.datePlainte).toLocaleDateString('fr-FR')}
                        </li>
                      )}
                      {situation.demarchesEngagees?.autoriteType?.label && (
                        <li>
                          <span>Lieu de dépôt de la plainte :</span> {situation.demarchesEngagees.autoriteType.label}
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <p className={fr.cx('fr-mb-3w')}>{situation.demarchesEngagees.commentaire}</p>
          </>
        )}
        {hasTraitementDesFaits && <TraitementDesFaits situation={situation} details={true} />}
      </>
    );
  };

  return (
    <InfoSection
      id={id}
      title="Description de la situation"
      onEdit={() => onEdit(situationId)}
      canEdit={canEdit}
      badges={
        situationHasMaltraitanceTag(situation)
          ? [
              <Badge key="maltraitance" noIcon className={fr.cx('fr-badge--purple-glycine')}>
                Maltraitance
              </Badge>,
            ]
          : undefined
      }
      renderSummary={renderSummary}
      renderDetails={isFulfilled ? renderDetails : undefined}
      emptyLabel="Aucune information"
      replaceSummaryWithDetails={true}
    />
  );
};
