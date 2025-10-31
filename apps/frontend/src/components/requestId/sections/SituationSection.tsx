import { fr } from '@codegouvfr/react-dsfr';
import { demarcheEngageeLabels, misEnCauseTypeLabels } from '@sirena/common/constants';
import { valueToLabel } from '@sirena/common/utils';
import { InfoSection } from '@sirena/ui';
import { FileList } from '@/components/common/FileList';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import { formatFileFromServer } from '@/utils/fileHelpers';
import { SectionTitle } from './helpers';

type SituationData = NonNullable<
  NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['situations']
>[number];

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
  const hasFaits = fait?.maltraitanceTypes && fait.maltraitanceTypes.length > 0;

  const hasLieuDetails =
    situation?.lieuDeSurvenue?.lieuType?.label ||
    situation?.lieuDeSurvenue?.finess ||
    situation?.lieuDeSurvenue?.adresse?.codePostal;
  const hasMisEnCauseDetails = situation?.misEnCause?.commentaire || situation?.misEnCause?.rpps;

  const isFulfilled = hasLieu || hasMisEnCause || hasFaits || hasLieuDetails || hasMisEnCauseDetails;

  const renderSummary = () => {
    if (!hasLieu && !hasMisEnCause && !hasFaits) return null;

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
      </div>
    );
  };

  const renderDetails = () => {
    if (!isFulfilled) return null;

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
              <p className={fr.cx('fr-mb-2w')}>
                <span>Identité du professionnel ou numéro RPPS :</span> {situation.misEnCause.rpps}
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
                <span>Précision du lieu :</span> {situation.lieuDeSurvenue.lieuPrecision}
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
              <p className={fr.cx('fr-mb-3w')}>
                <span>
                  {situation.lieuDeSurvenue.lieuType?.label?.includes('santé')
                    ? "Nom de l'établissement ou code FINESS"
                    : 'Numéro FINESS'}{' '}
                  :
                </span>{' '}
                {situation.lieuDeSurvenue.finess}
              </p>
            )}
          </>
        )}

        {fait?.maltraitanceTypes && fait.maltraitanceTypes.length > 0 && (
          <>
            <SectionTitle>Motifs renseignés par le déclarant</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {fait.maltraitanceTypes.map((type) => (
                <li key={type.maltraitanceType.label}>{type.maltraitanceType.label}</li>
              ))}
            </ul>
          </>
        )}

        {fait?.motifs && fait.motifs.length > 0 && (
          <>
            <SectionTitle>Motifs qualifiés</SectionTitle>
            <ul className={fr.cx('fr-mb-3w')}>
              {fait.motifs.map((motif) => (
                <li key={motif?.motif?.label || ''}>
                  {valueToLabel(motif?.motif?.label || '') || motif?.motif?.label || ''}
                </li>
              ))}
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
