import { mappers } from '@sirena/common';
import {
  ageLabels,
  autoriteTypeLabels,
  autreProfessionnelPrecisionLabels,
  civiliteLabels,
  consequenceLabels,
  demarcheEngageeLabels,
  domainesFonctionnelsLabels,
  lienVictimeLabels,
  lieuAutresEtablissementsPrecisionLabels,
  lieuDomicilePrecisionLabels,
  lieuEtablissementHandicapPrecisionLabels,
  lieuEtablissementPersonnesAgeesPrecisionLabels,
  lieuEtablissementSantePrecisionLabels,
  lieuEtablissementSocialPrecisionLabels,
  lieuTrajetPrecisionLabels,
  lieuTypeLabels,
  MESURE_PROTECTION,
  maltraitanceTypeLabels,
  misEnCauseAutreNonProPrecisionLabels,
  misEnCauseEtablissementPrecisionLabels,
  misEnCauseFamillePrecisionLabels,
  misEnCauseProchePrecisionLabels,
  misEnCauseTypeLabels,
  motifLabels,
  motifLabelsById,
  professionSantePrecisionLabels,
  professionSocialPrecisionLabels,
  receptionTypeLabels,
  reponseOuiNonLabels,
  requeteProvenanceLabels,
  transportTypeLabels,
} from '@sirena/common/constants';

export interface FieldMetadata {
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea' | 'radio';
  /** Renders a stored value the way the form displays it, so conflicts are arbitrated on labels, not on codes. */
  format?: (value: unknown) => string;
}

/** Matches what ConflictResolutionDialog shows for a blank value, so a formatter can be called on anything. */
const EMPTY_VALUE_LABEL = '(vide)';

const isNullish = (value: unknown): boolean => value === null || value === undefined;

const formatFromLabels =
  (labels: Record<string, string>) =>
  (value: unknown): string =>
    labels[String(value)] ?? String(value);

const formatDate = (value: unknown): string => {
  if (isNullish(value)) return EMPTY_VALUE_LABEL;

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('fr-FR');
};

const civiliteLabelsByFormValue = Object.fromEntries(
  mappers.civiliteOptions.map(({ value, label }) => [value, label]),
) as Record<string, string>;

// Mirrors the options offered by PersonneConcerneeForm; the shared constants only expose sentence-shaped labels.
const mesureProtectionLabels: Record<string, string> = {
  [MESURE_PROTECTION.MANDATAIRE_JUDICIAIRE]: 'Mandataire judiciaire',
  [MESURE_PROTECTION.MANDATAIRE_FAMILIAL]: 'Mandataire familial',
  [MESURE_PROTECTION.NON]: 'Non',
  [MESURE_PROTECTION.NON_RENSEIGNE]: reponseOuiNonLabels.NON_RENSEIGNE,
};

const formatCivilite = formatFromLabels(civiliteLabelsByFormValue);
const formatReponseOuiNon = formatFromLabels(reponseOuiNonLabels);

export const declarantFieldMetadata: Record<string, FieldMetadata> = {
  civilite: { label: 'Civilité', type: 'select', format: formatCivilite },
  nom: { label: 'Nom', type: 'text' },
  prenom: { label: 'Prénom', type: 'text' },
  lienAvecPersonneConcernee: {
    label: 'Lien avec la personne concernée',
    type: 'select',
    format: formatFromLabels(lienVictimeLabels),
  },
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
    format: formatReponseOuiNon,
  },
  estSignalementProfessionnel: {
    label:
      'Le déclarant est un professionnel qui signale des dysfonctionnements et événements indésirables graves (EIG)',
    type: 'radio',
    format: formatReponseOuiNon,
  },
  autresPrecisions: { label: 'Autres précisions concernant le déclarant', type: 'textarea' },
};

export const personneConcerneeFieldMetadata: Record<string, FieldMetadata> = {
  civilite: { label: 'Civilité', type: 'select', format: formatCivilite },
  nom: { label: 'Nom', type: 'text' },
  prenom: { label: 'Prénom', type: 'text' },
  age: { label: 'Âge', type: 'select', format: formatFromLabels(ageLabels) },
  dateNaissance: { label: 'Date de naissance', type: 'text', format: formatDate },
  adresseDomicile: { label: 'Adresse du domicile', type: 'text' },
  codePostal: { label: 'Code postal', type: 'text' },
  ville: { label: 'Ville', type: 'text' },
  numeroTelephone: { label: 'Numéro de téléphone', type: 'tel' },
  courrierElectronique: { label: 'Courrier électronique', type: 'email' },
  estHandicapee: {
    label: "La personne concernée est en situation d'handicap",
    type: 'radio',
    format: formatReponseOuiNon,
  },
  consentCommuniquerIdentite: {
    label: 'La personne concernée consent à ce que son identité soit communiquée',
    type: 'radio',
    format: formatReponseOuiNon,
  },
  estVictimeInformee: {
    label: 'La personne concernée a été informée de la démarche par le déclarant',
    type: 'radio',
    format: formatReponseOuiNon,
  },
  victimeInformeeCommentaire: { label: "Raison pour laquelle elle n'est pas informée", type: 'text' },
  autrePersonnes: { label: 'Précisions sur les autres personnes concernées', type: 'textarea' },
  aAutrePersonnes: {
    label: "Il y a d'autres personnes concernées par la requête",
    type: 'radio',
    format: formatReponseOuiNon,
  },
  mesureProtection: {
    label: 'La personne concernée est en mesure de protection',
    type: 'radio',
    format: formatFromLabels(mesureProtectionLabels),
  },
  commentaire: { label: 'Autres précisions sur la personne concernée', type: 'textarea' },
};

export const requeteDateTypeFieldMetadata: Record<string, FieldMetadata> = {
  receptionDate: { label: 'Date de réception', type: 'text', format: formatDate },
  dateDemandeDeclarant: { label: 'Date de la demande par le déclarant', type: 'text', format: formatDate },
  receptionTypeId: { label: 'Mode de réception', type: 'select', format: formatFromLabels(receptionTypeLabels) },
  provenanceId: { label: 'Provenance', type: 'select', format: formatFromLabels(requeteProvenanceLabels) },
  provenancePrecision: { label: 'Précision sur la provenance', type: 'text' },
};

export function getFieldLabel(
  fieldName: string,
  metadata: Record<string, FieldMetadata> = declarantFieldMetadata,
): string {
  return metadata[fieldName]?.label || fieldName;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A precision code is only unique within its parent type, which a formatter never receives; the
 * wordings being synonyms, one merged lookup renders it anyway. A bare code loses to a real label.
 */
const mergePrecisionLabels = (...tables: Record<string, string>[]): Record<string, string> => {
  const merged: Record<string, string> = {};

  for (const table of tables) {
    for (const [code, label] of Object.entries(table)) {
      const existing = merged[code];
      if (existing !== undefined && existing !== code) continue;
      merged[code] = label;
    }
  }

  return merged;
};

const lieuPrecisionLabels = mergePrecisionLabels(
  lieuDomicilePrecisionLabels,
  lieuEtablissementSantePrecisionLabels,
  lieuEtablissementPersonnesAgeesPrecisionLabels,
  lieuEtablissementHandicapPrecisionLabels,
  lieuEtablissementSocialPrecisionLabels,
  lieuAutresEtablissementsPrecisionLabels,
  lieuTrajetPrecisionLabels,
);

const misEnCausePrecisionLabels = mergePrecisionLabels(
  misEnCauseEtablissementPrecisionLabels,
  misEnCauseFamillePrecisionLabels,
  misEnCauseProchePrecisionLabels,
  misEnCauseAutreNonProPrecisionLabels,
  professionSantePrecisionLabels,
  professionSocialPrecisionLabels,
  autreProfessionnelPrecisionLabels,
);

/** An empty list needs its own wording: the dialog only blanks out `null`, `undefined` and `''`. */
const formatLabelList =
  (labels: Record<string, string>, emptyLabel: string) =>
  (value: unknown): string => {
    if (isNullish(value)) return emptyLabel;

    const items = Array.isArray(value) ? value : [value];
    if (items.length === 0) return emptyLabel;

    return items.map((item) => labels[String(item)] ?? String(item)).join(', ');
  };

const formatBoolean = (value: unknown): string => {
  if (isNullish(value)) return EMPTY_VALUE_LABEL;
  return value ? 'Oui' : 'Non';
};

const formatFileCount = (value: unknown): string => {
  if (!Array.isArray(value)) return isNullish(value) ? 'Aucun fichier' : String(value);
  if (value.length === 0) return 'Aucun fichier';

  return value.length === 1 ? '1 fichier' : `${value.length} fichiers`;
};

/** File names carry the difference the user arbitrates; a bare count would compare as equal. */
const formatFileNames = (value: unknown): string => {
  if (!Array.isArray(value) || value.length === 0) return 'Aucun fichier';

  return value
    .map((file) => (isRecord(file) && typeof file.fileName === 'string' ? file.fileName : 'Fichier sans nom'))
    .join(', ');
};

const formatEntites = (value: unknown): string => {
  if (!Array.isArray(value) || value.length === 0) return 'Aucune entité';

  return value
    .map((entite) => {
      if (!isRecord(entite)) return EMPTY_VALUE_LABEL;

      const name =
        typeof entite.entiteName === 'string' && entite.entiteName ? entite.entiteName : String(entite.entiteId ?? '');
      const directionService =
        typeof entite.directionServiceName === 'string' && entite.directionServiceName
          ? entite.directionServiceName
          : '';

      return directionService ? `${name} — ${directionService}` : name;
    })
    .join(', ');
};

/**
 * Indexed by the dotted paths `flattenConflictPaths` produces. Labels are self-contained: the dialog
 * shows them away from the form section that would otherwise give them context.
 */
export const situationFieldMetadata: Record<string, FieldMetadata> = {
  'lieuDeSurvenue.lieuType': {
    label: 'Type de lieu de survenue',
    type: 'select',
    format: formatFromLabels(lieuTypeLabels),
  },
  'lieuDeSurvenue.lieuPrecision': {
    label: 'Précision du lieu de survenue',
    type: 'select',
    format: formatFromLabels(lieuPrecisionLabels),
  },
  'lieuDeSurvenue.transportType': {
    label: 'Type de transport du lieu de survenue',
    type: 'select',
    format: formatFromLabels(transportTypeLabels),
  },
  'lieuDeSurvenue.codePostal': { label: 'Code postal du lieu de survenue', type: 'text' },
  'lieuDeSurvenue.societeTransport': { label: 'Société de transport concernée', type: 'text' },
  'lieuDeSurvenue.finess': { label: "Numéro FINESS de l'établissement du lieu de survenue", type: 'text' },
  'lieuDeSurvenue.tutelle': { label: "Tutelle de l'établissement du lieu de survenue", type: 'text' },
  // No label table: categCode is the raw FINESS referential code, categLib its wording.
  'lieuDeSurvenue.categCode': { label: "Code catégorie de l'établissement du lieu de survenue", type: 'text' },
  'lieuDeSurvenue.categLib': { label: "Catégorie de l'établissement du lieu de survenue", type: 'text' },
  'lieuDeSurvenue.adresse.label': { label: 'Adresse du lieu de survenue', type: 'text' },
  'lieuDeSurvenue.adresse.numero': { label: 'Numéro de voie du lieu de survenue', type: 'text' },
  'lieuDeSurvenue.adresse.rue': { label: 'Rue du lieu de survenue', type: 'text' },
  'lieuDeSurvenue.adresse.codePostal': { label: "Code postal de l'adresse du lieu de survenue", type: 'text' },
  'lieuDeSurvenue.adresse.ville': { label: 'Ville du lieu de survenue', type: 'text' },

  'misEnCause.misEnCauseType': {
    label: 'Type de mis en cause',
    type: 'select',
    format: formatFromLabels(misEnCauseTypeLabels),
  },
  'misEnCause.misEnCauseTypePrecision': {
    label: 'Précision sur le type de mis en cause',
    type: 'select',
    format: formatFromLabels(misEnCausePrecisionLabels),
  },
  'misEnCause.autrePrecision': { label: 'Autre précision sur le mis en cause', type: 'text' },
  'misEnCause.rpps': { label: 'Numéro RPPS du mis en cause', type: 'text' },
  'misEnCause.commentaire': {
    label: 'Précisions supplémentaires concernant le mis en cause',
    type: 'textarea',
  },
  'misEnCause.nom': { label: 'Nom du mis en cause', type: 'text' },
  'misEnCause.prenom': { label: 'Prénom du mis en cause', type: 'text' },
  'misEnCause.civilite': {
    label: 'Civilité du mis en cause',
    type: 'select',
    format: formatFromLabels(civiliteLabels),
  },
  'misEnCause.finess': { label: 'Numéro FINESS du service mis en cause', type: 'text' },
  'misEnCause.nomService': { label: 'Nom du service mis en cause', type: 'text' },
  'misEnCause.codePostal': { label: 'Code postal du mis en cause', type: 'text' },
  'misEnCause.ville': { label: 'Ville du mis en cause', type: 'text' },

  'fait.motifs': {
    label: 'Motifs de la requête',
    type: 'select',
    format: formatLabelList(motifLabelsById, 'Aucun motif'),
  },
  'fait.motifsDeclaratifs': {
    label: 'Motifs renseignés par le déclarant',
    type: 'select',
    format: formatLabelList(motifLabels, 'Aucun motif'),
  },
  'fait.maltraitanceTypes': {
    label: 'Types de maltraitance renseignés par le déclarant',
    type: 'select',
    format: formatLabelList(maltraitanceTypeLabels, 'Aucun type de maltraitance'),
  },
  'fait.consequences': {
    label: 'Conséquences sur la personne',
    type: 'select',
    format: formatLabelList(consequenceLabels, 'Aucune conséquence'),
  },
  'fait.dateDebut': { label: 'Date de début des faits', type: 'text', format: formatDate },
  'fait.dateFin': { label: 'Date de fin des faits', type: 'text', format: formatDate },
  'fait.commentaire': { label: 'Explication des faits par le déclarant', type: 'textarea' },
  'fait.autresPrecisions': { label: 'Autres précisions sur les faits', type: 'textarea' },
  'fait.fileIds': { label: 'Fichiers relatifs aux faits', type: 'text', format: formatFileCount },
  'fait.files': { label: 'Détail des fichiers relatifs aux faits', type: 'text', format: formatFileNames },

  'demarchesEngagees.demarches': {
    label: 'Démarches engagées par le déclarant',
    type: 'checkbox',
    format: formatLabelList(demarcheEngageeLabels, 'Aucune démarche'),
  },
  'demarchesEngagees.dateContactResponsables': {
    label: 'Date de prise de contact avec les responsables',
    type: 'text',
    format: formatDate,
  },
  'demarchesEngagees.reponseRecueResponsables': {
    label: 'Le déclarant a reçu une réponse des responsables',
    type: 'checkbox',
    format: formatBoolean,
  },
  'demarchesEngagees.precisionsOrganisme': { label: "Précisions sur l'organisme contacté", type: 'textarea' },
  'demarchesEngagees.dateDepotPlainte': { label: 'Date du dépôt de plainte', type: 'text', format: formatDate },
  'demarchesEngagees.lieuDepotPlainte': {
    label: 'Lieu de dépôt de la plainte',
    type: 'select',
    format: formatFromLabels(autoriteTypeLabels),
  },
  'demarchesEngagees.commentaire': { label: 'Précisions sur les autres démarches engagées', type: 'textarea' },

  'traitementDesFaits.entites': {
    label: 'Entités en charge du traitement des faits',
    type: 'select',
    format: formatEntites,
  },

  domainesFonctionnels: {
    label: 'Domaine fonctionnel',
    type: 'select',
    format: formatFromLabels(domainesFonctionnelsLabels),
  },
  estLieAuSignalement: {
    label: 'Situation en lien avec un ou plusieurs signalements',
    type: 'radio',
    format: formatReponseOuiNon,
  },
  numerosSignalement: { label: 'Numéro de signalement associé', type: 'text' },
};
