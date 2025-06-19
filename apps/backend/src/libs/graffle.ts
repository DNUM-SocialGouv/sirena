import { envVars } from '@/config/env';
import { Graffle } from 'graffle';
export { GetDossiersMetadataDocument, GetDossiersDocument, GetDossierDocument } from '../../generated/graphql/graphql';
export type { RootChampFragmentFragment } from '../../generated/graphql/graphql';

export const graffle = Graffle.create().transport({
  url: envVars.DEMAT_SOCIAL_API_URL,
  headers: {
    Authorization: `Bearer token=${envVars.DEMAT_SOCIAL_API_TOKEN}`,
  },
});
