import type { CodegenConfig } from '@graphql-codegen/cli';
import { envVars } from './src/config/env.js';

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
    './src/graphql/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        scalars: {
          ISO8601DateTime: 'string',
          ISO8601Date: 'string',
          BigInt: 'bigint',
          URL: 'string',
        },
      },
    },
  },
};

export default config;
