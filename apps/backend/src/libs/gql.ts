import { envVars } from '@/config/env';
import { GraphQLClient } from 'graphql-request';
import { getSdk } from '../../generated/graphql/graphql';

const client = new GraphQLClient(envVars.DEMAT_SOCIAL_API_URL, {
  headers: {
    Authorization: envVars.DEMAT_SOCIAL_API_TOKEN,
  },
});

export const sdk = getSdk(client);
