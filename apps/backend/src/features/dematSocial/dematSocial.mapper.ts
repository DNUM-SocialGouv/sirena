import {
  ages,
  civilites,
  consequences,
  institutionPlainteTypes,
  liensVictime,
  lieuTypes,
  maltraitanceTypes,
  motifs,
  natureLieux,
  professionDomicileTypes,
  professionTypes,
  responsableTypes,
  transportTypes,
} from '@sirena/common/constants';

// Êtes vous la personne victime ?
const estVictime = {
  id: 'Q2hhbXAtMTk0ODU=',
  type: 'CheckboxChamp',
  options: [
    {
      key: true,
      label: 'Oui, je suis la personne victime',
    },
    {
      key: false,
      label: "Non, je suis témoin, aidant ou proche d'une personne victime",
    },
  ],
};

/* estVictime = true start */

// Votre numéro de téléphone
const telephone = {
  id: 'Q2hhbXAtMTk0ODg=',
  type: 'TextChamp',
};

// Votre adresse postale
const victimeAdresse = {
  id: 'Q2hhbXAtMjkzMjA=',
  type: 'TextChamp',
};

// Votre âge
const age = {
  id: 'Q2hhbXAtMTk0OTA=',
  type: 'TextChamp',
  options: Object.entries(ages).map(([key, label]) => ({
    key,
    label,
  })),
};

// Êtes-vous en situation de handicap ?
const estHandicape = {
  id: 'Q2hhbXAtMjcxNDk=',
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
      label: 'Je ne souhaite pas répondre',
    },
  ],
};

// Souhaitez-vous rester anonyme vis-à-vis du ou des responsable(s) de(s) fait(s) ?
const estAnonyme = {
  id: 'Q2hhbXAtMjY1MzU=',
  type: 'CheckboxChamp',
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
      label: "Je ne sais pas (votre identité sera d'abord anonyme pour le moment)",
    },
  ],
};

/* estVictime = true end */
/* estVictime = false start */

// Son nom
const victimeNom = {
  id: 'Q2hhbXAtMTk0OTE=',
  type: 'TextChamp',
};

// Son prénom
const victimePrenom = {
  id: 'Q2hhbXAtMTk0OTI=',
  type: 'TextChamp',
};

// Sa civilité
const victimeCivilite = {
  id: 'Q2hhbXAtMTk0OTQ=',
  type: 'TextChamp',
  options: Object.entries(civilites).map(([key, label]) => ({
    key,
    label,
  })),
};

// Son âge
const victimeAge = {
  id: 'Q2hhbXAtMTk0OTM=',
  type: 'TextChamp',
  options: Object.entries(ages).map(([key, label]) => ({
    key,
    label,
  })),
};

// Son numéro de téléphone
const victimeTelephone = {
  id: 'Q2hhbXAtMTk0OTU=',
  type: 'TextChamp',
};

// Son courrier électronique
const victimeEmail = {
  id: 'Q2hhbXAtMTk0OTY=',
  type: 'TextChamp',
};

// Son adresse postale
const victimeAdressePostale = {
  id: 'Q2hhbXAtMjkzMjE=',
  type: 'TextChamp',
};

// La personne victime est-elle en situation de handicap ?
const victimeEstHandicape = {
  id: 'Q2hhbXAtMjcxNTk=',
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
      label: 'Je ne souhaite pas répondre',
    },
  ],
};

// Souhaitez-vous garder l'anonymat de la personne victime, vis-à-vis du ou des responsable(s) des faits ?
const victimeEstAnonyme = {
  id: 'Q2hhbXAtMjcyOTM=',
  type: 'CheckboxChamp',
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
      label: "Je ne sais pas (votre identité sera d'abord anonyme pour le moment)",
    },
  ],
};

/* estVictime = false end */

// D'autres personnes ont-elles également été victimes ?
const autreVictimes = {
  id: 'Q2hhbXAtMjc2MDU=',
  type: 'CheckboxChamp',
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

/* autreVictimes = true start */

// Précisions sur les autres personnes victimes :
const autreVictimesDetails = {
  id: 'Q2hhbXAtMjc2MDY=',
  type: 'TextChamp',
};

/* autreVictimes = true end */
/* estVictime = false start */

// Votre lien avec la personne victime
const lienVictime = {
  id: 'Q2hhbXAtMTk0OTc=',
  type: 'TextChamp',
  options: Object.entries(liensVictime).map(([key, label]) => ({
    key,
    label,
  })),
};

// Votre numéro de téléphone
const declarantTelephone = {
  id: 'Q2hhbXAtMTk0OTg=',
  type: 'TextChamp',
};

// La personne victime est-elle au courant de votre démarche ?
const estVictimeInformee = {
  id: 'Q2hhbXAtMTk0OTk=',
  type: 'CheckboxChamp',
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

/* estVictimeInformee = false start */

// Pourquoi la personne victime n'est-elle pas au courant de votre démarche ?
const estVictimeInformeeComment = {
  id: 'Q2hhbXAtMzIwNzQ=',
  type: 'TextChamp',
};

/* estVictimeInformee = false end */
/* estVictimeInformee = null start */

// Pourquoi la personne victime n'est-elle pas au courant de votre démarche ?
const estVictimeInformeeComment2 = {
  id: 'Q2hhbXAtMzIwNzU=',
  type: 'TextChamp',
};

/* estVictimeInformee = null end */

// Souhaitez-vous rester anonyme vis-à-vis de la personne responsable des faits ?
const estDeclarantAnonyme = {
  id: 'Q2hhbXAtMjY1MzQ=',
  type: 'CheckboxChamp',
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
      label: "Je ne sais pas (votre identité sera d'abord anonyme pour le moment)",
    },
  ],
};

/* estVictime = false end */

// Le ou les types de fait(s)
const motifsMap = {
  id: 'Q2hhbXAtMTk1MjY=',
  type: 'MultipleDropDownListChamp',
  options: Object.entries(motifs).map(([key, label]) => ({
    key,
    label,
  })),
};

// Des actes de maltraitance ont-ils eu lieu ?
const estMaltraitance = {
  id: 'Q2hhbXAtMjcxNTU=',
  type: 'CheckboxChamp',
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

// Si oui, veuillez sélectionner le(s) type(s) de maltraitance subi(s) :
const maltraitanceTypesMap = {
  id: 'Q2hhbXAtMjcxNTY=',
  type: 'MultipleDropDownListChamp',
  options: Object.entries(maltraitanceTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

// Quelles sont les conséquences sur vous ou sur la personne victime ?
const consequencesMap = {
  id: 'Q2hhbXAtMjc1NzI=',
  type: 'MultipleDropDownListChamp',
  options: Object.entries(consequences).map(([key, label]) => ({
    key,
    label,
  })),
};

// A quelle date ou à partir de quelle date le fait a-t-il eu lieu ?
const dateDebut = {
  id: 'Q2hhbXAtMTk1Mjc=',
  type: 'DateChamp',
};

// Cette situation est-elle toujours d'actualité ?
const estSituationActuelle = {
  id: 'Q2hhbXAtMjcxNTc=',
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

/* estSituationActuelle = false start */

// Date de fin des faits
const DateFin = {
  id: 'Q2hhbXAtMjcxNTg',
  type: 'DateChamp',
};

/* estSituationActuelle = false end */

// Expliquez-nous en détails les faits
const faitsCommentaire = {
  id: 'Q2hhbXAtMTk1Mjg=',
  type: 'TextChamp',
};

// Type de lieu où se sont passés les faits
const lieuType = {
  id: 'Q2hhbXAtMTk1MDU=',
  type: 'TextChamp',
  options: Object.entries(lieuTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType = Autre || Au domicile... || Dans un cabinet... start */

// Précisions sur le lieu de survenue
const lieuCommentaire = {
  id: 'Q2hhbXAtMjc2MDc=',
  type: 'TextChamp',
};

// Adresse concernée
const adresseLieu = {
  id: 'Q2hhbXAtMjcxNjE=',
  type: 'TextChamp',
};

/* lieuType = Autre || Au domicile... || Dans un cabinet... end */
/* lieuType = 'Durant le trajet... start */

// Type de transport concerné
const transportType = {
  id: 'Q2hhbXAtMjcxNjY=',
  type: 'TextChamp',
  options: Object.entries(transportTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

// Société de transport concernée
const transportSociété = {
  id: 'Q2hhbXAtMjc1ODg=',
  type: 'TextChamp',
};

/* lieuType = 'Durant le trajet... end */
/* lieuType = 'Dans un établissement... start */

// Nom de l'établissement concerné
const nomEtablissement = {
  id: 'Q2hhbXAtMjgxNzc=',
  type: 'TextChamp',
};

// Recherchez l'établissement concerné
const finess = {
  id: 'Q2hhbXAtMTk1MDg=',
  type: 'TextChamp',
};

/* lieuType = 'Dans un établissement... end */

// Code postal
const lieuCodePostal = {
  id: 'Q2hhbXAtMjgzNjc=',
  type: 'TextChamp',
};

// Autres lieux de survenue à déclarer
const lieuAutre = {
  id: 'Q2hhbXAtMjgxNzQ=',
  type: 'RepetitionChamp',
  champs: [
    {
      label: 'Autre lieu de survenue',
      type: 'TextChamp',
      options: Object.entries(lieuTypes).map(([key, label]) => ({
        key,
        label,
      })),
    },
    {
      type: 'TextChamp',
      label: 'Précisions sur le lieu de survenue',
    },
  ],
};

// lieuType != Au domicile... start'

// Personne responsable des faits
const responsableType = {
  id: 'Q2hhbXAtMjgzNjg=',
  type: 'TextChamp',
  options: Object.entries(responsableTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType != Au domicile... end */
/* lieuType = Au domicile... start */

// Personne responsable des faits
const responsableTypeDomicile = {
  id: 'Q2hhbXAtMjg3ODE=',
  type: 'TextChamp',
  options: Object.entries(responsableTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType = Au domicile... end */
/* responsableType = professionnel start */

// Professionnel responsable des faits
const professionnelResponsable = {
  id: 'Q2hhbXAtMjcxNzA=',
  type: 'TextChamp',
  options: Object.entries(professionTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* responsableType = professionnel end */
/* responsableTypeDomicile = Professionnel dans le ... start */

// Professionnel dans le cadre d'un service ou d'une intervention à domicile
const professionnelResponsableDomicile = {
  id: 'Q2hhbXAtMjg3ODE=',
  type: 'TextChamp',
  options: Object.entries(professionDomicileTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* professionnelResponsable = Un professionnel de santé (médecin ... start */
/* professionnelResponsableDomicile = Intervention d'un ... start */

// RPPS
// Identité du professionnel de santé
const professionnelResponsableIdentite = {
  id: 'Q2hhbXAtMTk1MTE=',
  type: 'TextChamp',
};

/* professionnelResponsable = Un professionnel de santé (médecin ... end */
/* professionnelResponsableDomicile = Intervention d'un ... end */

// Précisions sur la personne responsable des faits
const responsableComment = {
  id: 'Q2hhbXAtMjcxNzA=',
  type: 'TextChamp',
};

// Autres personnes responsables des faits à déclarer
const responsableAutre = {
  id: 'Q2hhbXAtMjgxNzk',
  type: 'RepetitionChamp',
  champs: [
    {
      label: 'Identité ou précisions sur un autre responsable des faits',
      type: 'TextChamp',
    },
  ],
};

// Avez-vous déjà pris contact avec l’établissement ou la personne responsable des faits ?
const estDemarcheEngage = {
  id: 'Q2hhbXAtMTk1MzI=',
  type: 'CheckboxChamp',
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

/* estDemarcheEngage = true start */

// À quelle date ?
const demarcheEngageDate = {
  id: 'Q2hhbXAtMTk3MzU=',
  type: 'DateChamp',
};

// Avez-vous obtenu une réponse ?
const demarcheEngageReponse = {
  id: 'Q2hhbXAtMTk3MzY=',
  type: 'CheckboxChamp',
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

/* estDemarcheEngage = true end */
/* demarcheEngageReponse = true start */

// Merci de joindre la réponse obtenue
const demarcheEngageReponseFile = {
  id: 'Q2hhbXAtMTk3Mzc',
  type: 'PieceJustificativeChamp',
};

/* demarcheEngageReponse = true end */

// Avez-vous déjà engagé des démarches auprès d’autres organismes ?
const demarcheEngageAutre = {
  id: 'Q2hhbXAtMTk3Mzg=',
  type: 'CheckboxChamp',
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

/* demarcheEngageAutre = true start */

// Précisez l'organisme concerné
const demarcheEngageOrganisme = {
  id: 'Q2hhbXAtMjAwMDU=',
  type: 'TextChamp',
};

/* demarcheEngageAutre = true end */

// Avez-vous déposé une plainte ?
const demarcheEngagePlainte = {
  id: 'Q2hhbXAtMTk3NDA=',
  type: 'CheckboxChamp',
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

/* demarcheEngagePlainte = true start */

// À quelle date ?
const demarcheEngagePlainteDate = {
  id: 'Q2hhbXAtMTk3NDE=',
  type: 'DateChamp',
};

// Auprès de qui ?
const demarcheEngagePlainteContact = {
  id: 'Q2hhbXAtMTk3NDI=',
  type: 'TextChamp',
  options: Object.entries(institutionPlainteTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* demarcheEngagePlainte = true end */

// Précisions à ajouter
const precisions = {
  id: 'Q2hhbXAtMjc4ODI=',
  type: 'TextChamp',
};

export default {
  estVictime,
  // Victime
  telephone,
  victimeAdresse,
  age,
  estHandicape,
  estAnonyme,

  // Victime non concernée
  victimeNom,
  victimePrenom,
  victimeCivilite,
  victimeAge,
  victimeTelephone,
  victimeEmail,
  victimeAdressePostale,
  victimeEstHandicape,
  victimeEstAnonyme,

  // Autres victimes
  autreVictimes,
  autreVictimesDetails,

  // Déclarant
  lienVictime,
  declarantTelephone,
  estVictimeInformee,
  estVictimeInformeeComment,

  // Déclarant non concerné
  estVictimeInformeeComment2,
  estDeclarantAnonyme,

  // Faits
  motifsMap,
  estMaltraitance,
  maltraitanceTypesMap,
  consequencesMap,
  dateDebut,
  estSituationActuelle,
  DateFin,
  faitsCommentaire,

  // Lieux
  lieuType,
  lieuCommentaire,
  adresseLieu,

  // Lieux - Transport
  transportType,
  transportSociété,

  // Lieux - Etablissement
  nomEtablissement,
  finess,

  // Lieux - Code postal
  lieuCodePostal,

  // Autres lieux de survenue à déclarer
  lieuAutre,

  // Responsable des faits
  responsableType,
  responsableTypeDomicile,

  professionnelResponsable,
  professionnelResponsableDomicile,

  professionnelResponsableIdentite,

  responsableComment,

  responsableAutre,

  // Demarches engagées
  estDemarcheEngage,
  demarcheEngageDate,
  demarcheEngageReponse,
  demarcheEngageReponseFile,
  demarcheEngageAutre,
  demarcheEngageOrganisme,
  demarcheEngagePlainte,
  demarcheEngagePlainteDate,
  demarcheEngagePlainteContact,
  precisions,
};
