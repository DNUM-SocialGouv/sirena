import fs from 'node:fs';
import { Scalar } from '@scalar/hono-api-reference';
import type { Hono } from 'hono';
import { generateSpecs, openAPISpecs } from 'hono-openapi';
import type { AppBindings } from './helpers/factories/appWithLogs';

export function setupOpenAPI(app: Hono<AppBindings>, prefix = '/openapi') {
  // OpenAPI spec
  app.get(
    `${prefix}/spec`,
    openAPISpecs(app, {
      documentation: {
        info: {
          title: 'Sirena backend',
          version: '1.0.0',
          description: 'Sirena backend API',
        },
        servers: [
          {
            url: '/api',
            description: 'API server',
          },
        ],
      },
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

export async function generateSwaggerDocs(app: Hono<AppBindings>) {
  setupOpenAPI(app, '/docs');
  const spec = await generateSpecs(app);
  const pathToSpec = './src/swagger/openAPI.json';
  fs.writeFileSync(pathToSpec, JSON.stringify(spec, null, 2));
}
