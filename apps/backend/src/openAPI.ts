import fs from 'node:fs';
import { Scalar } from '@scalar/hono-api-reference';
import type { Hono } from 'hono';
import { generateSpecs, openAPISpecs } from 'hono-openapi';
import type { AppBindingsLogs } from './helpers/factories/appWithLogs.ts';

export function setupOpenAPI(app: Hono<AppBindingsLogs>, prefix = '/openapi') {
  // OpenAPI spec
  app.get(
    `${prefix}/spec`,
    openAPISpecs(app, {
      documentation: {
        info: {
          title: `starter-monorepo's backend`,
          version: '1.0.0',
          description: 'My amazing API',
        },
      },
    }),
  );

  // OpenAPI UI with Scalar
  app.get(
    `${prefix}/ui`,
    Scalar({
      theme: 'deepSpace',
      url: `${prefix}/spec`,
    }),
  );
}

export async function generateSwaggerDocs(app: Hono<AppBindingsLogs>) {
  setupOpenAPI(app, '/docs');
  const spec = await generateSpecs(app);
  const pathToSpec = './src/swagger/openAPI.json';
  fs.writeFileSync(pathToSpec, JSON.stringify(spec, null, 2));
}
