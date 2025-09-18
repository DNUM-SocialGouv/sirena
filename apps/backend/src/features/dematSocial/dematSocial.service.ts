import { writeFile } from 'node:fs/promises';
import { envVars } from '@/config/env';
import { mapDataForPrisma } from '@/features/dematSocial/dematSocial.adaptater';
import { createOrGetFromDematSocial } from '@/features/requetes/requetes.service';
import { abortControllerStorage } from '@/libs/asyncLocalStorage';
import { GetDossierDocument, GetDossiersByDateDocument, GetDossiersMetadataDocument, graffle } from '@/libs/graffle';

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

export const importRequetes = async (createdSince?: Date) => {
  if (createdSince) {
    console.log(`Importing requetes from ${createdSince.toUTCString()}`);
  } else {
    console.log('Importing all requetes');
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
    const data = await getRequete(dossier.number);
    if (!data) {
      errorCount += 1;
      continue;
    }
    try {
      const requete = mapDataForPrisma(data.dossier.champs, dossier.number, dossier.dateDepot);
      await createOrGetFromDematSocial(requete);
      i += 1;
    } catch (error) {
      console.error(`Error processing dossier ${dossier.number}:`, error);
      errorCount += 1;
    }
  }
  console.log(`${i} Requete(s) added`);
  return { count: i, errorCount };
};
