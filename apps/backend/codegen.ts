import type { CodegenConfig } from '@graphql-codegen/cli';
import { envVars } from './src/config/env.js';

const sharedConfig = {
  useTypeImports: true,
  defaultScalarType: 'any',
  scalars: {
    ISO8601DateTime: 'string',
    ISO8601Date: 'string',
    BigInt: 'bigint',
    URL: 'string',
  },
};

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
    './src/graphql/schema.ts': {
      plugins: ['typescript'],
      config: sharedConfig,
    },
    './src/graphql/graphql.ts': {
      plugins: [{ add: { content: "export * from './schema.js';" } }, 'typescript-operations', 'typed-document-node'],
      config: {
        ...sharedConfig,
        importSchemaTypesFrom: '~./schema.js',
      },
    },
  },
};

export default config;
