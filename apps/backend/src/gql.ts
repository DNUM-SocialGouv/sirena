import { importRequetes } from '@/features/dematSocial/dematSocial.service';
import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage } from '@/libs/asyncLocalStorage';

async function main() {
  const logger = createDefaultLogger();
  await loggerStorage.run(logger, async () => {
    await importRequetes(new Date('2025-09-16'));
  });
}

main();
