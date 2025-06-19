import type { CodegenConfig } from '@graphql-codegen/cli';
import { envVars } from './src/config/env';

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
  documents: 'src/**/*.graphql',
  generates: {
    './generated/graphql/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
      },
    },
  },
};

export default config;
