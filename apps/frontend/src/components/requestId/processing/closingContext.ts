type OtherEntityInput = {
  nomComplet: string;
  statutId: string;
};

type BuildClosingContextInput = {
  requestId: string;
  otherEntitiesAffected?: OtherEntityInput[] | null;
};

export const getActiveOtherEntityNames = ({
  otherEntitiesAffected = [],
}: Pick<BuildClosingContextInput, 'otherEntitiesAffected'>) =>
  (otherEntitiesAffected ?? [])
    .filter((entity) => ['NOUVEAU', 'EN_COURS'].includes(entity.statutId))
    .map((entity) => entity.nomComplet);

export const buildClosingContextMessage = ({ requestId }: BuildClosingContextInput) =>
  `Information : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête ${requestId}.`;
