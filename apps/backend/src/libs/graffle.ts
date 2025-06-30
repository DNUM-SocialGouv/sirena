import { Graffle } from 'graffle';
import { envVars } from '@/config/env';

export type { RootChampFragmentFragment } from '../../generated/graphql/graphql';
export { GetDossierDocument, GetDossiersDocument, GetDossiersMetadataDocument } from '../../generated/graphql/graphql';

export const graffle = Graffle.create().transport({
  url: envVars.DEMAT_SOCIAL_API_URL,
  headers: {
    Authorization: `Bearer token=${envVars.DEMAT_SOCIAL_API_TOKEN}`,
  },
});
