import {
  ages,
  autoritesTypes,
  consequences,
  demarchesEngageesTypes,
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
  type: 'TextChamp',
  label: 'Êtes-vous la personne concernée ?',
  options: [
    {
      key: true,
      label: 'Oui, je suis la personne concernée',
    },
    {
      key: false,
      label: "Non, je suis témoin, aidant ou proche d'une personne concernée",
    },
  ],
};

/* estVictime = true start */

const telephone = {
  id: 'Champ-19488',
  type: 'TextChamp',
  label: "Votre numéro de téléphone (à seul usage de l'administration)",
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
      label: 'Je ne sais pas',
    },
    {
      key: null,
      label: 'Je ne souhaite pas répondre',
    },
  ],
};

const estAnonyme = {
  id: 'Champ-34247',
  type: 'CheckboxChamp',
  label:
    "Acceptez-vous que votre identité soit communiquée au(x) mis en cause si cela est nécessaire à l'instruction du dossier ?",
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
  label: "Son numéro de téléphone (à seul usage de l'administration)",
};

const victimeEmail = {
  id: 'Champ-19496',
  type: 'TextChamp',
  label: 'Son courrier électronique',
};

const victimeAdressePostale = {
  id: 'Champ-29321',
  type: 'AddressChamp',
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
      label: 'Je ne sais pas',
    },
    {
      key: null,
      label: 'Je ne souhaite pas répondre',
    },
  ],
};

const victimeIdentiteCommunique = {
  id: 'Champ-34248',
  type: 'CheckboxChamp',
  label:
    "La personne concernée accepte-t-elle que son identité soit communiquée au(x) mis en cause si cela est nécessaire à l'instruction du dossier ?",
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

/* estVictime = false end */
/* estVictime = true || estVictime = false start */

const autreVictimes = {
  id: 'Champ-27605',
  type: 'CheckboxChamp',
  label: "D'autres personnes sont-elles concernées par la réclamation ?",
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
/* estVictime = true || estVictime = false end */
/* autreVictimes = true start */

const autreVictimesDetails = {
  id: 'Champ-27606',
  type: 'TextChamp',
  label: 'Précisions sur les autres personnes concernées :',
};

/* autreVictimes = true end */
/* estVictime = false start */

const lienVictime = {
  id: 'Champ-19497',
  type: 'TextChamp',
  label: 'Votre lien avec la personne concernée',
  options: Object.entries(liensVictime).map(([key, label]) => ({
    key,
    label,
  })),
};

const declarantTelephone = {
  id: 'Champ-19498',
  type: 'TextChamp',
  label: "Votre numéro de téléphone (à seul usage de l'administration)",
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
    {
      key: null,
      label: 'Je ne sais pas',
    },
  ],
};

/* estVictimeInformee = false start */

const estVictimeInformeeCommentaire = {
  id: 'Champ-32074',
  type: 'TextChamp',
  label: "Pourquoi la personne concernée n'est-elle pas au courant de votre démarche ?",
};

/* estVictimeInformee = false end */
/* estVictime = false end */

const lieuCodePostal = {
  id: 'Champ-28367',
  type: 'TextChamp',
  label: 'Code postal du lieu où se sont passés les faits',
};

const lieuType = {
  id: 'Champ-19505',
  type: 'TextChamp',
  label: 'Type de lieu',
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

const lieuAdresse = {
  id: 'Champ-27161',
  type: 'AddressChamp',
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

const finess = {
  id: 'Champ-19508',
  type: 'TextChamp',
  label: "Recherchez l'établissement concerné",
};

/* lieuType = 'Dans un établissement... end */

const responsableType = {
  id: 'Champ-28368',
  type: 'TextChamp',
  label: 'Responsable des faits',
  options: Object.entries(misEnCauseTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/*  responsableType = Professionel... start */
/* lieuType != Au domicile... start */

const professionnelResponsable = {
  id: 'Champ-19515',
  type: 'TextChamp',
  label: 'Professionnel responsable des faits',
  options: Object.entries(professionTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType != Au domicile... end */
/* lieuType = Au domicile... start */

const professionnelResponsableDomicile = {
  id: 'Champ-27168',
  type: 'TextChamp',
  label: "Professionnel dans le cadre d'un service ou d'une intervention à domicile",
  options: Object.entries(professionDomicileTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* lieuType = Au domicile... end */

/* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Intervention d'un ... start */

// RPPS
const professionnelResponsableIdentite = {
  id: 'Champ-19511',
  type: 'TextChamp',
  label: 'Nom du professionnel de santé',
};

/* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Intervention d'un ... end */
/* responsableType = Etablissement start */

const nomEtablissement = {
  id: 'Champ-37818',
  type: 'TextChamp',
  label: "Précisez le nom de l'établissement",
};

/* responsableType = Etablissement end */
/* responsableType != Etablissement start */

const responssableComment = {
  id: 'Champ-37819',
  type: 'TextChamp',
  label: 'Précisions sur le responsable des faits',
};

/* responsableType != Etablissement end */
/* responsableType = Etablissement start */

const etablissementResponssable = {
  id: 'Champ-37811',
  type: 'CheckboxChamp',
  label: "L'établissement responsable est-il celui où se sont passés les faits ?",
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

/* responsableType = Etablissement end */

const motifsMap = {
  id: 'Champ-19526',
  type: 'MultipleDropDownListChamp',
  label: 'Type(s) de faits',
  options: Object.entries(motifs).map(([key, label]) => ({
    key,
    label,
  })),
};

const consequencesMap = {
  id: 'Champ-27572',
  type: 'MultipleDropDownListChamp',
  label: 'Conséquences pour vous ou la personne concernée',
  options: Object.entries(consequences).map(([key, label]) => ({
    key,
    label,
  })),
};

/* consequencesMap = Autre... start */

const consequenceComment = {
  id: 'Champ-37526',
  type: 'TextChamp',
  label: 'Précisez "Autre conséquence"',
};

/* consequencesMap = Autre... end */

const maltraitanceTypesMap = {
  id: 'Champ-27156',
  type: 'MultipleDropDownListChamp',
  label: 'Avez-vous, ou la personne concernée, subi des actes de maltraitance ?',
  options: Object.entries(maltraitanceTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

const dateDebut = {
  id: 'Champ-19527',
  type: 'DateChamp',
  label: 'Date de début des faits (la date peut être approximative)',
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

const dateFin = {
  id: 'Champ-27158',
  type: 'DateChamp',
  label: 'Date de fin des faits',
};

/* estSituationActuelle = false end */

const faitsCommentaire = {
  id: 'Champ-19528',
  type: 'TextChamp',
  label: 'Expliquez-nous en détail les faits (ce qui est arrivé, qui était présent, ce que vous avez fait,...)',
};

const faitsFichiers = {
  id: 'Champ-37252',
  type: 'PieceJustificativeChamp',
  label: 'Si vous les pensez utiles au traitement de votre dossier, vous pouvez ajouter des pièces jointes (3 maximum)',
};

const autreResponsables = {
  id: 'Champ-37050',
  type: 'RepetitionChamp',
  label: 'Autre responsable',
  champs: [
    {
      ...responsableType,
      id: 'Champ-37055',
    },
    /*  responsableType = Professionel... start */
    /* lieuType != Au domicile... start */
    {
      ...professionnelResponsable,
      id: 'Champ-37056',
    },
    /* lieuType != Au domicile... end */
    /* lieuType = Au domicile... start */
    {
      ...professionnelResponsableDomicile,
      id: 'Champ-37057',
    },
    /* lieuType = Au domicile... end */
    /* professionnelResponsable = Professionnel... start || professionnelResponsableDomicile = Intervention d'un ... start */
    {
      ...professionnelResponsableIdentite,
      id: 'Champ-37058',
    },
    /* professionnelResponsable = Professionnel... start || professionnelResponsableDomicile = Intervention d'un ... end */
    /* responsableType = Etablissement start */
    {
      ...etablissementResponssable,
      id: 'Champ-37813',
    },
    /* responsableType = Etablissement end */
    /* etablissementResponssable = false start */
    {
      ...nomEtablissement,
      id: 'Champ-37817',
    },
    /* etablissementResponssable = false end */
    /* responsableType != Etablissement start */
    {
      ...responssableComment,
      id: 'Champ-37059',
    },
    /* responsableType != Etablissement end */
    {
      id: 'Champ-37158',
      label: 'Les faits à déclarer pour ce responsable sont-ils similaires à ceux déclarés pour le précédent ?',
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
    },
    /* Similaires = false start */
    {
      id: 'Champ-37270',
      label: "Que s'est-il passé ?",
      type: 'TextChamp',
    },
    /* Similaires = false end */
    {
      ...motifsMap,
      id: 'Champ-37271',
    },
    {
      ...consequencesMap,
      id: 'Champ-37272',
    },
    /* consequencesMap = Autre... start */
    {
      ...consequenceComment,
      id: 'Champ-37527',
    },
    /* consequencesMap = Autre... end */
    {
      ...maltraitanceTypesMap,
      id: 'Champ-37273',
    },
    {
      ...dateDebut,
      id: 'Champ-37325',
    },
    {
      ...estSituationActuelle,
      id: 'Champ-37326',
    },
    /* estSituationActuelle = false start */
    {
      ...dateFin,
      id: 'Champ-37327',
    },
    /* estSituationActuelle = false end */
    {
      ...faitsCommentaire,
      id: 'Champ-37328',
    },
    {
      ...faitsFichiers,
      id: 'Champ-37329',
    },
  ],
};

const demarchesEngagees = {
  id: 'Champ-37048',
  type: 'MultipleDropDownListChamp',
  label:
    "Si vous ou la personne concernée avez déjà engagé des démarches pour ces faits (à l'écrit ou à l'oral), cochez la ou les cases correspondantes :",
  options: Object.entries(demarchesEngageesTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* demarcheEngagees = Prise de contact... start */

const demarchesEngageesDateContactEtablissement = {
  id: 'Champ-19735',
  type: 'DateChamp',
  label:
    "À quelle date la prise de contact avec l'établissement ou les responsables des faits a-t-elle été effectuée ?",
};

const demarchesEngageesEtablissementARepondu = {
  id: 'Champ-19736',
  type: 'CheckboxChamp',
  label: 'Une réponse a-t-elle été obtenue ?',
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

/* demarchesEngageesEtablissementARepondu = true start */

const demarchesEngageesReponseFile = {
  id: 'Champ-19737',
  type: 'PieceJustificativeChamp',
  label: 'Merci de joindre la réponse obtenue',
};

/* demarchesEngageesReponse = true end */
/* demarcheEngage = Prise de contact... end */
/* demarchesEngagees = Demarches... start */

const demarchesEngageesOrganisme = {
  id: 'Champ-20005',
  type: 'TextChamp',
  label: 'Auprès de quel organisme les démarches ont-elles été engagées ?',
};

/* demarchesEngagees = Demarches... end */
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
  options: Object.entries(autoritesTypes).map(([key, label]) => ({
    key,
    label,
  })),
};

/* demarchesEngagees = Depot... end */

const autreFaits = {
  id: 'Champ-37253',
  type: 'RepetitionChamp',
  label: 'Autres faits',
  champs: [
    {
      ...lieuCodePostal,
      id: 'Champ-37257',
    },
    {
      ...lieuType,
      id: 'Champ-37256',
    },
    /* lieuType = Autre || Au domicile... || Dans un cabinet... start */
    {
      ...lieuCommentaire,
      id: 'Champ-37353',
    },
    {
      ...lieuAdresse,
      id: 'Champ-37354',
    },
    /* lieuType = Autre || Au domicile... || Dans un cabinet... end */
    /* lieuType = 'Durant le trajet... start */
    {
      ...transportType,
      id: 'Champ-37355',
    },
    {
      ...transportSociété,
      id: 'Champ-37260',
    },
    /* lieuType = 'Durant le trajet... end */
    /* lieuType = 'Dans un établissement... start */
    {
      ...finess,
      id: 'Champ-37350',
    },
    /* lieuType = 'Dans un établissement... end */
    {
      ...responsableType,
      id: 'Champ-37258',
    },
    /*  responsableType = Professionel... start */
    /* lieuType != Au domicile... start */
    {
      ...professionnelResponsable,
      id: 'Champ-37312',
    },
    /* lieuType != Au domicile... end */
    /* lieuType = Au domicile... start */
    {
      ...professionnelResponsableDomicile,
      id: 'Champ-37313',
    },
    /* lieuType = Au domicile... end */
    /* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Intervention d'un ... start */
    {
      ...professionnelResponsableIdentite,
      id: 'Champ-37314',
    },
    /* professionnelResponsable = Professionnel... || professionnelResponsableDomicile = Intervention d'un ... end */
    /* responsableType = Etablissement start */
    {
      ...nomEtablissement,
      id: 'Champ-37834',
    },
    /* responsableType = Etablissement end */
    /* responsableType != Etablissement start */
    {
      ...responssableComment,
      id: 'Champ-37259',
    },
    /* responsableType != Etablissement end */
    /* responsableType = Etablissement start */
    {
      ...etablissementResponssable,
      id: 'Champ-37833',
    },
    /* responsableType = Etablissement end */
    {
      ...motifsMap,
      id: 'Champ-37263',
    },
    {
      ...consequencesMap,
      id: 'Champ-37317',
    },
    /* consequencesMap = Autre... start */
    {
      ...consequenceComment,
      id: 'Champ-37530',
    },
    /* consequencesMap = Autre... end */
    {
      ...maltraitanceTypesMap,
      id: 'Champ-37319',
    },
    {
      ...dateDebut,
      id: 'Champ-37320',
    },
    {
      ...estSituationActuelle,
      id: 'Champ-37321',
    },
    /* estSituationActuelle = false start */
    {
      ...dateFin,
      id: 'Champ-37322',
    },
    /* estSituationActuelle = false end */
    {
      ...faitsCommentaire,
      id: 'Champ-37323',
    },
    {
      ...faitsFichiers,
      id: 'Champ-37324',
    },
    {
      id: 'Champ-37282',
      type: 'TextChamp',
      label: 'Précisions sur les autres responsables des faits (types de responsables, nom, prénom...)',
    },
    {
      ...demarchesEngagees,
      id: 'Champ-37340',
    },
    /* demarcheEngage = Prise de contact... start */
    {
      ...demarchesEngageesDateContactEtablissement,
      id: 'Champ-37341',
    },
    {
      ...demarchesEngageesEtablissementARepondu,
      id: 'Champ-37342',
    },
    /* demarchesEngageesReponse = true start */
    {
      ...demarchesEngageesReponseFile,
      id: 'Champ-37343',
    },
    /* demarchesEngageesReponse = true end */
    /* demarcheEngage = Prise de contact... end */
    /* demarchesEngagees = Demarches... start */
    {
      ...demarchesEngageesOrganisme,
      id: 'Champ-37344',
    },
    /* demarchesEngagees = Demarches... end */
    /* demarchesEngagees = Depot... start */
    {
      ...demarcheEngageDatePlainte,
      id: 'Champ-37345',
    },
    {
      ...demarcheEngageAutoriteType,
      id: 'Champ-37346',
    },
    /* demarchesEngagees = Depot... end */
  ],
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
  victimeAge,
  victimeTelephone,
  victimeEmail,
  victimeAdressePostale,
  victimeEstHandicape,
  victimeIdentiteCommunique,

  // Autres victimes
  autreVictimes,
  autreVictimesDetails,

  // Déclarant
  lienVictime,
  declarantTelephone,
  estVictimeInformee,
  estVictimeInformeeCommentaire,

  // Lieux
  lieuCodePostal,
  lieuType,
  lieuCommentaire,
  lieuAdresse,
  transportType,
  transportSociété,
  finess,

  // Mis en cause
  responsableType,
  professionnelResponsable,
  professionnelResponsableDomicile,
  professionnelResponsableIdentite,
  nomEtablissement,
  responssableComment,
  etablissementResponssable,

  // Faits
  motifsMap,
  consequencesMap,
  consequenceComment,
  maltraitanceTypesMap,
  dateDebut,
  estSituationActuelle,
  dateFin,
  faitsCommentaire,
  faitsFichiers,
  autreResponsables,
  autreFaits,

  // Demarches engagées
  demarchesEngagees,
  demarchesEngageesDateContactEtablissement,
  demarchesEngageesEtablissementARepondu,
  demarchesEngageesReponseFile,
  demarchesEngageesOrganisme,
  demarcheEngageDatePlainte,
  demarcheEngageAutoriteType,
};
