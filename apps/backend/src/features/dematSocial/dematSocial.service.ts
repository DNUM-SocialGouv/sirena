import { writeFile } from 'node:fs/promises';
import { envVars } from '@/config/env';
import { GetDossierDocument, GetDossiersDocument, GetDossiersMetadataDocument, graffle } from '@/libs/graffle';

export const getRequetes = async () => {
  console.time('getRequetes');
  const data = await graffle.gql(GetDossiersDocument).send({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY });
  console.timeEnd('getRequetes');
  console.log('Data from graffle:', data?.demarche.dossiers.edges);
  writeFile('./dossiers.json', JSON.stringify(data, null, 2), 'utf-8');
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
