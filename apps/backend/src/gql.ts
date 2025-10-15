import { getInstructeurs, importRequetes, updateInstruction } from '@/features/dematSocial/dematSocial.service';
import { createDefaultLogger } from '@/helpers/pino';
import { loggerStorage } from '@/libs/asyncLocalStorage';

async function main() {
  const logger = createDefaultLogger();
  await loggerStorage.run(logger, async () => {
    // await importRequetes(new Date('2025-09-16'));
    console.log(JSON.stringify(await getInstructeurs()));
    logger.info(await updateInstruction(Buffer.from('Dossier:257065').toString('base64')));
  });
}

main();
