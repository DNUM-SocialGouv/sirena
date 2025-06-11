import {
  CONSEQUENCE_SUR_LA_VICTIME,
  NATURE_LIEU,
  PROFESSIONNEL_MIS_EN_CAUSE,
  SERVICE_A_DOMICILE,
  TYPE_DE_FAITS,
  TYPE_DE_MALTRAITANCE,
  TYPE_DE_MIS_EN_CAUSE,
} from './dematSocial.constants';

// Êtes vous la personne victime ?
const isVictime = {
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

// Votre numéro de téléphone
const phoneNumber = {
  id: 'Q2hhbXAtMTk0ODg=',
  type: 'TextChamp',
};

// Votre âge
const old = {
  id: 'Q2hhbXAtMTk0OTA=',
  type: 'TextChamp',
  options: [
    {
      key: '-18',
      label: 'Moins de 18 ans',
    },
    {
      key: '18-29',
      label: 'Entre 18 à 29 ans',
    },
    {
      key: '30-59',
      label: 'Entre 30 à 59 ans',
    },
    {
      key: '60-79',
      label: 'Entre 60 à 79 ans',
    },
    {
      key: '>= 80',
      label: '80 ans et plus',
    },
  ],
};

// Êtes-vous en situation de handicap ?
const isHandicaped = {
  id: 'Q2hhbXAtMjcxNDk=',
  type: 'textChamp',
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
const anonymatMisEnCause = {
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

// A votre connaissance, d'autres personnes ont-elles également été victimes ?
const otherVictims = {
  id: '"Q2hhbXAtMjc2MDU=',
  type: 'CheckboxChamp',
};

// Précisions sur les autres personnes victimes :
const otherVictimsDetails = {
  id: 'Q2hhbXAtMjc2MDY=',
  type: 'TextChamp',
};

// Description des faits
const factsDescription = {
  id: 'Q2hhbXAtMTk1MjQ=',
  type: 'TextChamp',
};

// Des actes de maltraitance ont-ils eu lieu ?
const isMaltraitance = {
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
const maltraitanceTypes = {
  id: 'Q2hhbXAtMjcxNTY=',
  type: 'MultipleDropDownListChamp',
  options: Object.entries(TYPE_DE_MALTRAITANCE).map(([key, label]) => ({
    key,
    label,
  })),
};

// Le ou les types de fait(s)
const factsTypes = {
  id: 'Q2hhbXAtMTk1MjY=',
  type: 'MultipleDropDownListChamp',
  options: Object.entries(TYPE_DE_FAITS).map(([key, label]) => ({
    key,
    label,
  })),
};

// Quelles sont les conséquences sur vous ou sur la personne victime ?
const consequences = {
  id: 'Q2hhbXAtMjc1NzI=',
  type: 'MultipleDropDownListChamp',
  options: Object.entries(CONSEQUENCE_SUR_LA_VICTIME).map(([key, label]) => ({
    key,
    label,
  })),
};

// A quelle date ou à partir de quelle date le fait a-t-il eu lieu ?
const factsDate = {
  id: 'Q2hhbXAtMTk1Mjc=',
  type: 'DateChamp',
};

// Cette situation est-elle toujours d'actualité ?
const isCurrentSituation = {
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

// Expliquez-nous en détails les faits
const details = {
  id: 'Q2hhbXAtMTk1Mjg=',
  type: 'TextChamp',
};

// Type de lieu où se sont passés les faits
const lieuTypes = {
  id: 'Q2hhbXAtMTk1MDU=',
  type: 'TextChamp',
  options: Object.values(NATURE_LIEU).map((key, label) => ({
    key,
    label,
  })),
};

// Précisions sur le lieu de survenue
const lieuDetails = {
  id: 'Q2hhbXAtMjc2MDc=',
  type: 'TextChamp',
};

// Adresse concernée
const address = {
  id: 'Q2hhbXAtMjcxNjE=',
  type: 'TextChamp',
};

// Nom de l'établissement concerné
const establishmentName = {
  id: 'Q2hhbXAtMjgxNzc=',
  type: 'TextChamp',
};

// Code postal
const postalCode = {
  id: 'Q2hhbXAtMjgzNjc==',
  type: 'TextChamp',
};

// Autres lieux de survenue à déclarer
const otherLocations = {
  id: 'Q2hhbXAtMjgxNzQ=',
  type: 'RepetitionChamp',
  champs: [
    {
      label: 'Autre lieu de survenue',
      type: 'TextChamp',
      options: Object.entries(NATURE_LIEU).map(([key, label]) => ({
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

// Personne responsable des faits
const responsiblePerson = {
  id: 'Q2hhbXAtMjgzNjg=',
  type: 'TextChamp',
  options: Object.entries(TYPE_DE_MIS_EN_CAUSE).map(([key, label]) => ({
    key,
    label,
  })),
};

// Professionnel responsable des faits
const responsibleProfessional = {
  id: 'Q2hhbXAtMTk1MTU=',
  type: 'TextChamp',
  options: Object.entries(PROFESSIONNEL_MIS_EN_CAUSE).map(([key, label]) => ({
    key,
    label,
  })),
};

// Professionnel dans le cadre d'un service ou d'une intervention à domicile
const responsibleProfessionalService = {
  id: 'Q2hhbXAtMjcxNjg=',
  type: 'TextChamp',
  options: Object.entries(SERVICE_A_DOMICILE).map(([key, label]) => ({
    key,
    label,
  })),
};
