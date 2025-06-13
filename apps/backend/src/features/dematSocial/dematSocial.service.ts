import { envVars } from '@/config/env';
import { sdk } from '@/libs/gql';

export const getRequetes = async () => {
  const data = await sdk.getDossiers({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY });
  console.log(data);
};
