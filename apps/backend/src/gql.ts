import { importRequetes } from './features/dematSocial/dematSocial.service.js';
import { createDefaultLogger } from './helpers/pino.js';
import { loggerStorage } from './libs/asyncLocalStorage.js';

async function main() {
  const logger = createDefaultLogger();
  await loggerStorage.run(logger, async () => {
    await importRequetes(new Date('2025-09-16'));
  });
}

main();
