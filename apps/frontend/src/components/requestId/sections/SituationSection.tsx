import { demarcheEngageeLabels, misEnCauseTypeLabels } from '@sirena/common/constants';
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
  onEdit: () => void;
}

export const SituationSection = ({ id, requestId, situation, onEdit }: SituationSectionProps) => {
  const situationId = situation?.id;
  const { canEdit } = useCanEdit({ requeteId: requestId });
  const [fait] = situation?.faits ?? [];
  const hasLieu = situation?.lieuDeSurvenue?.lieuType?.label;
  const hasMisEnCause = situation?.misEnCause?.misEnCauseType?.label || situation?.misEnCause?.professionType?.label;
  const hasFaits = fait?.maltraitanceTypes && fait.maltraitanceTypes.length > 0;

  const hasLieuDetails =
    situation?.lieuDeSurvenue?.lieuType?.label ||
    situation?.lieuDeSurvenue?.finess ||
    situation?.lieuDeSurvenue?.adresse?.codePostal;
  const hasMisEnCauseDetails =
    (situation?.misEnCause?.professionType?.label && situation?.misEnCause?.commentaire) || situation?.misEnCause?.rpps;

  const isFulfilled = hasLieu || hasMisEnCause || hasFaits || hasLieuDetails || hasMisEnCauseDetails;

  const renderSummary = () => {
    if (!hasLieu && !hasMisEnCause && !hasFaits) return null;

    return (
      <div className="fr-grid-row fr-grid-row--gutters">
        {hasMisEnCause && (
          <div className="fr-col-auto">
            <p className="fr-mb-0">
              <span className="fr-icon-error-warning-line fr-icon--sm" aria-hidden="true" />{' '}
              {situation?.misEnCause?.professionType?.label || situation?.misEnCause?.misEnCauseType?.label}
              {situation?.misEnCause?.commentaire && ` - ${situation.misEnCause.commentaire}`}
            </p>
          </div>
        )}

        {hasLieu && (
          <div className="fr-col-auto">
            <p className="fr-mb-0">
              <span className="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true" />{' '}
              {situation?.lieuDeSurvenue?.lieuType?.label}
            </p>
          </div>
        )}

        {fait?.motifs?.length > 0 && (
          <div className="fr-col-auto">
            <p className="fr-mb-0">
              <span className="fr-icon-draft-line fr-icon--sm" aria-hidden="true" />{' '}
              {fait.motifs.map((motif) => motif.motif.label).join(', ')}
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
            <p className="fr-mb-1w">
              {situation?.misEnCause?.professionType?.label || situation?.misEnCause?.misEnCauseType?.label}
            </p>
            {situation?.misEnCause?.rpps && (
              <p className="fr-mb-2w">Identité du professionnel ou numéro RPPS : {situation.misEnCause.rpps}</p>
            )}
            {situation?.misEnCause?.commentaire &&
              situation?.misEnCause?.misEnCauseType?.label === misEnCauseTypeLabels.MEMBRE_FAMILLE && (
                <>
                  <p className="fr-text--bold fr-mb-1w">Identité du mis en cause</p>
                  <p className="fr-mb-3w">{situation.misEnCause.commentaire}</p>
                </>
              )}
          </>
        )}

        {hasLieu && (
          <>
            <SectionTitle>Lieu où se sont déroulés les faits</SectionTitle>
            <p className="fr-mb-1w">{situation?.lieuDeSurvenue?.lieuType?.label}</p>
            {situation?.lieuDeSurvenue?.adresse?.label && (
              <p className="fr-mb-1w">{situation.lieuDeSurvenue.adresse.label}</p>
            )}
            {situation?.lieuDeSurvenue?.adresse?.numero && situation?.lieuDeSurvenue?.adresse?.rue && (
              <p className="fr-mb-1w">
                {situation.lieuDeSurvenue.adresse.numero} {situation.lieuDeSurvenue.adresse.rue}
              </p>
            )}
            {situation?.lieuDeSurvenue?.adresse?.codePostal && situation?.lieuDeSurvenue?.adresse?.ville && (
              <p className="fr-mb-2w">
                {situation.lieuDeSurvenue.adresse.codePostal} {situation.lieuDeSurvenue.adresse.ville}
              </p>
            )}
            {situation?.lieuDeSurvenue?.societeTransport && (
              <p className="fr-mb-2w">Société de transport concernée : {situation.lieuDeSurvenue.societeTransport}</p>
            )}
            {situation?.lieuDeSurvenue?.finess && (
              <p className="fr-mb-3w">
                {situation.lieuDeSurvenue.lieuType?.label?.includes('santé')
                  ? "Nom de l'établissement ou code FINESS"
                  : 'Code FINESS'}{' '}
                : {situation.lieuDeSurvenue.finess}
              </p>
            )}
          </>
        )}

        {fait?.maltraitanceTypes && fait.maltraitanceTypes.length > 0 && (
          <>
            <SectionTitle>Motifs renseignés par le déclarant</SectionTitle>
            <ul className="fr-mb-3w">
              {fait.maltraitanceTypes.map((type) => (
                <li key={type.maltraitanceType.label}>{type.maltraitanceType.label}</li>
              ))}
            </ul>
          </>
        )}

        {fait?.motifs && fait.motifs.length > 0 && (
          <>
            <SectionTitle>Motifs qualifiés</SectionTitle>
            <ul className="fr-mb-3w">
              {fait.motifs.map((motif) => (
                <li key={motif.motif.label}>{motif.motif.label}</li>
              ))}
            </ul>
          </>
        )}

        {fait?.consequences && fait.consequences.length > 0 && (
          <>
            <SectionTitle>Conséquences sur la personne</SectionTitle>
            <ul className="fr-mb-3w">
              {fait.consequences.map((consequence) => (
                <li key={consequence.consequence.label}>{consequence.consequence.label}</li>
              ))}
            </ul>
          </>
        )}

        {(fait?.dateDebut || fait?.dateFin) && (
          <>
            <SectionTitle>Période des faits</SectionTitle>
            <p className="fr-mb-3w">
              {fait.dateDebut && `Du ${new Date(fait.dateDebut).toLocaleDateString('fr-FR')}`}
              {fait.dateDebut && fait.dateFin && ' '}
              {fait.dateFin && `au ${new Date(fait.dateFin).toLocaleDateString('fr-FR')}`}
            </p>
          </>
        )}

        {fait?.commentaire && (
          <>
            <SectionTitle>Explication des faits</SectionTitle>
            <p className="fr-mb-3w">{fait.commentaire}</p>
          </>
        )}

        {fait?.autresPrecisions && (
          <>
            <SectionTitle>Autres précisions</SectionTitle>
            <p className="fr-mb-3w">{fait.autresPrecisions}</p>
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
            {situation.demarchesEngagees.demarches.map((demarche) => (
              <div key={demarche.id} className="fr-mb-2w">
                <p className="fr-text--bold fr-mb-1w">{demarche.label}</p>
                {demarche.label === demarcheEngageeLabels.CONTACT_RESPONSABLES && (
                  <>
                    {situation.demarchesEngagees?.dateContactEtablissement && (
                      <p className="fr-mb-1w">
                        Date de prise de contact :{' '}
                        {new Date(situation.demarchesEngagees.dateContactEtablissement).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {situation.demarchesEngagees?.etablissementARepondu && (
                      <p className="fr-mb-1w">Le déclarant a reçu une réponse</p>
                    )}
                  </>
                )}
                {demarche.label === demarcheEngageeLabels.CONTACT_ORGANISME &&
                  situation.demarchesEngagees?.organisme && (
                    <p className="fr-mb-1w">{situation.demarchesEngagees.organisme}</p>
                  )}
                {demarche.label === demarcheEngageeLabels.PLAINTE && (
                  <>
                    {situation.demarchesEngagees?.datePlainte && (
                      <p className="fr-mb-1w">
                        Date du dépôt de plainte :{' '}
                        {new Date(situation.demarchesEngagees.datePlainte).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {situation.demarchesEngagees?.autoriteType?.label && (
                      <p className="fr-mb-1w">Lieu de dépôt : {situation.demarchesEngagees.autoriteType.label}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </>
    );
  };

  return (
    <InfoSection
      id={id}
      title="Lieu, mis en cause et faits"
      onEdit={onEdit}
      canEdit={canEdit}
      renderSummary={renderSummary}
      renderDetails={isFulfilled ? renderDetails : undefined}
      emptyLabel="Aucune information"
      replaceSummaryWithDetails={true}
    />
  );
};
