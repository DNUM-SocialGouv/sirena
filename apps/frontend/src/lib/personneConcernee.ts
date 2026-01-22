import { mappers } from '@sirena/common';

export interface PersonneConcerneeData {
  civilite?: string;
  nom?: string;
  prenom?: string;
  age?: string;
  adresseDomicile?: string;
  codePostal?: string;
  ville?: string;
  numeroTelephone?: string;
  courrierElectronique?: string;
  estHandicapee?: boolean;
  consentCommuniquerIdentite?: boolean;
  estVictimeInformee?: boolean;
  autrePersonnes?: string;
  aAutrePersonnes?: boolean;
  commentaire?: string;
}

export function formatPersonneConcerneeFromServer(participant: unknown): PersonneConcerneeData {
  if (!participant || typeof participant !== 'object') return {};

  const p = participant as Record<string, unknown>;
  const identite = (p.identite as Record<string, unknown>) || {};
  const adresse = (p.adresse as Record<string, unknown>) || {};

  return {
    civilite: mappers.mapCiviliteToFrontend(identite.civiliteId as string),
    nom: (identite.nom as string) || '',
    prenom: (identite.prenom as string) || '',
    age: (p.age as { id: string })?.id || '',
    adresseDomicile: `${adresse.numero || ''} ${adresse.rue || ''}`,
    codePostal: (adresse.codePostal as string) || '',
    ville: (adresse.ville as string) || '',
    numeroTelephone: (identite.telephone as string) || '',
    courrierElectronique: (identite.email as string) || '',
    estHandicapee: (p.estHandicapee as boolean) || false,
    consentCommuniquerIdentite:
      (p.veutGarderAnonymat as boolean | null | undefined) === null ||
      (p.veutGarderAnonymat as boolean | null | undefined) === undefined
        ? undefined
        : !(p.veutGarderAnonymat as boolean),
    estVictimeInformee: (p.estVictimeInformee as boolean) || false,
    autrePersonnes: (p.autrePersonnes as string) || '',
    commentaire: (p.commentaire as string) || '',
  };
}

export function formatPersonneConcerneeToServer(data: PersonneConcerneeData) {
  return {
    civilite: data.civilite,
    nom: data.nom,
    prenom: data.prenom,
    age: data.age,
    adresseDomicile: data.adresseDomicile,
    codePostal: data.codePostal,
    ville: data.ville,
    numeroTelephone: data.numeroTelephone,
    courrierElectronique: data.courrierElectronique,
    estHandicapee: data.estHandicapee,
    consentCommuniquerIdentite: data.consentCommuniquerIdentite,
    estVictimeInformee: data.estVictimeInformee,
    autrePersonnes: data.autrePersonnes,
    aAutrePersonnes: data.aAutrePersonnes,
    commentaire: data.commentaire,
  };
}
