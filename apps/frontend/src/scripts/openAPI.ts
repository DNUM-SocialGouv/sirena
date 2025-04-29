import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import swaggerSpec from '@sirena/backend/swagger';
import openapiTS, { astToString } from 'openapi-typescript';

async function generateTypes() {
  const output = resolve('src/types/openapi.d.ts');
  console.log('Generating OpenAPI types...');
  const result = await openapiTS(JSON.stringify(swaggerSpec));
  const typeDefinitions = typeof result === 'string' ? result : astToString(result);
  writeFileSync(output, typeDefinitions);
  console.log(`✅ OpenAPI types written to ${output}`);
}
generateTypes().catch((err) => {
  console.error('❌ Failed to generate OpenAPI types:', err);
});
