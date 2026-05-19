type OtherEntityInput = {
  nomComplet: string;
  statutId: string;
};

type BuildClosingContextMessageInput = {
  requestId: string;
  otherEntitiesAffected?: OtherEntityInput[] | null;
};

export const buildClosingContextMessage = ({
  requestId,
  otherEntitiesAffected = [],
}: BuildClosingContextMessageInput) => {
  const activeOtherEntities = (otherEntitiesAffected ?? []).filter((entity) =>
    ['NOUVEAU', 'EN_COURS'].includes(entity.statutId),
  );
  const continuationSentence = activeOtherEntities.length
    ? ` Le traitement de la requête sera toujours en cours pour l'entité administrative ${activeOtherEntities.map((entity) => entity.nomComplet).join(', ')}.`
    : '';

  return `Information : vous allez clôturer la requête ${requestId}.${continuationSentence}`;
};
