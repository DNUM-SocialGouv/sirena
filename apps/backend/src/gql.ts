// import { importRequetes } from '@/features/dematSocial/dematSocial.service';

import { e164 } from 'zod/v4';
import { getPractionners } from '@/features/esante/esante.service';
import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage } from '@/libs/asyncLocalStorage';

// async function main() {
//   const logger = createDefaultLogger();
//   await loggerStorage.run(logger, async () => {
//     await importRequetes(new Date('2025-09-16'));
//   });
// }

async function main() {
  const logger = createDefaultLogger();
  await loggerStorage.run(logger, async () => {
    const data = await getPractionners({ ['given:contains']: 'a' });
    // logger.info({ data });
  });
}

main();
