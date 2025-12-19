import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import {
  demarcheEngageeLabels,
  type MaltraitanceQualifiedType,
  MOTIFS_HIERARCHICAL_DATA,
  maltraitanceQualifiedLabels,
  misEnCauseTypeLabels,
} from '@sirena/common/constants';
import { getLieuPrecisionLabel, valueToLabel } from '@sirena/common/utils';
import { InfoSection } from '@sirena/ui';
import { useMemo } from 'react';
import { FileList } from '@/components/common/FileList';
import { useEntiteDescendants, useEntites } from '@/hooks/queries/entites.hook';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import { formatFileFromServer } from '@/utils/fileHelpers';
import { hasSituationContent } from '@/utils/situationHelpers';
import { SectionTitle } from './helpers';

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

interface TraitementDesFaitsBadgeWithDirectionProps {
  entiteId: string;
  directionServiceId: string;
  entiteName: string;
  entiteType: string;
}

const getBadgeClassName = (entiteType: string): string => {
  const type = entiteType.toLowerCase();
  if (type === 'ars') return 'fr-badge--pink-tuile';
  if (type === 'dd') return 'fr-badge--blue-ecume';
  if (type === 'cd') return 'fr-badge--green-menthe';
  return 'fr-badge';
};

const TraitementDesFaitsBadgeWithDirection = ({
  entiteId,
  directionServiceId,
  entiteName,
  entiteType,
}: TraitementDesFaitsBadgeWithDirectionProps) => {
  const { data: descendants = [] } = useEntiteDescendants(entiteId);
  const directionName = descendants.find((d: { id: string }) => d.id === directionServiceId)?.nomComplet || '';

  const label = directionName ? `${entiteName} - ${directionName}` : entiteName;

  return <Badge className={getBadgeClassName(entiteType)}>{label}</Badge>;
};

interface SituationSectionProps {
  id: string;
  requestId?: string;
  situation?: SituationData | null;
  onEdit: (situationId?: string) => void;
}

export const SituationSection = ({ id, requestId, situation, onEdit }: SituationSectionProps) => {
  const situationId = situation?.id;
  const { canEdit } = useCanEdit({ requeteId: requestId });
  const [fait] = situation?.faits ?? [];
  const hasLieu = situation?.lieuDeSurvenue?.lieuType?.label;
  const hasMisEnCause = situation?.misEnCause?.misEnCauseType?.label;
  const hasMotifs = fait?.motifs?.length > 0;

  const motifsDeclares: string[] = [];

  situation?.faits.forEach((fait) => {
    fait.maltraitanceTypes?.forEach((maltraitance) => {
      if (maltraitance.maltraitanceTypeId in maltraitanceQualifiedLabels) {
        const label = maltraitanceQualifiedLabels[maltraitance.maltraitanceTypeId as MaltraitanceQualifiedType];
        if (motifsDeclares.indexOf(label) === -1) {
          motifsDeclares.push(label);
        }
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
  const { data: allEntites } = useEntites(undefined);
  const entitesMap = useMemo(() => {
    const map = new Map<string, { nomComplet: string; entiteTypeId: string }>();
    if (allEntites?.data) {
      allEntites.data.forEach((entite) => {
        map.set(entite.id, { nomComplet: entite.nomComplet, entiteTypeId: entite.entiteTypeId });
      });
    }
    return map;
  }, [allEntites?.data]);

  const renderTraitementDesFaitsBadges = (showTitle = false) => {
    if (!traitementDesFaits?.entites || traitementDesFaits.entites.length === 0) return null;

    const badges = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {traitementDesFaits.entites.map((entite, index) => {
          const entiteInfo = entitesMap.get(entite.entiteId);
          if (!entiteInfo) return null;

          const entiteName = entiteInfo.nomComplet;
          const entiteType = entiteInfo.entiteTypeId.toLowerCase();

          if (entite.directionServiceId) {
            return (
              <TraitementDesFaitsBadgeWithDirection
                key={`${entite.entiteId}-${entite.directionServiceId}-${index}`}
                entiteId={entite.entiteId}
                directionServiceId={entite.directionServiceId}
                entiteName={entiteName}
                entiteType={entiteType}
              />
            );
          }

          return (
            <Badge key={`${entite.entiteId}-${index}`} className={getBadgeClassName(entiteType)}>
              {entiteName}
            </Badge>
          );
        })}
      </div>
    );

    if (showTitle) {
      return (
        <>
          <SectionTitle>Traitement des faits</SectionTitle>
          <div className={fr.cx('fr-mb-3w')}>{badges}</div>
        </>
      );
    }

    return badges;
  };

  const renderSummary = () => {
    const hasTraitementDesFaits = traitementDesFaits?.entites && traitementDesFaits.entites.length > 0;
    if (!hasLieu && !hasMisEnCause && !hasMotifs && !hasTraitementDesFaits) return null;

    return (
      <div className="fr-grid-row fr-grid-row--gutters">
        {hasMisEnCause && (
          <div className="fr-col-auto">
            <p className={fr.cx('fr-mb-0')}>
              <span className={fr.cx('fr-icon-error-warning-line', 'fr-icon--sm')} aria-hidden="true" />{' '}
              {situation?.misEnCause?.misEnCauseType?.label}
              {situation?.misEnCause?.commentaire && ` - ${situation.misEnCause.commentaire}`}
            </p>
          </div>
        )}

        {hasLieu && (
          <div className="fr-col-auto">
            <p className={fr.cx('fr-mb-0')}>
              <span className={fr.cx('fr-icon-map-pin-2-line', 'fr-icon--sm')} aria-hidden="true" />{' '}
              {situation?.lieuDeSurvenue?.lieuType?.label}
            </p>
          </div>
        )}

        {fait?.motifs?.length > 0 && (
          <div className="fr-col-auto">
            <p className={fr.cx('fr-mb-0')}>
              <span className={fr.cx('fr-icon-draft-line', 'fr-icon--sm')} aria-hidden="true" />{' '}
              {fait.motifs
                .map((motif) => valueToLabel(motif?.motif?.label || '') || motif?.motif?.label || '')
                .join(', ')}
            </p>
          </div>
        )}
        {hasTraitementDesFaits && (
          <div className="fr-col-auto">
            <p className={fr.cx('fr-mb-0')}>
              <span className={fr.cx('fr-icon-draft-line', 'fr-icon--sm')} aria-hidden="true" /> Traitement des faits
            </p>
            <div className={fr.cx('fr-mt-1w')}>{renderTraitementDesFaitsBadges()}</div>
          </div>
        )}
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
            <SectionTitle>Mis en cause</SectionTitle>
            <p className={fr.cx('fr-mb-1w')}>
              <span>Type de mis en cause :</span> {situation?.misEnCause?.misEnCauseType?.label}
            </p>
            {situation?.misEnCause?.misEnCauseTypePrecision && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Précision :</span> {situation.misEnCause.misEnCauseTypePrecision.label}
              </p>
            )}
            {situation?.misEnCause?.rpps && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Numéro RPPS :</span> {situation.misEnCause.rpps}
              </p>
            )}
            {situation?.misEnCause?.commentaire &&
              situation?.misEnCause?.misEnCauseType?.label === misEnCauseTypeLabels.PROFESSIONNEL && (
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
            <SectionTitle>Lieu où se sont déroulés les faits</SectionTitle>
            <p className={fr.cx('fr-mb-1w')}>
              <span>Type de lieu :</span> {situation?.lieuDeSurvenue?.lieuType?.label}
            </p>
            {situation?.lieuDeSurvenue?.lieuPrecision && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Précision du lieu :</span>{' '}
                {getLieuPrecisionLabel(situation.lieuDeSurvenue.lieuType?.id, situation.lieuDeSurvenue.lieuPrecision)}
              </p>
            )}
            {situation?.lieuDeSurvenue?.adresse?.label && (
              <p className={fr.cx('fr-mb-1w')}>
                <span>Adresse :</span> {situation.lieuDeSurvenue.adresse.label}
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

        {fait?.maltraitanceTypes && fait.maltraitanceTypes.length > 0 && (
          <>
            <SectionTitle>Motifs renseignés par le déclarant</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {motifsDeclares.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </>
        )}

        {fait?.motifs && fait.motifs.length > 0 && (
          <>
            <SectionTitle>Motifs qualifiés</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {Array.from(groupMotifsByParent(fait.motifs).entries()).map(
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
              )}
            </ul>
          </>
        )}

        {fait?.consequences && fait.consequences.length > 0 && (
          <>
            <SectionTitle>Conséquences sur la personne</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {fait.consequences.map((consequence) => (
                <li key={consequence.consequence.label}>{consequence.consequence.label}</li>
              ))}
            </ul>
          </>
        )}

        {(fait?.dateDebut || fait?.dateFin) && (
          <>
            <SectionTitle>Période des faits</SectionTitle>
            <p className={fr.cx('fr-mb-3w')}>
              {fait.dateDebut && `Du ${new Date(fait.dateDebut).toLocaleDateString('fr-FR')}`}
              {fait.dateDebut && fait.dateFin && ' '}
              {fait.dateFin && `au ${new Date(fait.dateFin).toLocaleDateString('fr-FR')}`}
            </p>
          </>
        )}

        {fait?.commentaire && (
          <>
            <SectionTitle>Explication des faits</SectionTitle>
            <p className={fr.cx('fr-mb-3w')}>{fait.commentaire}</p>
          </>
        )}

        {fait?.autresPrecisions && (
          <>
            <SectionTitle>Autres précisions</SectionTitle>
            <p className={fr.cx('fr-mb-3w')}>{fait.autresPrecisions}</p>
          </>
        )}

        {fait?.fichiers?.length > 0 && (
          <>
            <SectionTitle>Pièces jointes</SectionTitle>
            <FileList
              files={fait.fichiers.map(formatFileFromServer)}
              getFileUrl={(fileId) => `/api/requetes-entite/${requestId}/situation/${situationId}/file/${fileId}`}
              getSafeFileUrl={(fileId) => `/api/requetes-entite/${requestId}/file/${fileId}/safe`}
              title=""
            />
          </>
        )}

        {situation?.demarchesEngagees?.demarches && situation.demarchesEngagees.demarches.length > 0 && (
          <>
            <SectionTitle>Démarches engagées</SectionTitle>
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
          </>
        )}
        {hasTraitementDesFaits && renderTraitementDesFaitsBadges(true)}
      </>
    );
  };

  return (
    <InfoSection
      id={id}
      title="Lieu, mis en cause et faits"
      onEdit={() => onEdit(situationId)}
      canEdit={canEdit}
      renderSummary={renderSummary}
      renderDetails={isFulfilled ? renderDetails : undefined}
      emptyLabel="Aucune information"
      replaceSummaryWithDetails={true}
    />
  );
};
