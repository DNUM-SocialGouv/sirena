export interface FieldMetadata {
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea' | 'radio';
}

export const declarantFieldMetadata: Record<string, FieldMetadata> = {
  civilite: { label: 'Civilité', type: 'select' },
  nom: { label: 'Nom', type: 'text' },
  prenom: { label: 'Prénom', type: 'text' },
  lienAvecPersonneConcernee: { label: 'Lien avec la personne concernée', type: 'select' },
  isTuteur: { label: 'Le déclarant est curateur ou tuteur de la personne concernée', type: 'checkbox' },
  lienAvecPersonneConcerneePrecision: { label: 'Précision sur le lien', type: 'text' },
  adresseDomicile: { label: 'Adresse du domicile', type: 'text' },
  codePostal: { label: 'Code postal', type: 'text' },
  ville: { label: 'Ville', type: 'text' },
  numeroTelephone: { label: 'Numéro de téléphone', type: 'tel' },
  courrierElectronique: { label: 'Courrier électronique', type: 'email' },
  consentCommuniquerIdentite: {
    label: 'Le déclarant consent à ce que son identité soit communiquée',
    type: 'radio',
  },
  estSignalementProfessionnel: {
    label:
      'Le déclarant est un professionnel qui signale des dysfonctionnements et événements indésirables graves (EIG)',
    type: 'radio',
  },
  autresPrecisions: { label: 'Autres précisions concernant le déclarant', type: 'textarea' },
};

export const personneConcerneeFieldMetadata: Record<string, FieldMetadata> = {
  civilite: { label: 'Civilité', type: 'select' },
  nom: { label: 'Nom', type: 'text' },
  prenom: { label: 'Prénom', type: 'text' },
  age: { label: 'Âge', type: 'select' },
  dateNaissance: { label: 'Date de naissance', type: 'text' },
  adresseDomicile: { label: 'Adresse du domicile', type: 'text' },
  codePostal: { label: 'Code postal', type: 'text' },
  ville: { label: 'Ville', type: 'text' },
  numeroTelephone: { label: 'Numéro de téléphone', type: 'tel' },
  courrierElectronique: { label: 'Courrier électronique', type: 'email' },
  estHandicapee: { label: "La personne concernée est en situation d'handicap", type: 'radio' },
  consentCommuniquerIdentite: { label: 'Elle consent à ce que son identité soit communiquée', type: 'radio' },
  estVictimeInformee: { label: 'Elle a été informée de la démarche par le déclarant', type: 'radio' },
  victimeInformeeCommentaire: { label: "Raison pour laquelle elle n'est pas informée", type: 'text' },
  autrePersonnes: { label: 'Précisions sur les autres personnes concernées', type: 'textarea' },
  aAutrePersonnes: { label: "Il y a d'autres personnes concernées par la requête", type: 'radio' },
  commentaire: { label: 'Autres précisions sur la personne concernée', type: 'textarea' },
};

export function getFieldLabel(
  fieldName: string,
  metadata: Record<string, FieldMetadata> = declarantFieldMetadata,
): string {
  return metadata[fieldName]?.label || fieldName;
}
