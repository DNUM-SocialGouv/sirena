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
          lieuType: lieuDeSurvenue.lieuType?.id || undefined,
          lieuPrecision: lieuDeSurvenue.lieuPrecision || undefined,
          codePostal: lieuDeSurvenue.codePostal || undefined,
          societeTransport: lieuDeSurvenue.societeTransport || undefined,
          finess: lieuDeSurvenue.finess || undefined,
          adresse: adresse
            ? {
                label: adresse.label || undefined,
                codePostal: adresse.codePostal || undefined,
                ville: adresse.ville || undefined,
              }
            : undefined,
        }
      : undefined,
    misEnCause: misEnCause
      ? {
          misEnCauseType: misEnCause.misEnCauseType?.id || undefined,
          misEnCausePrecision: misEnCause.misEnCauseTypePrecision?.id || undefined,
          rpps: misEnCause.rpps || undefined,
          commentaire: misEnCause.commentaire || undefined,
        }
      : undefined,
    fait: fait
      ? {
          motifs: fait.motifs?.map((m) => m.motif.id) || undefined,
          motifsDeclaratifs: fait.motifsDeclaratifs.map((m) => m.motifDeclaratifId) || undefined,
          maltraitanceTypes: fait.maltraitanceTypes?.map((mt) => mt.maltraitanceType.id) || undefined,
          commentaire: fait.commentaire || undefined,
          dateDebut: fait.dateDebut ? new Date(fait.dateDebut).toISOString().split('T')[0] : undefined,
          dateFin: fait.dateFin ? new Date(fait.dateFin).toISOString().split('T')[0] : undefined,
          autresPrecisions: fait.autresPrecisions || undefined,
          consequences: fait.consequences?.map((c) => c.consequence.id) || undefined,
          fileIds: fait.fichiers?.map((f) => f.id) || undefined,
          files: formatFilesFromServer(fait.fichiers),
        }
      : undefined,
    demarchesEngagees: demarchesEngagees
      ? {
          demarches: demarchesEngagees.demarches?.map((d) => d.id) || undefined,
          dateContactResponsables: demarchesEngagees.dateContactEtablissement
            ? new Date(demarchesEngagees.dateContactEtablissement).toISOString().split('T')[0]
            : undefined,
          reponseRecueResponsables: demarchesEngagees.etablissementARepondu ?? undefined,
          precisionsOrganisme: demarchesEngagees.organisme || undefined,
          lieuDepotPlainte: demarchesEngagees.autoriteType?.id || undefined,
          dateDepotPlainte: demarchesEngagees.datePlainte
            ? new Date(demarchesEngagees.datePlainte).toISOString().split('T')[0]
            : undefined,
        }
      : undefined,
    traitementDesFaits: situation.traitementDesFaits,
  };
}
