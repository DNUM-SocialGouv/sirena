import { writeFile } from 'node:fs/promises';
import { envVars } from '@/config/env';
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
  console.time('getRequetesMetaData');
  const data = await graffle
    .gql(GetDossiersMetadataDocument)
    .send({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY });
  console.timeEnd('getRequetesMetaData');
  console.log('Data from graffle:', data?.demarche.dossiers.edges);
  writeFile('./dossiersMetaData.json', JSON.stringify(data, null, 2), 'utf-8');
};

export const getRequete = async (id: number) => {
  console.time('getRequete');
  const data = await graffle.gql(GetDossierDocument).send({ dossierNumber: id });
  console.timeEnd('getRequete');
  console.log('Data from graffle:', data);
  writeFile('./209940.json', JSON.stringify(data, null, 2), 'utf-8');
};

export const importRequetes = async (createdSince?: Date) => {
  if (createdSince) {
    console.log(`Importing requetes from ${createdSince.toUTCString()}`);
  } else {
    console.log('Importing all requetes');
  }
  const dossiers = await getRequetes(createdSince);
  let i = 0;
  for (const dossier of dossiers) {
    // const data = await getRequete(dossier.number);
    const requete = await createOrGetFromDematSocial({
      dematSocialId: dossier.number,
      createdAt: new Date(dossier.dateDepot),
    });

    if (requete) {
      i += 1;
    }
  }
  console.log(`${i} Requete(s) added`);
  return { count: i };
};
