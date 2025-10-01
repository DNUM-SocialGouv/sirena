import { mappers } from '@sirena/common';
import type { DeclarantData as DeclarantDataType } from '@sirena/common/schemas';

export type DeclarantData = DeclarantDataType & Record<string, unknown>;

export function formatDeclarantFromServer(declarant: unknown): DeclarantData {
  if (!declarant || typeof declarant !== 'object') return {};

  const decl = declarant as Record<string, unknown>;
  const identite = (decl.identite as Record<string, unknown>) || {};
  const adresse = (decl.adresse as Record<string, unknown>) || {};
  const lienVictime = (decl.lienVictime as Record<string, unknown>) || {};

  const civiliteObj = identite.civilite as Record<string, unknown> | undefined;
  const civiliteId = (civiliteObj?.id as string) || (identite.civiliteId as string) || '';

  return {
    civilite: mappers.mapCiviliteToFrontend(civiliteId),
    nom: (identite.nom as string) || '',
    prenom: (identite.prenom as string) || '',
    lienAvecPersonneConcernee:
      (lienVictime.id as string) ||
      (decl.lienVictimeId as string) ||
      ((decl.lienAutrePrecision as string) ? 'AUTRE' : ''),
    lienAvecPersonneConcerneePrecision: (decl.lienAutrePrecision as string) ?? '',
    adresseDomicile: (adresse.label as string) || '',
    codePostal: (adresse.codePostal as string) || '',
    ville: (adresse.ville as string) || '',
    numeroTelephone: (identite.telephone as string) || '',
    courrierElectronique: (identite.email as string) || '',
    estPersonneConcernee: (decl.estVictime as boolean) || false,
    neSouhaitePasCommuniquerIdentite: (decl.veutGarderAnonymat as boolean) || false,
    autresPrecisions: (decl.commentaire as string) || '',
  };
}
