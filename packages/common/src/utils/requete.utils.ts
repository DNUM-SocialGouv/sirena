type AutomaticRequestSource = {
  dematSocialId?: number | null;
  sirecId?: number | null;
  thirdPartyAccountId?: string | null;
};

/**
 * A request is created automatically when it originates from an ingestion source
 * (DematSocial, SIREC, third-party API) rather than being entered by an agent.
 */
export const isAutomaticRequest = (requete: AutomaticRequestSource | null | undefined): boolean =>
  requete != null && (requete.dematSocialId != null || requete.sirecId != null || requete.thirdPartyAccountId != null);
