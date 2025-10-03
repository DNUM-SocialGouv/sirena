export interface FieldMetadata {
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea';
}

export const declarantFieldMetadata: Record<string, FieldMetadata> = {
  civilite: { label: 'Civilité', type: 'select' },
  nom: { label: 'Nom', type: 'text' },
  prenom: { label: 'Prénom', type: 'text' },
  lienAvecPersonneConcernee: { label: 'Lien avec la personne concernée', type: 'select' },
  lienAvecPersonneConcerneePrecision: { label: 'Précision sur le lien', type: 'text' },
  adresseDomicile: { label: 'Adresse du domicile', type: 'text' },
  codePostal: { label: 'Code postal', type: 'text' },
  ville: { label: 'Ville', type: 'text' },
  numeroTelephone: { label: 'Numéro de téléphone', type: 'tel' },
  courrierElectronique: { label: 'Courrier électronique', type: 'email' },
  neSouhaitePasCommuniquerIdentite: {
    label: 'Le déclarant ne souhaite pas que son identité soit communiquée',
    type: 'checkbox',
  },
  autresPrecisions: { label: 'Autres précisions', type: 'textarea' },
};

export function getFieldLabel(
  fieldName: string,
  metadata: Record<string, FieldMetadata> = declarantFieldMetadata,
): string {
  return metadata[fieldName]?.label || fieldName;
}
