type MisEnCauseInput = {
  civilite?: string | null;
  nom?: string | null;
  prenom?: string | null;
  misEnCauseTypePrecision?: { label?: string | null } | null;
  misEnCauseType?: { label?: string | null } | null;
} | null;

type SituationInput = {
  misEnCause?: MisEnCauseInput;
};

type OtherEntityInput = {
  nomComplet: string;
  statutId: string;
};

type BuildClosingContextMessageInput = {
  requestId: string;
  receptionDate?: string | Date | null;
  situations?: SituationInput[] | null;
  otherEntitiesAffected?: OtherEntityInput[] | null;
};

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return '';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
};

const buildMisEnCauseLabel = (misEnCause: MisEnCauseInput) => {
  if (!misEnCause) return 'non renseigné';

  const identity = [misEnCause.civilite, misEnCause.nom, misEnCause.prenom].filter(Boolean).join(' ').trim();

  return identity || misEnCause.misEnCauseTypePrecision?.label || misEnCause.misEnCauseType?.label || 'non renseigné';
};

export const buildClosingContextMessage = ({
  requestId,
  receptionDate,
  situations = [],
  otherEntitiesAffected = [],
}: BuildClosingContextMessageInput) => {
  const misEnCauseLabels = [
    ...new Set((situations ?? []).map((situation) => buildMisEnCauseLabel(situation.misEnCause ?? null))),
  ];
  const misEnCauseText = misEnCauseLabels.length > 0 ? misEnCauseLabels.join(', ') : 'non renseigné';
  const activeOtherEntities = (otherEntitiesAffected ?? []).filter((entity) =>
    ['NOUVEAU', 'EN_COURS'].includes(entity.statutId),
  );
  const continuationSentence = activeOtherEntities.length
    ? ` Le traitement de la requête sera toujours en cours au ${activeOtherEntities.map((entity) => entity.nomComplet).join(', ')}.`
    : '';

  if (!continuationSentence) {
    return `Information : vous allez clôturer la requête ${requestId}.`;
  }

  return `Vous allez clôturer la requête ${requestId} reçue le ${formatDate(receptionDate)} avec pour mis en cause ${misEnCauseText}.${continuationSentence}`;
};
