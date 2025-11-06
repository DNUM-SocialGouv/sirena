import { writeFile } from 'node:fs/promises';
import { envVars } from '@/config/env';
import { mapDataForPrisma } from '@/features/dematSocial/dematSocial.adaptater';
import { createRequeteFromDematSocial, getRequeteByDematSocialId } from '@/features/requetes/requetes.service';
import { abortControllerStorage, getLoggerStore, getSentryStore } from '@/libs/asyncLocalStorage';
import {
  ChangerInstructionDocument,
  GetDossierDocument,
  GetDossiersByDateDocument,
  GetDossiersMetadataDocument,
  GetInstructeursDocument,
  graffle,
} from '@/libs/graffle';
import type { Demandeur, DematSocialCivilite } from './dematSocial.type';

export const getInstructeurs = async () => {
  return await graffle.gql(GetInstructeursDocument).send({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY });
};

export const updateInstruction = async (id: string) => {
  const dossierId = Buffer.from(id).toString('base64');
  const instructeurId = Buffer.from(envVars.DEMAT_SOCIAL_INSTRUCTEUR_ID).toString('base64');
  return await graffle.gql(ChangerInstructionDocument).send({ dossierId, instructeurId, disableNotification: true });
};

export const getRequetes = async (createdSince?: Date) => {
  const abortController = abortControllerStorage.getStore();
  const data = await graffle
    .transport({ raw: { signal: abortController?.signal } })
    .gql(GetDossiersByDateDocument)
    .send({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY, createdSince: createdSince?.toISOString() });
  return data?.demarche.dossiers?.nodes?.filter((node) => !!node) || [];
};

export const getRequetesMetaData = async () => {
  const data = await graffle
    .gql(GetDossiersMetadataDocument)
    .send({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY });
  writeFile('./dossiersMetaData.json', JSON.stringify(data, null, 2), 'utf-8');
};

export const getRequete = async (id: number) => {
  return await graffle.gql(GetDossierDocument).send({ dossierNumber: id });
};

type DemandeurData = NonNullable<Awaited<ReturnType<typeof getRequete>>>['dossier']['demandeur'];

export const getDemandeur = (d: DemandeurData, email: string): Demandeur => ({
  nom: d?.__typename === 'PersonnePhysique' ? d.nom : '',
  prenom: d?.__typename === 'PersonnePhysique' ? d.prenom : '',
  civiliteId:
    d?.__typename === 'PersonnePhysique'
      ? d.civilite
        ? (d.civilite.toUpperCase() as DematSocialCivilite)
        : null
      : null,
  email,
});

export const importRequetes = async (createdSince?: Date) => {
  const logger = getLoggerStore();
  if (createdSince) {
    logger.info(`Importing requetes from ${createdSince.toUTCString()}`);
  } else {
    logger.info('Importing all requetes');
  }
  const dossiers = await getRequetes(createdSince);
  let i = 0;
  let errorCount = 0;
  for (const dossier of dossiers) {
    // legacy, we don't support
    // TODO: remove after some time
    if (dossier.number === 247791) {
      continue;
    }
    const isDossierAlreadyImported = await getRequeteByDematSocialId(dossier.number);
    if (isDossierAlreadyImported) {
      continue;
    }
    const update = await updateInstruction(`Dossier-${dossier.number}`);
    if (!update?.dossierPasserEnInstruction?.dossier) {
      const err = update?.dossierPasserEnInstruction?.errors || [];
      logger.warn({ err }, `Failed to change instruction for dossier ${dossier.number}`);
    }
    const data = await getRequete(dossier.number);
    if (!data) {
      errorCount += 1;
      continue;
    }
    try {
      const demandeur = getDemandeur(data.dossier.demandeur, data.dossier.usager.email);
      const requete = mapDataForPrisma(data.dossier.champs, dossier.number, dossier.dateDepot, demandeur);

      const ext = data.dossier.pdf?.filename?.split('.')?.pop() ?? '';

      const pdf = data.dossier.pdf
        ? {
            name: `Requete originale formulaire - ${dossier.number}.${ext}`,
            url: data.dossier.pdf.url,
            size: BigInt(data.dossier.pdf.byteSize),
            mimeType: data.dossier.pdf.contentType || 'application/pdf',
          }
        : null;

      await createRequeteFromDematSocial({ ...requete, pdf });
      i += 1;
    } catch (err) {
      logger.error({ err }, `Error processing dossier ${dossier.number}:`);
      const sentry = getSentryStore();
      sentry.captureException(err);
      errorCount += 1;
    }
  }
  logger.info(`${i} Requete(s) added`);
  return { count: i, errorCount };
};
