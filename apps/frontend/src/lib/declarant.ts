import { mappers } from '@sirena/common';
import type { client } from './api/hc';

type RequeteEntiteGetResponse = Awaited<
  ReturnType<Awaited<ReturnType<(typeof client)['requetes-entite'][':id']['$get']>>['json']>
>['data'];

type DeclarantFromAPI = NonNullable<NonNullable<RequeteEntiteGetResponse['requete']>['declarant']>;

function formatDeclarantFromServerImpl(declarant: DeclarantFromAPI) {
  const identite = declarant.identite ?? null;
  const adresse = declarant.adresse ?? null;
  const civiliteId = identite?.civilite?.id || identite?.civiliteId || '';

  return {
    civilite: mappers.mapCiviliteToFrontend(civiliteId),
    nom: identite?.nom || '',
    prenom: identite?.prenom || '',
    lienAvecPersonneConcernee:
      declarant.lienVictime?.id || declarant.lienVictimeId || (declarant.lienAutrePrecision ? 'AUTRE' : ''),
    lienAvecPersonneConcerneePrecision: declarant.lienAutrePrecision ?? '',
    adresseDomicile: `${adresse?.numero || ''} ${adresse?.rue || ''}`,
    codePostal: adresse?.codePostal || '',
    ville: adresse?.ville || '',
    numeroTelephone: identite?.telephone || '',
    courrierElectronique: identite?.email || '',
    estPersonneConcernee: declarant.estVictime || false,
    consentCommuniquerIdentite: declarant.veutGarderAnonymat === null ? undefined : !declarant.veutGarderAnonymat,
    estSignalementProfessionnel: declarant.estSignalementProfessionnel || false,
    autresPrecisions: declarant.commentaire || '',
  };
}

export type DeclarantData = Partial<ReturnType<typeof formatDeclarantFromServerImpl>>;

export function formatDeclarantFromServer(declarant: unknown): DeclarantData {
  if (!declarant || typeof declarant !== 'object') return {};
  return formatDeclarantFromServerImpl(declarant as DeclarantFromAPI);
}
