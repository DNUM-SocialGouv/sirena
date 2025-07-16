import { writeFile } from 'node:fs/promises';
import { envVars } from '@/config/env';
import { createRequeteFromDematSocial } from '@/features/requetes/requetes.service';
import { GetDossierDocument, GetDossiersByDateDocument, GetDossiersMetadataDocument, graffle } from '@/libs/graffle';

export const getRequetes = async (createdSince?: Date) => {
  const data = await graffle
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
  const dossiers = await getRequetes(createdSince);
  for (const dossier of dossiers) {
    // const data = await getRequete(dossier.number);
    await createRequeteFromDematSocial({
      dematSocialId: dossier.number,
    });
  }
};
