import type { SituationData } from '@sirena/common/schemas';
import { formatFilesFromServer } from '@/utils/fileHelpers';
import type { client } from './api/hc';

type RequeteGetResponse = Awaited<
  ReturnType<Awaited<ReturnType<(typeof client)['requetes-entite'][':id']['$get']>>['json']>
>['data'];

type SituationFromAPI = NonNullable<NonNullable<RequeteGetResponse['requete']>['situations']>[number];

export function formatSituationFromServer(situation: SituationFromAPI | undefined): SituationData {
  if (!situation) {
    return {};
  }

  const lieuDeSurvenue = situation.lieuDeSurvenue;
  const adresse = lieuDeSurvenue?.adresse;
  const misEnCause = situation.misEnCause;
  const [fait] = situation.faits ?? [];
  const demarchesEngagees = situation.demarchesEngagees;

  return {
    lieuDeSurvenue: lieuDeSurvenue
      ? {
          lieuType: lieuDeSurvenue.lieuTypeId || undefined,
          adresse: adresse?.label || undefined,
          numero: adresse?.numero || undefined,
          rue: adresse?.rue || undefined,
          codePostal: lieuDeSurvenue.codePostal || adresse?.codePostal || undefined,
          ville: adresse?.ville || undefined,
          transportType: lieuDeSurvenue.transportTypeId || undefined,
          societeTransport: lieuDeSurvenue.societeTransport || undefined,
          finess: lieuDeSurvenue.finess || undefined,
          commentaire: lieuDeSurvenue.commentaire || undefined,
        }
      : undefined,
    misEnCause: misEnCause
      ? {
          misEnCauseType: misEnCause.misEnCauseTypeId || undefined,
          professionType: misEnCause.professionTypeId || undefined,
          professionDomicileType: misEnCause.professionDomicileTypeId || undefined,
          rpps: misEnCause.rpps || undefined,
          commentaire: misEnCause.commentaire || undefined,
        }
      : undefined,
    fait: fait
      ? {
          maltraitanceTypes: fait.maltraitanceTypes?.map((mt) => mt.maltraitanceType.id) || undefined,
          sousMotifs: fait.motifs?.map((m) => m.motif.label) || undefined,
          commentaire: fait.commentaire || undefined,
          dateDebut: fait.dateDebut ? new Date(fait.dateDebut).toISOString().split('T')[0] : undefined,
          dateFin: fait.dateFin ? new Date(fait.dateFin).toISOString().split('T')[0] : undefined,
          autresPrecisions: undefined,
          consequences: fait.consequences?.map((c) => c.consequence.id) || undefined,
          fileIds: fait.fichiers?.map((f) => f.id) || undefined,
          files: formatFilesFromServer(fait.fichiers),
        }
      : undefined,
    demarchesEngagees: demarchesEngagees
      ? {
          demarches: demarchesEngagees.demarches?.map((d) => d.id) || undefined,
          dateContactEtablissement: demarchesEngagees.dateContactEtablissement
            ? new Date(demarchesEngagees.dateContactEtablissement).toISOString().split('T')[0]
            : undefined,
          etablissementARepondu: demarchesEngagees.etablissementARepondu ?? undefined,
          organisme: demarchesEngagees.organisme || undefined,
          autoriteType: demarchesEngagees.autoriteTypeId || undefined,
          datePlainte: demarchesEngagees.datePlainte
            ? new Date(demarchesEngagees.datePlainte).toISOString().split('T')[0]
            : undefined,
          commentaire: demarchesEngagees.commentaire || undefined,
        }
      : undefined,
  };
}
