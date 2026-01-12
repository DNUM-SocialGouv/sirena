import {
  dsAgeLabels,
  dsAutoriteTypeLabels,
  dsConsequenceLabels,
  dsDeclarationTypeLabels,
  dsDemarcheEngageeLabels,
  dsLienVictimeLabels,
  dsLieuTypeLabels,
  dsMaltraitanceTypeLabels,
  dsMisEnCauseTypeLabels,
  dsMotifLabels,
  dsProfessionDomicileTypeLabels,
  dsProfessionTypeLabels,
  dsTransportTypeLabels,
} from '@sirena/common/constants';

const estVictime = {
  id: 'Champ-19485',
  type: 'TextChamp',
  label: 'Vous souhaitez faire une réclamation ou un signalement en tant que :',
  options: [
    {
      key: true,
      label: 'Personne concernée',
    },
    {
      key: false,
      label: 'Proche ou témoin',
    },
  ],
};
1;

/* estVictime = true start */

const age = {
  id: 'Champ-19490',
  type: 'TextChamp',
  label: 'Âge',
  options: Object.entries(dsAgeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

const telephone = {
  id: 'Champ-19488',
  type: 'TextChamp',
  label: 'Numéro de téléphone',
};

const adresse = {
  id: 'Champ-29320',
  type: 'TextChamp',
  label: 'Adresse postale',
};

const estHandicape = {
  id: 'Champ-27149',
  type: 'TextChamp',
  label: 'Êtes-vous en situation de handicap ?',
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
    {
      key: null,
      label: 'Je ne souhaite pas répondre',
    },
  ],
};

const estAnonyme = {
  id: 'Champ-38953',
  type: 'CheckboxChamp',
  label: 'Acceptez-vous que votre identité soit donnée au responsable des faits lors du suivi du dossier ? *',
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
  ],
};

/* estVictime = true end */
/* estVictime = false start */

const lienVictime = {
  id: 'Champ-19497',
  type: 'TextChamp',
  label: 'Quel est votre lien avec la personne concernée ?',
  options: Object.entries(dsLienVictimeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

const declarantTelephone = {
  id: 'Champ-19498',
  type: 'TextChamp',
  label: 'Numéro de téléphone',
};

const estAnonymeMemePersonne = {
  id: 'Champ-34247',
  type: 'CheckboxChamp',
  label: 'Acceptez-vous que votre identité soit donnée au responsable des faits lors du suivi du dossier ?',
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
  ],
};

const estVictimeInformee = {
  id: 'Champ-19499',
  type: 'CheckboxChamp',
  label: 'La personne concernée est-elle au courant de votre démarche ?',
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
  ],
};

const raisons = {
  id: 'Champ-32074',
  type: 'TextChamp',
  label: 'Pour quelle raison ?',
};

const victimeAge = {
  id: 'Champ-19493',
  type: 'TextChamp',
  label: 'Son âge',
  options: Object.entries(dsAgeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

const victimeTelephone = {
  id: 'Champ-19495',
  type: 'TextChamp',
  label: 'Numéro de téléphone',
};

const victimeEmail = {
  id: 'Champ-19496',
  type: 'TextChamp',
  label: 'Courrier électronique',
};

const victimeAdressePostale = {
  id: 'Champ-29321',
  type: 'AddressChamp',
  label: 'Adresse postale',
};

const victimeEstHandicape = {
  id: 'Champ-27159',
  label: 'La personne concernée est-elle en situation de handicap ?',
  type: 'TextChamp',
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
    {
      key: null,
      label: 'Je ne sais pas',
    },
  ],
};

const victimeIdentiteCommunique = {
  id: 'Champ-34248',
  type: 'CheckboxChamp',
  label:
    'La personne concernée accepte-t-elle que son identité soit donnée au responsable des faits lors du suivi du dossier ? *',
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
  ],
};

/* estVictime = true || estVictime = false start */

const aAutreVictimes = {
  id: 'Champ-27605',
  type: 'CheckboxChamp',
  label: "D'autres personnes sont-elles concernées par la situation ?",
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
  ],
};

/* aAutreVictimes = true start */

const autreVictimes = {
  id: 'Champ-27606',
  type: 'TextChamp',
  label: 'Informations complémentaires',
};

/* aAutreVictimes = true end */

/* estVictime = true || estVictime = false end */

const declarationType = {
  id: 'Champ-42500',
  type: 'TextChamp',
  label: 'Vous souhaitez déclarer :',
  options: Object.entries(dsDeclarationTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* declarationType = ...qualité start */

const declarationQualiteType = {
  id: 'Champ-42501',
  type: 'MultipleDropDownListChamp',
  label: 'Précisez :',
  options: Object.entries(dsMotifLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* declarationType = ...qualité end */
/* declarationType = ...facturation start */

const declarationFacturationType = {
  id: 'Champ-19526',
  type: 'MultipleDropDownListChamp',
  label: 'Précisez :',
  options: Object.entries(dsMotifLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* declarationType = ...facturation end */

const dateDebut = {
  id: 'Champ-19527',
  type: 'DateChamp',
  label: 'Approximativement, quand la situation a-t-elle commencé ?',
};

const estSituationActuelle = {
  id: 'Champ-27157',
  type: 'TextChamp',
  label: 'Est-ce que la situation est toujours en cours ?',
  options: [
    {
      key: true,
      label: 'Oui',
    },
    {
      key: false,
      label: 'Non',
    },
    {
      key: null,
      label: 'Je ne sais pas',
    },
  ],
};

/* estSituationActuelle = false start */

const dateFin = {
  id: 'Champ-27158',
  type: 'DateChamp',
  label: 'Approximativement, quand la situation s’est-elle terminée ?',
};

/* estSituationActuelle = false end */

const lieuCodePostal = {
  id: 'Champ-28367',
  type: 'CommuneChamp',
  label: 'Dans quelle ville se sont déroulés les faits ?',
};

const lieuType = {
  id: 'Champ-19505',
  type: 'TextChamp',
  label: 'Dans quel lieu ?',
  options: Object.entries(dsLieuTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType = Cabinet medical... || Autre start */

const nomEtablissement = {
  id: 'Champ-42814',
  type: 'TextChamp',
  label: "Quel est le nom de l'établissement ?",
};

/* lieuType = Cabinet medical... || Autre end */
/* lieuType = Autre || Au domicile... || Dans un cabinet... || Domicile start */

const lieuAdresse = {
  id: 'Champ-27161',
  type: 'AddressChamp',
  label: 'À quelle adresse ?',
};

/* lieuType = Autre || Au domicile... || Dans un cabinet... || Domicile end */
/* lieuType = 'Durant le trajet... start */

const transportType = {
  id: 'Champ-27166',
  type: 'TextChamp',
  label: 'Quel était le moyen de transport ?',
  options: Object.entries(dsTransportTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

const transportSociete = {
  id: 'Champ-27588',
  type: 'TextChamp',
  label: 'Quel est le service ou la société de transport du véhicule ?',
};

/* lieuType = 'Durant le trajet... end */
/* lieuType = 'Un établissement... start */

const finess = {
  id: 'Champ-19508',
  type: 'TextChamp',
  label: 'Quels sont le nom et la ville de l’établissement ?',
};

/* lieuType = 'Un établissement... end */
/* lieuType != 'Domicile... start */

const responsableType = {
  id: 'Champ-28368',
  type: 'TextChamp',
  label: 'Qui est le principal responsable des faits ?',
  options: Object.entries(dsMisEnCauseTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType != 'Domicile... end */
/* lieuType = 'Domicile... start */

const responsableType2 = {
  id: 'Champ-42519',
  type: 'TextChamp',
  label: 'Qui est le principal responsable des faits ?',
  options: Object.entries(dsMisEnCauseTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType = 'Domicile... end */
/* responsableType = Professionel... start */

const professionnelResponsable = {
  id: 'Champ-19515',
  type: 'TextChamp',
  label: 'Cette personne est :',
  options: Object.entries(dsProfessionTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* responsableType = Professionel... end */
/* responsableType2 = Professionel ou service... start */

const professionnelResponsableDomicile = {
  id: 'Champ-27168',
  type: 'TextChamp',
  label: 'Cette personne est :',
  options: Object.entries(dsProfessionDomicileTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* responsableType2 = Professionel... end */

/* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Professionnel ... start */

// RPPS
const professionnelResponsableIdentite = {
  id: 'Champ-19511',
  type: 'TextChamp',
  label: 'Quel est le nom du professionnel de santé ?',
};

/* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Professionnel d'un ... end */

const responsableCommentaire = {
  id: 'Champ-37819',
  type: 'TextChamp',
  label: 'Informations complémentaires',
};

const faitsCommentaire = {
  id: 'Champ-19528',
  type: 'TextChamp',
  label: 'Décrivez la situation avec vos mots :',
};

const maltraitanceTypesMap = {
  id: 'Champ-27156',
  type: 'MultipleDropDownListChamp',
  label: 'Avez-vous observé ou vécu une ou plusieurs des situations suivantes ?',
  options: Object.entries(dsMaltraitanceTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

const consequencesMap = {
  id: 'Champ-27572',
  type: 'MultipleDropDownListChamp',
  label: 'Quelles sont les conséquences sur le quotidien ?',
  options: Object.entries(dsConsequenceLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

const faitsFichiers = {
  id: 'Champ-37252',
  type: 'PieceJustificativeChamp',
  label: 'Ajouter un fichier',
};

const demarchesEngagees = {
  id: 'Champ-37048',
  type: 'MultipleDropDownListChamp',
  label: "Indiquez si des démarches ont été engagées pour ces faits (à l'écrit ou à l'oral)",
  options: Object.entries(dsDemarcheEngageeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

/* demarcheEngagees = Etablissement... start */

const demarchesEngageesDateContactEtablissement = {
  id: 'Champ-19735',
  type: 'DateChamp',
  label: "À quelle date l'établissement ou le responsables des faits a été contacté ?",
};

const demarchesEngageesEtablissementARepondu = {
  id: 'Champ-19736',
  type: 'CheckboxChamp',
  label: 'Une réponse a-t-elle été obtenue ?',
};

/* demarcheEngagees = Etablissement... end */
/* demarchesEngageesEtablissementARepondu = true start */

const demarchesEngageesReponseFile = {
  id: 'Champ-19737',
  type: 'PieceJustificativeChamp',
  label: "Ajoutez une copie d'écran ou un résumé des échanges",
};

/* demarchesEngageesEtablissementARepondu = true end */
/* demarcheEngagees = D'autres... start */

const demarchesEngageesAutre = {
  id: 'Champ-20005',
  type: 'TextChamp',
  label: 'Précisez les autres démarches engagées :',
};

/* demarcheEngagees = D'autres... end */
/* demarchesEngagees = Depot... start */

const demarcheEngageDatePlainte = {
  id: 'Champ-19741',
  type: 'DateChamp',
  label: 'À quelle date la plainte a-t-elle été déposée ?',
};

const demarcheEngageAutoriteType = {
  id: 'Champ-19742',
  type: 'TextChamp',
  label: 'Auprès de qui ?',
  options: Object.entries(dsAutoriteTypeLabels).map(([key, label]) => ({
    key,
    label,
  })),
};

const autreFaits = {
  id: 'Champ-37253',
  type: 'RepetitionChamp',
  label: 'Autres faits',
  champs: {
    declarationType: {
      ...declarationType,
      id: 'Champ-42627',
    },
    /* declarationType = ...qualité start */
    declarationQualiteType: {
      ...declarationQualiteType,
      id: 'Champ-42636',
    },
    /* declarationType = ...qualité end */
    /* declarationType = ...facturation start */
    declarationFacturationType: {
      ...declarationFacturationType,
      id: 'Champ-37263',
    },
    /* declarationType = ...facturation end */
    dateDebut: {
      ...dateDebut,
      id: 'Champ-37320',
    },
    estSituationActuelle: {
      ...estSituationActuelle,
      id: 'Champ-37321',
    },
    /* estSituationActuelle = false start */
    dateFin: {
      ...dateFin,
      id: 'Champ-37322',
    },
    /* estSituationActuelle = false end */
    lieuCodePostal: {
      ...lieuCodePostal,
      id: 'Champ-37257',
    },
    lieuType: {
      ...lieuType,
      id: 'Champ-37256',
    },
    /* lieuType = 'Dans un établissement... start */
    finess: {
      ...finess,
      id: 'Champ-37350',
    },
    /* lieuType = 'Dans un établissement... end */
    /* lieuType = 'Un cabinet... || Autre start */
    nomEtablissement: {
      ...nomEtablissement,
      id: 'Champ-42818',
    },
    /* lieuType = 'Un cabinet... || Autre end */
    /* lieuType = Autre || Au domicile... || Dans un cabinet... || Domicile start */
    lieuAdresse: {
      ...lieuAdresse,
      id: 'Champ-42818',
    },
    /* lieuType = Autre || Au domicile... || Dans un cabinet... || Domicile end */
    /* lieuType = transport start */
    transportType: {
      ...transportType,
      id: 'Champ-37355',
    },
    /* lieuType = transport end */
    /* lieuType = 'Durant le trajet... start */
    transportSociete: {
      ...transportSociete,
      id: 'Champ-37260',
    },
    /* lieuType = 'Dans un établissement... end */
    /* lieuType = 'Domicile start */
    responsableType: {
      ...responsableType,
      id: 'Champ-37258',
    },
    responsableType2: {
      ...responsableType2,
      id: 'Champ-42656',
    },
    /* lieuType = 'Domicile end */
    /* responsableType = Professionel... start */
    professionnelResponsable: {
      ...professionnelResponsable,
      id: 'Champ-37312',
    },
    /* responsableType = Professionel... end */
    /* responsableType2 = Professionel ou service... start */
    professionnelResponsableDomicile: {
      ...professionnelResponsableDomicile,
      id: 'Champ-37313',
    },
    /* responsableType2 = Professionel ou service... end */
    /* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Intervention d'un ... start */
    professionnelResponsableIdentite: {
      ...professionnelResponsableIdentite,
      id: 'Champ-37314',
    },
    /* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Intervention d'un ... end */
    responsableCommentaire: {
      ...responsableCommentaire,
      id: 'Champ-37318',
    },
    faitsCommentaire: {
      ...faitsCommentaire,
      id: 'Champ-37259',
    },
    maltraitanceTypesMap: {
      ...maltraitanceTypesMap,
      id: 'Champ-37319',
    },
    consequencesMap: {
      ...consequencesMap,
      id: 'Champ-37317',
    },
    faitsFichiers: {
      ...faitsFichiers,
      id: 'Champ-37324',
    },
    demarchesEngagees: {
      ...demarchesEngagees,
      id: 'Champ-37340',
    },
    /* demarcheEngage = Établissement... start */
    demarchesEngageesDateContactEtablissement: {
      ...demarchesEngageesDateContactEtablissement,
      id: 'Champ-37341',
    },
    demarchesEngageesEtablissementARepondu: {
      ...demarchesEngageesEtablissementARepondu,
      id: 'Champ-37342',
    },
    /* demarcheEngage = Établissement... end */
    /* demarchesEngageesEtablissementARepondu = true start */
    demarchesEngageesReponseFile: {
      ...demarchesEngageesReponseFile,
      id: 'Champ-37343',
    },
    /* demarchesEngageesEtablissementARepondu = true end */
    /* demarcheEngagees = D'autres... start */
    demarchesEngageesAutre: {
      ...demarchesEngageesAutre,
      id: 'Champ-37347',
    },
    /* demarcheEngagees = D'autres... end */
    /* demarchesEngagees = Depot... start */
    demarcheEngageDatePlainte: {
      ...demarcheEngageDatePlainte,
      id: 'Champ-37345',
    },
    demarcheEngageAutoriteType: {
      ...demarcheEngageAutoriteType,
      id: 'Champ-37346',
    },
    /* demarchesEngagees = Depot... end */
  },
};

export default {
  estVictime,
  // Victime
  telephone,
  adresse,
  age,
  estHandicape,
  estAnonyme,
  estAnonymeMemePersonne,

  // Victime non concernée
  victimeAge,
  victimeTelephone,
  victimeEmail,
  victimeAdressePostale,
  victimeEstHandicape,
  victimeIdentiteCommunique,

  // Autres victimes
  aAutreVictimes,
  autreVictimes,

  // Déclarant
  lienVictime,
  declarantTelephone,
  estVictimeInformee,
  raisons,

  // Lieux
  lieuCodePostal,
  lieuType,
  nomEtablissement,
  lieuAdresse,
  transportType,
  transportSociete,
  finess,

  // Mis en cause
  responsableType,
  responsableType2,
  professionnelResponsable,
  professionnelResponsableDomicile,
  professionnelResponsableIdentite,
  responsableCommentaire,

  // Faits
  declarationType,
  declarationQualiteType,
  declarationFacturationType,
  consequencesMap,
  maltraitanceTypesMap,
  dateDebut,
  estSituationActuelle,
  dateFin,
  faitsCommentaire,
  faitsFichiers,
  autreFaits,

  // Demarches engagées
  demarchesEngagees,
  demarchesEngageesDateContactEtablissement,
  demarchesEngageesEtablissementARepondu,
  demarchesEngageesReponseFile,
  demarchesEngageesAutre,
  demarcheEngageDatePlainte,
  demarcheEngageAutoriteType,
};
