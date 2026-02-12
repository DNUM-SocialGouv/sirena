import fs from 'node:fs';
import { Scalar } from '@scalar/hono-api-reference';
import type { Hono } from 'hono';
import type { GenerateSpecOptions } from 'hono-openapi';
import { generateSpecs, openAPIRouteHandler } from 'hono-openapi';
import type { AppBindings } from './helpers/factories/appWithLogs.js';

type Documentation = GenerateSpecOptions['documentation'];

const getServerUrl = () => {
  const frontendUri = process.env.FRONTEND_URI || '<url>';
  return `${frontendUri}/api/third-party`;
};

const getThirdPartyDocumentation = (): Documentation => ({
  openapi: '3.1.0',
  info: {
    title: 'Sirena Third-Party API',
    version: '1.0.0',
    description: 'Sirena third-party integration API - requires API key authentication',
  },
  servers: [
    {
      url: getServerUrl(),
      description: 'Third-party API server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for third-party authentication',
      },
    },
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  paths: {},
});

export function setupThirdPartyOpenAPI(
  app: Hono<AppBindings>,
  thirdPartyApp: Hono<AppBindings>,
  prefix = '/openapi/third-party',
) {
  app.get(
    `${prefix}/spec`,
    openAPIRouteHandler(thirdPartyApp, {
      documentation: getThirdPartyDocumentation(),
    }),
  );

  // OpenAPI UI with Scalar
  app.get(
    `${prefix}/ui`,
    Scalar({
      theme: 'deepSpace',
      url: `/api${prefix}/spec`,
    }),
  );
}

export async function generateThirdPartySwaggerDocs(thirdPartyApp: Hono<AppBindings>) {
  const spec = await generateSpecs(thirdPartyApp, {
    documentation: getThirdPartyDocumentation(),
  });
  const pathToSpec = './src/swagger/openAPI-thirdparty.json';
  fs.writeFileSync(pathToSpec, JSON.stringify(spec, null, 2));
}
