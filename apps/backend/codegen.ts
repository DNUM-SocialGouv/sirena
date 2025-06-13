import { envVars } from '@/config/env';
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      [envVars.DEMAT_SOCIAL_API_URL]: {
        headers: {
          Authorization: envVars.DEMAT_SOCIAL_API_TOKEN,
          'Content-type': 'application/json',
        },
      },
    },
  ],
  documents: 'src/**/*.ts',
  generates: {
    './generated/graphql/': {
      preset: 'client',
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
    },
    './generated/graphql/schema.graphql': {
      plugins: ['schema-ast'],
    },
  },
};

export default config;
