import {
  ages,
  civilites,
  consequences,
  institutionPlainteTypes,
  liensVictime,
  lieuTypes,
  maltraitanceTypes,
  misEnCauseTypes,
  motifs,
  professionDomicileTypes,
  professionTypes,
  transportTypes,
} from '@sirena/common/constants';

const estVictime = {
  id: 'Champ-19485',
  type: 'CheckboxChamp',
  label: 'Êtes-vous la personne victime ?',
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

const telephone = {
  id: 'Champ-19488',
  type: 'TextChamp',
  label: 'Votre numéro de téléphone',
};

const victimeAdresse = {
  id: 'Champ-29320',
  type: 'TextChamp',
  label: 'Votre adresse postale',
};

const age = {
  id: 'Champ-19490',
  type: 'TextChamp',
  label: 'Votre âge',
  options: Object.entries(ages).map(([key, label]) => ({
    key,
    label,
  })),
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
  id: 'Champ-26535',
  type: 'CheckboxChamp',
  label: 'Souhaitez-vous rester anonyme vis-à-vis du ou des responsable(s) de(s) fait(s) ?',
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

const victimeNom = {
  id: 'Champ-19491',
  type: 'TextChamp',
  label: 'Son nom',
};

const victimePrenom = {
  id: 'Champ-19492',
  type: 'TextChamp',
  label: 'Son prénom',
};

// Sa civilité
const victimeCivilite = {
  id: 'Champ-19494',
  type: 'TextChamp',
  label: 'Sa civilité',
  options: Object.entries(civilites).map(([key, label]) => ({
    key,
    label,
  })),
};

const victimeAge = {
  id: 'Champ-19493',
  type: 'TextChamp',
  label: 'Son âge',
  options: Object.entries(ages).map(([key, label]) => ({
    key,
    label,
  })),
};

const victimeTelephone = {
  id: 'Champ-19495',
  type: 'TextChamp',
  label: 'Son numéro de téléphone',
};

const victimeEmail = {
  id: 'Champ-19496',
  type: 'TextChamp',
  label: 'Son courrier électronique',
};

const victimeAdressePostale = {
  id: 'Champ-29321',
  type: 'TextChamp',
  label: 'Son adresse postale',
};

const victimeEstHandicape = {
  id: 'Champ-27159',
  label: 'La personne victime est-elle en situation de handicap ?',
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

const victimeEstAnonyme = {
  id: 'Champ-27293',
  type: 'CheckboxChamp',
  label: "Souhaitez-vous garder l'anonymat de la personne victime, vis-à-vis du ou des responsable(s) des faits ?",
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

const autreVictimes = {
  id: 'Champ-27605',
  type: 'CheckboxChamp',
  label: "D'autres personnes ont-elles également été victimes ?",
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

const autreVictimesDetails = {
  id: 'Champ-27606',
  type: 'TextChamp',
  label: 'Précisions sur les autres personnes victimes',
};

/* autreVictimes = true end */
/* estVictime = false start */

const lienVictime = {
  id: 'Champ-19497',
  type: 'TextChamp',
  label: 'Votre lien avec la personne victime',
  options: Object.entries(liensVictime).map(([key, label]) => ({
    key,
    label,
  })),
};

const declarantTelephone = {
  id: 'Champ-19498',
  type: 'TextChamp',
  label: 'Votre numéro de téléphone',
};

const estVictimeInformee = {
  id: 'Champ-19499',
  type: 'CheckboxChamp',
  label: 'La personne victime est-elle au courant de votre démarche ?',
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

const estVictimeInformeeComment = {
  id: 'Champ-32074',
  type: 'TextChamp',
  label: "Pourquoi la personne victime n'est-elle pas au courant de votre démarche ?",
};

/* estVictimeInformee = false end */
/* estVictimeInformee = null start */

const estVictimeInformeeComment2 = {
  id: 'Champ-32075',
  type: 'TextChamp',
  label: "Pourquoi la personne victime n'est-elle pas au courant de votre démarche ?",
};

/* estVictimeInformee = null end */

const estDeclarantAnonyme = {
  id: 'Champ-26534',
  type: 'CheckboxChamp',
  label: 'Souhaitez-vous rester anonyme vis-à-vis de la personne responsable des faits ?',
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

const motifsMap = {
  id: 'Champ-19526',
  type: 'MultipleDropDownListChamp',
  label: 'Le ou les types de fait(s)',
  options: Object.entries(motifs).map(([key, label]) => ({
    key,
    label,
  })),
};

const estMaltraitance = {
  id: 'Champ-27155',
  type: 'CheckboxChamp',
  label: 'Des actes de maltraitance ont-ils eu lieu ?',
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

const maltraitanceTypesMap = {
  id: 'Champ-27156',
  type: 'MultipleDropDownListChamp',
  label: 'Si oui, veuillez sélectionner le(s) type(s) de maltraitance subi(s) :',
  options: Object.entries(maltraitanceTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

const consequencesMap = {
  id: 'Champ-27572',
  type: 'MultipleDropDownListChamp',
  label: 'Quelles sont les conséquences sur vous ou sur la personne victime ?',
  options: Object.entries(consequences).map(([key, label]) => ({
    key,
    label,
  })),
};

const dateDebut = {
  id: 'Champ-19527',
  type: 'DateChamp',
  label: 'A quelle date ou à partir de quelle date le fait a-t-il eu lieu ?',
};

const estSituationActuelle = {
  id: 'Champ-27157',
  type: 'TextChamp',
  label: "Cette situation est-elle toujours d'actualité ?",
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

const DateFin = {
  id: 'Champ-27158',
  type: 'DateChamp',
  label: 'Date de fin des faits',
};

/* estSituationActuelle = false end */

const faitsCommentaire = {
  id: 'Champ-19528',
  type: 'TextChamp',
  label: 'Expliquez-nous en détails les faits',
};

const lieuType = {
  id: 'Champ-19505',
  type: 'TextChamp',
  label: 'Type de lieu où se sont passés les faits',
  options: Object.entries(lieuTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType = Autre || Au domicile... || Dans un cabinet... start */

const lieuCommentaire = {
  id: 'Champ-27607',
  type: 'TextChamp',
  label: 'Précisions sur le lieu de survenue',
};

const adresseLieu = {
  id: 'Champ-27161',
  type: 'TextChamp',
  label: 'Adresse concernée',
};

/* lieuType = Autre || Au domicile... || Dans un cabinet... end */
/* lieuType = 'Durant le trajet... start */

const transportType = {
  id: 'Champ-27166',
  type: 'TextChamp',
  label: 'Type de transport concerné',
  options: Object.entries(transportTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

const transportSociété = {
  id: 'Champ-27588',
  type: 'TextChamp',
  label: 'Société de transport concernée',
};

/* lieuType = 'Durant le trajet... end */
/* lieuType = 'Dans un établissement... start */

const nomEtablissement = {
  id: 'Champ-28177',
  type: 'TextChamp',
  label: "Nom de l'établissement concerné",
};

const finess = {
  id: 'Champ-19508',
  type: 'TextChamp',
  label: "Recherchez l'établissement concerné",
};

/* lieuType = 'Dans un établissement... end */

const lieuCodePostal = {
  id: 'Champ-28367',
  type: 'TextChamp',
  label: 'Code postal',
};

const lieuAutre = {
  id: 'Champ-28174',
  type: 'RepetitionChamp',
  label: 'Autres lieux de survenue à déclarer',
  champs: [
    {
      id: 'Champ-28175|01JXWEP1DBRHX3NZ9FDKPWC2B6',
      label: 'Autre lieu de survenue',
      type: 'TextChamp',
      options: Object.entries(lieuTypes).map(([key, label]) => ({
        key,
        label,
      })),
    },
    {
      id: 'Champ-28176|01JXWEP1DBRHX3NZ9FDKPWC2B6',
      type: 'TextChamp',
      label: 'Précisions sur le lieu de survenue',
    },
  ],
};

// lieuType != Au domicile... start'

const responsableType = {
  id: 'Champ-28368',
  type: 'TextChamp',
  label: 'Personne responsable des faits',
  options: Object.entries(misEnCauseTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType != Au domicile... end */
/* lieuType = Au domicile... start */

const responsableTypeDomicile = {
  id: 'Champ-28781',
  type: 'TextChamp',
  label: 'Personne responsable des faits',
  options: Object.entries(misEnCauseTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType = Au domicile... end */
/* responsableType = professionnel start */

const professionnelResponsable = {
  id: 'Champ-27170',
  type: 'TextChamp',
  label: 'Professionnel responsable des faits',
  options: Object.entries(professionTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* responsableType = professionnel end */
/* responsableTypeDomicile = Professionnel dans le ... start */

const professionnelResponsableDomicile = {
  id: 'Champ-27168',
  type: 'TextChamp',
  label: "Professionnel dans le cadre d'un service ou d'une intervention à domicile",
  options: Object.entries(professionDomicileTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* professionnelResponsable = Un professionnel de santé (médecin ... start */
/* professionnelResponsableDomicile = Intervention d'un ... start */

// RPPS
const professionnelResponsableIdentite = {
  id: 'Champ-19511',
  type: 'TextChamp',
  label: 'Identité du professionnel de santé',
};

/* professionnelResponsable = Un professionnel de santé (médecin ... end */
/* professionnelResponsableDomicile = Intervention d'un ... end */

const responsableComment = {
  id: 'Champ-27170',
  type: 'TextChamp',
  label: 'Précisions sur la personne responsable des faits',
};

const responsableAutre = {
  id: 'Q2hhbXAtMjgxNzk',
  type: 'RepetitionChamp',
  label: 'Autres personnes responsables des faits à déclarer',
  champs: [
    {
      label: 'Identité ou précisions sur un autre responsable des faits',
      type: 'TextChamp',
    },
  ],
};

const estDemarcheEngage = {
  id: 'Champ-28179',
  type: 'CheckboxChamp',
  label: 'Avez-vous déjà pris contact avec l’établissement ou la personne responsable des faits ?',
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

const demarcheEngageDate = {
  id: 'Champ-19735',
  type: 'DateChamp',
  label: 'À quelle date ?',
};

const demarcheEngageReponse = {
  id: 'Champ-19736',
  type: 'CheckboxChamp',
  label: 'Avez-vous obtenu une réponse ?',
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

const demarcheEngageReponseFile = {
  id: 'Champ-19737',
  type: 'PieceJustificativeChamp',
  label: 'Merci de joindre la réponse obtenue',
};

/* demarcheEngageReponse = true end */

const demarcheEngageAutre = {
  id: 'Champ-19738',
  type: 'CheckboxChamp',
  label: 'Avez-vous déjà engagé des démarches auprès d’autres organismes ?',
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

const demarcheEngageOrganisme = {
  id: 'Champ-20005',
  type: 'TextChamp',
  label: "Précisez l'organisme concerné",
};

/* demarcheEngageAutre = true end */

const demarcheEngagePlainte = {
  id: 'Champ-19740',
  type: 'CheckboxChamp',
  label: 'Avez-vous déposé une plainte ?',
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

const demarcheEngagePlainteDate = {
  id: 'Champ-19741',
  type: 'DateChamp',
  label: 'À quelle date ?',
};

const demarcheEngagePlainteContact = {
  id: 'Champ-19742',
  type: 'TextChamp',
  label: 'Auprès de qui ?',
  options: Object.entries(institutionPlainteTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* demarcheEngagePlainte = true end */

const precisions = {
  id: 'Champ-27882',
  type: 'TextChamp',
  label: 'Précisions à ajouter',
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
