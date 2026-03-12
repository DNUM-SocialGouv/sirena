import {
  AUTRE_PROFESSIONNEL_PRECISION,
  DS_DEMARCHE_ENGAGEE,
  DS_LIEU_TYPE,
  DS_MIS_EN_CAUSE_TYPE,
  DS_PROFESSION_DOMICILE_TYPE,
  DS_PROFESSION_TYPE,
  dsTransportTypeLabels,
  LIEU_ETABLISSEMENT_SANTE_PRECISION,
  LIEU_TYPE,
  MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION,
  MIS_EN_CAUSE_TYPE,
  PROFESSION_SOCIAL_PRECISION,
  RECEPTION_TYPE,
} from '@sirena/common/constants';
import type { RootChampFragmentFragment } from '../../libs/graffle.js';
import type { CreateRequeteFromDematSocialDto } from '../requetes/requetes.type.js';
import { ChampMappingError, EnumNotFound } from './dematSocial.error.js';
import rootMapping from './dematSocial.mapper.js';
import type {
  AutreFaitsMapping,
  Demandeur,
  Mandataire,
  MappedChamp,
  MappedRepetitionChamp,
  Mapping,
  RepetitionChamp,
} from './dematSocial.type.js';

const fromB64 = (s: string) => Buffer.from(s, 'base64').toString('utf8');

const indexChamps = (champs: RootChampFragmentFragment[]) =>
  Object.fromEntries(champs.map((champ) => [fromB64(champ.id), champ]));

const splitRepetitionChamp = (champs: RepetitionChamp[]) => {
  const parts: Record<string, MappedRepetitionChamp> = {};
  champs.forEach((value) => {
    const id = fromB64(value.id);
    const [index, key] = id.split('|');
    if (!parts[key]) parts[key] = {};
    parts[key][index] = value;
  });

  return Object.values(parts);
};

// Normalize apostrophes to handle different Unicode variants (straight, typographic, etc.)
const normalizeApostrophes = (str: string): string => {
  return str
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u02BC/g, "'")
    .replace(/\uFF07/g, "'");
};

const normalizeSpaces = (str: string) => str.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ');

const normalizeString = (str: string) => {
  return normalizeApostrophes(normalizeSpaces(str));
};

const getEnumIdFromLabel = (options: { key: string; label: string }[], label: string | null) => {
  if (!label) return null;
  const normalizedLabel = normalizeString(label);
  const element = options.find((o) => normalizeString(o.label) === normalizedLabel)?.key ?? null;
  if (!element) {
    return null;
  }
  return element;
};

const getEnumsFromLabel = (
  options: { key: string; label: string }[],
  champ: RootChampFragmentFragment | RepetitionChamp,
): string[] => {
  if ('values' in champ === false) {
    throw new ChampMappingError(champ, 'MultipleDropDownListChamp', 'Invalid mapping value');
  }
  const keys = champ.values.map((value) => {
    const normalizedValue = normalizeString(value);
    const element = options.find((o) => normalizeString(o.label) === normalizedValue)?.key ?? null;
    if (!element) {
      throw new EnumNotFound(`No enum found for label: ${value}`);
    }
    return element;
  });
  return keys;
};

const getCodePostalByCommuneChamp = (champ: RootChampFragmentFragment | RepetitionChamp) => {
  if ('commune' in champ === false) {
    throw new ChampMappingError(champ, 'CommuneChamp', 'Invalid mapping value');
  }
  return champ.commune?.postalCode ?? '';
};

const getDateByChamps = (champ: RootChampFragmentFragment | RepetitionChamp) => {
  if (!champ) {
    return null;
  }
  if ('date' in champ === false) {
    throw new ChampMappingError(champ, 'DateChamp', 'Invalid mapping value');
  }
  if (champ.date === null) {
    return null;
  }
  if (champ.date) {
    const date = new Date(champ.date);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    throw new ChampMappingError(champ, 'date', `Invalid date value: ${champ?.date}`);
  }
  throw new ChampMappingError(champ, 'date', `Invalid date value: ${champ?.date}`);
};

const getFilesByChamps = (champ: RootChampFragmentFragment | RepetitionChamp) => {
  if (!champ) {
    return [];
  }
  if ('files' in champ === false) {
    throw new ChampMappingError(champ, 'FileChamp', 'Invalid mapping value');
  }
  return champ.files.map((file) => ({
    name: file.filename,
    url: file.url,
    size: file.byteSize,
    mimeType: file.contentType,
  }));
};

const getFiness = (champ: RootChampFragmentFragment | RepetitionChamp) => {
  if (!champ || champ?.stringValue === '') {
    return null;
  }
  if (champ.__typename !== 'FinessChamp') {
    throw new ChampMappingError(champ, 'FinessChamp', 'Invalid mapping value');
  } else if (!champ.data) {
    return {
      adresse: {
        label: champ.stringValue || '',
      },
    };
  }

  return {
    code: champ.data.finess ? String(champ.data.finess) : '',
    adresse: {
      label: champ.data.rs ? String(champ.data.rs) : '',
      codePostal: champ.data.adresse_code_postal ? String(champ.data.adresse_code_postal) : '',
      ville: champ.data.adresse_lib_routage ? String(champ.data.adresse_lib_routage) : '',
    },
    tutelle: champ.data.tutelle != null ? String(champ.data.tutelle) : '',
    categ_code: champ.data.categ_code != null ? String(champ.data.categ_code) : '',
    categ_lib: champ.data.categ_lib != null ? String(champ.data.categ_lib) : '',
  };
};

const getRpps = (champ: RootChampFragmentFragment | RepetitionChamp) => {
  if (!champ || champ?.stringValue === '') {
    return null;
  }
  if (champ.__typename !== 'RppsanteChamp') {
    throw new ChampMappingError(champ, 'RppsanteChamp', 'Invalid mapping value');
  } else if (!champ.data) {
    return {
      nom: champ.stringValue || '',
    };
  }

  const rpps = champ.data.identifiant_pp ? String(champ.data.identifiant_pp) : '';
  const civilite = champ.data.code_civilite ? String(champ.data.code_civilite) : '';
  const nom = champ.data.nom_d_exercice ? String(champ.data.nom_d_exercice) : '';
  const prenom = champ.data.prenom_d_exercice ? String(champ.data.prenom_d_exercice) : '';
  const libelleProfession = champ.data.libelle_profession ? String(champ.data.libelle_profession) : '';
  const codePostal = champ.data.code_postal_coord_structure ? String(champ.data.code_postal_coord_structure) : '';
  const commune = champ.data.libelle_commune_coord_structure ? String(champ.data.libelle_commune_coord_structure) : '';

  return {
    rpps: rpps,
    civilite: civilite,
    nom: nom,
    prenom: prenom,
    libelleProfession: libelleProfession,
    codePostal,
    commune,
  };
};

const createAddress = (champ: RootChampFragmentFragment | RepetitionChamp) => {
  if (champ.__typename === 'AddressChamp' && champ.address?.label) {
    return {
      label: '',
      codePostal: champ.address.postalCode ?? '',
      ville: champ.address.cityName ?? '',
      rue: `${champ.address.streetNumber ?? ''} ${(champ.address.streetName ?? '').trim()}`.trim(),
      numero: '',
    };
  }
  if (champ.stringValue) {
    return {
      label: '',
      codePostal: '',
      ville: '',
      rue: champ.stringValue,
      numero: '',
    };
  }
  return null;
};

const getBooleanOrNull = (
  champ: RootChampFragmentFragment | RepetitionChamp,
  options?: { key: boolean | null; label: string }[],
) => {
  if (!champ) {
    return null;
  }
  if ('checked' in champ) {
    return champ.checked;
  }
  if (options && champ.stringValue) {
    const match = options.find((opt) => opt.label === champ.stringValue);
    if (match) {
      return match.key;
    }
  }
  throw new ChampMappingError(champ, 'unknown', 'Invalid mapping value');
};

const getDemarchesEngagees = (
  champsById: MappedChamp | MappedRepetitionChamp,
  mapping: Mapping | AutreFaitsMapping,
) => {
  const demarches = getEnumsFromLabel(mapping.demarchesEngagees.options, champsById[mapping.demarchesEngagees.id]);
  const demarchesEngagees = {
    demarches: demarches.filter((d) => d !== DS_DEMARCHE_ENGAGEE.AUCUNE),
    dateContactEtablissement: getDateByChamps(champsById[mapping.demarchesEngageesDateContactEtablissement.id]),
    etablissementARepondu: getBooleanOrNull(champsById[mapping.demarchesEngageesEtablissementARepondu.id]) || false,
    organisme: champsById[mapping.demarchesEngageesAutre.id]?.stringValue ?? '',
    commentaire: '',
    datePlainte: getDateByChamps(champsById[mapping.demarcheEngageDatePlainte.id]),
    files: getFilesByChamps(champsById[mapping.demarchesEngageesReponseFile.id]),
    autoriteTypeId: getEnumIdFromLabel(
      mapping.demarcheEngageAutoriteType.options,
      champsById[mapping.demarcheEngageAutoriteType.id]?.stringValue ?? null,
    ),
  };
  return demarchesEngagees;
};

export const getLieuxType = ({ lieuTypeId }: { lieuTypeId: string | null }) => {
  if (lieuTypeId === DS_LIEU_TYPE.CABINET) {
    return {
      lieuTypeId: LIEU_TYPE.ETABLISSEMENT_SANTE,
      lieuPrecision: LIEU_ETABLISSEMENT_SANTE_PRECISION.CABINET_MEDICAL,
    };
  }
  return {
    lieuTypeId,
    lieuPrecision: '',
  };
};

const getLieuDeSurvenue = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const rawLieuTypeId = getEnumIdFromLabel(
    mapping.lieuType.options,
    champsById[mapping.lieuType.id]?.stringValue ?? null,
  );
  const { lieuTypeId, lieuPrecision } = getLieuxType({
    lieuTypeId: rawLieuTypeId,
  });
  const address = champsById[mapping.lieuAdresse.id] ? createAddress(champsById[mapping.lieuAdresse.id]) : null;
  const codePostal = getCodePostalByCommuneChamp(champsById[mapping.lieuCodePostal.id]);
  const nomEtablissementValue =
    'nomEtablissement' in mapping ? (champsById[mapping.nomEtablissement.id]?.stringValue ?? '') : '';
  const adresse = address ?? { label: nomEtablissementValue ?? '', codePostal, ville: '', rue: '', numero: '' };
  if (nomEtablissementValue) {
    adresse.label = nomEtablissementValue;
  }
  const finess = getFiness(champsById[mapping.finess.id]);
  if (finess) {
    if (finess.adresse.label) {
      adresse.label = finess.adresse.label;
    }
    if (finess.adresse.codePostal) {
      adresse.codePostal = finess.adresse.codePostal;
    }
    if (finess.adresse.ville) {
      adresse.ville = finess.adresse.ville;
    }
  }
  const transportTypeId =
    getEnumIdFromLabel(mapping.transportType.options, champsById[mapping.transportType.id]?.stringValue ?? null) ??
    null;
  const transportTypeLabel = transportTypeId
    ? dsTransportTypeLabels[transportTypeId as keyof typeof dsTransportTypeLabels]
    : undefined;
  const transportSocieteValue = champsById[mapping.transportSociete.id]?.stringValue;
  const societeTransport = [transportTypeLabel, transportSocieteValue].filter(Boolean).join(' - ');
  const lieux = {
    codePostal,
    commentaire: '',
    adresse,
    lieuTypeId,
    lieuPrecision,
    transportTypeId: transportTypeId,
    societeTransport,
    finess: '',
    tutelle: '',
    categCode: '',
    categLib: '',
    ...(finess?.code ? { finess: finess.code } : {}),
    ...(finess?.tutelle ? { tutelle: finess.tutelle } : {}),
    ...(finess?.categ_code ? { categCode: finess.categ_code } : {}),
    ...(finess?.categ_lib ? { categLib: finess.categ_lib } : {}),
  };
  return lieux;
};

export const getResponsable = ({
  lieuTypeId,
  responsableTypeId,
  professionnelResponsableTypeId,
}: {
  lieuTypeId: string | null;
  responsableTypeId: string | null;
  professionnelResponsableTypeId: string | null;
}) => {
  const isDomicile = lieuTypeId === DS_LIEU_TYPE.DOMICILE;
  const responsable = responsableTypeId;

  if (responsable === DS_MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE) {
    return { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE, misEnCauseTypePrecisionId: null };
  }
  if (responsable === DS_MIS_EN_CAUSE_TYPE.PROCHE) {
    return { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.PROCHE, misEnCauseTypePrecisionId: null };
  }
  if (responsable === DS_MIS_EN_CAUSE_TYPE.AUTRE) {
    return {
      misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PERSONNE_NON_PRO,
      misEnCauseTypePrecisionId: MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION.AUTRE,
    };
  }

  const mapProfessionDomicile = () => {
    const professionDomicileType = professionnelResponsableTypeId;

    if (professionDomicileType === DS_PROFESSION_DOMICILE_TYPE.PROFESSIONNEL_SANTE) {
      return { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE, misEnCauseTypePrecisionId: null };
    }
    if (professionDomicileType === DS_PROFESSION_DOMICILE_TYPE.NPJM) {
      return {
        misEnCauseTypeId: MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SOCIAL,
        misEnCauseTypePrecisionId: PROFESSION_SOCIAL_PRECISION.MANDATAIRE,
      };
    }
    if (professionDomicileType === DS_PROFESSION_DOMICILE_TYPE.AUTRE_PROFESSIONNEL) {
      return {
        misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
        misEnCauseTypePrecisionId: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SERVICE,
      };
    }
    if (professionDomicileType === DS_PROFESSION_DOMICILE_TYPE.SERVICE_EDUCATION) {
      return {
        misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
        misEnCauseTypePrecisionId: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SESSAD,
      };
    }
    if (professionDomicileType === DS_PROFESSION_DOMICILE_TYPE.AUTRE) {
      return {
        misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL,
        misEnCauseTypePrecisionId: AUTRE_PROFESSIONNEL_PRECISION.AUTRE,
      };
    }
    return { misEnCauseTypeId: null, misEnCauseTypePrecisionId: null };
  };

  if (isDomicile) {
    if (
      responsable === DS_MIS_EN_CAUSE_TYPE.PROFESSIONNEL ||
      responsable === DS_MIS_EN_CAUSE_TYPE.PROFESSIONNEL_DOMICILE ||
      responsable === DS_MIS_EN_CAUSE_TYPE.ETABLISSEMENT
    ) {
      return mapProfessionDomicile();
    }
  } else {
    if (responsable === DS_MIS_EN_CAUSE_TYPE.PROFESSIONNEL) {
      const professionType = professionnelResponsableTypeId;
      if (professionType === DS_PROFESSION_TYPE.PROFESSIONNEL_SANTE) {
        return { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE, misEnCauseTypePrecisionId: null };
      }
      if (professionType === DS_PROFESSION_TYPE.PROFESSIONNEL_SOCIAL) {
        return { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SOCIAL, misEnCauseTypePrecisionId: null };
      }
      if (professionType === DS_PROFESSION_TYPE.NPJM) {
        return {
          misEnCauseTypeId: MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SOCIAL,
          misEnCauseTypePrecisionId: PROFESSION_SOCIAL_PRECISION.MANDATAIRE,
        };
      }
      if (professionType === DS_PROFESSION_TYPE.AUTRE) {
        return { misEnCauseTypeId: MIS_EN_CAUSE_TYPE.AUTRE_PROFESSIONNEL, misEnCauseTypePrecisionId: null };
      }
    }
    if (responsable === DS_MIS_EN_CAUSE_TYPE.ETABLISSEMENT && lieuTypeId !== LIEU_TYPE.TRAJET) {
      return {
        misEnCauseTypeId: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
        misEnCauseTypePrecisionId: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.ETABLISSEMENT,
      };
    }
  }
  return { misEnCauseTypeId: null, misEnCauseTypePrecisionId: null };
};

const getMisEnCause = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const rawLieuTypeId = getEnumIdFromLabel(
    mapping.lieuType.options,
    champsById[mapping.lieuType.id]?.stringValue ?? null,
  );
  const { lieuTypeId } = getLieuxType({
    lieuTypeId: rawLieuTypeId,
  });
  const isDomicile = lieuTypeId === DS_LIEU_TYPE.DOMICILE;
  const responsableTypeId = getEnumIdFromLabel(
    isDomicile ? mapping.responsableType2.options : mapping.responsableType.options,
    champsById[isDomicile ? mapping.responsableType2.id : mapping.responsableType.id]?.stringValue ?? null,
  );
  const professionnelResponsableTypeId = getEnumIdFromLabel(
    isDomicile ? mapping.professionnelResponsableDomicile.options : mapping.professionnelResponsable.options,
    champsById[isDomicile ? mapping.professionnelResponsableDomicile.id : mapping.professionnelResponsable.id]
      ?.stringValue ?? null,
  );

  const { misEnCauseTypeId, misEnCauseTypePrecisionId } = getResponsable({
    lieuTypeId,
    responsableTypeId,
    professionnelResponsableTypeId,
  });
  const rppsChamp = getRpps(champsById[mapping.professionnelResponsableIdentite.id]);
  const misEnCause = {
    misEnCauseTypeId,
    misEnCauseTypePrecisionId,
    rpps: '',
    civilite: '',
    nom: '',
    prenom: '',
    ...(rppsChamp?.rpps ? { rpps: rppsChamp.rpps } : {}),
    ...(rppsChamp?.civilite ? { civilite: rppsChamp.civilite } : {}),
    ...(rppsChamp?.nom ? { nom: rppsChamp.nom } : {}),
    ...(rppsChamp?.prenom ? { prenom: rppsChamp.prenom } : {}),
    autrePrecision: champsById[mapping.responsableCommentaire.id]?.stringValue ?? '',
    commentaire: '',
  };
  return misEnCause;
};

const getMotifs = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const qualite = champsById[mapping.declarationQualiteType.id]
    ? getEnumsFromLabel(mapping.declarationQualiteType.options, champsById[mapping.declarationQualiteType.id])
    : [];
  const facturation = champsById[mapping.declarationFacturationType.id]
    ? getEnumsFromLabel(mapping.declarationFacturationType.options, champsById[mapping.declarationFacturationType.id])
    : [];
  return [...qualite, ...facturation];
};

const getFait = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const fait = {
    motifs: getMotifs(champsById, mapping),
    consequences: getEnumsFromLabel(mapping.consequencesMap.options, champsById[mapping.consequencesMap.id]),
    maltraitanceTypes: getEnumsFromLabel(
      mapping.maltraitanceTypesMap.options,
      champsById[mapping.maltraitanceTypesMap.id],
    ),
    dateDebut: getDateByChamps(champsById[mapping.dateDebut.id]),
    dateFin: getDateByChamps(champsById[mapping.dateFin.id]),
    commentaire: champsById[mapping.faitsCommentaire.id]?.stringValue ?? null,
    files: getFilesByChamps(champsById[mapping.faitsFichiers.id]),
  };
  return fait;
};

const getVictime = (champsById: MappedChamp, mandataire: Mandataire, demandeur: Demandeur) => {
  const estVictimeChamp = champsById[rootMapping.estVictime.id];
  const estVictime = getBooleanOrNull(estVictimeChamp, rootMapping.estVictime.options);
  const aAutrePersonnes =
    getBooleanOrNull(champsById[rootMapping.aAutreVictimes.id], rootMapping.aAutreVictimes.options) || false;
  const autrePersonnes = champsById[rootMapping.autreVictimes.id]?.stringValue ?? '';

  if (estVictime === true) {
    // "Oui, je suis la personne concernée"
    // → The declarant AND the participant are the same person (demandeur)
    // Use estAnonymeMemePersonne for this case

    const estAnonymeChamp = champsById[rootMapping.estAnonymeMemePersonne.id];
    const veutCommuniquerIdentite = getBooleanOrNull(estAnonymeChamp, rootMapping.estAnonymeMemePersonne.options);
    const veutGarderAnonymat = veutCommuniquerIdentite === null ? null : !veutCommuniquerIdentite;

    const personneConcernee = {
      // Use demandeur info for identity
      prenom: demandeur.prenom,
      nom: demandeur.nom,
      civiliteId: demandeur.civiliteId,
      email: mandataire.email,
      telephone: champsById[rootMapping.telephone.id]?.stringValue ?? null,
      ageId: getEnumIdFromLabel(rootMapping.age.options, champsById[rootMapping.age.id]?.stringValue ?? null),
      estHandicapee: getBooleanOrNull(champsById[rootMapping.estHandicape.id], rootMapping.estHandicape.options),
      lienVictimeId: null, // No link as it's the "Personne concernée"
      estVictime: true,
      estVictimeInformee: null,
      commentaire: null,
      victimeInformeeCommentaire: null,
      veutGarderAnonymat,
      adresse: champsById[rootMapping.adresse.id] ? createAddress(champsById[rootMapping.adresse.id]) : null,
      aAutrePersonnes,
      autrePersonnes,
    };

    return {
      declarant: personneConcernee,
      victime: personneConcernee, // Same entity
    };
  } else {
    // "Non, je suis témoin, aidant ou proche d'une personne concernée"
    // → The declarant is the mandataire, the participant (demandeur) is the "Personne concernée"

    const estAnonymeChamp = champsById[rootMapping.estAnonyme.id];
    const declarantVeutAnonymat = getBooleanOrNull(estAnonymeChamp, rootMapping.estAnonyme.options);
    // Invert the logic: if they want anonymity, they don't want to communicate identity
    const declarantVeutGarderAnonymat = declarantVeutAnonymat === null ? null : !declarantVeutAnonymat;

    const victimeIdentiteCommuniqueChamp = champsById[rootMapping.victimeIdentiteCommunique.id];
    const veutCommuniquerIdentite = getBooleanOrNull(
      victimeIdentiteCommuniqueChamp,
      rootMapping.victimeIdentiteCommunique.options,
    );
    // Invert the logic: if they want to communicate identity, they don't want anonymity
    const victimeVeutGarderAnonymat = veutCommuniquerIdentite === null ? null : !veutCommuniquerIdentite;

    // Declarant = mandataire (uses usager email + mandataire fields)
    const declarant = {
      prenom: mandataire.prenom,
      nom: mandataire.nom,
      civiliteId: null, // No civilite for mandataire
      email: mandataire.email,
      telephone: champsById[rootMapping.declarantTelephone.id]?.stringValue ?? null,
      ageId: null, // No age for mandataire
      estHandicapee: null,
      lienVictimeId: getEnumIdFromLabel(
        rootMapping.lienVictime.options,
        champsById[rootMapping.lienVictime.id]?.stringValue ?? null,
      ),
      estVictime: false,
      veutGarderAnonymat: declarantVeutGarderAnonymat,
      adresse: null,
    };

    const victime = {
      prenom: demandeur.prenom,
      nom: demandeur.nom,
      civiliteId: demandeur.civiliteId,
      email: champsById[rootMapping.victimeEmail.id]?.stringValue ?? demandeur.email,
      telephone: champsById[rootMapping.victimeTelephone.id]?.stringValue ?? null,
      ageId: getEnumIdFromLabel(
        rootMapping.victimeAge.options,
        champsById[rootMapping.victimeAge.id]?.stringValue ?? null,
      ),
      estHandicapee: getBooleanOrNull(
        champsById[rootMapping.victimeEstHandicape.id],
        rootMapping.victimeEstHandicape.options,
      ),
      lienVictimeId: null,
      estVictime: true,
      estVictimeInformee: getBooleanOrNull(
        champsById[rootMapping.estVictimeInformee.id],
        rootMapping.estVictimeInformee.options,
      ),
      commentaire: champsById[rootMapping.raisons.id]?.stringValue ?? null,
      // victimeInformeeCommentaire: champsById[rootMapping.raisons.id]?.stringValue ?? null,
      victimeInformeeCommentaire: null,
      veutGarderAnonymat: victimeVeutGarderAnonymat,
      adresse: champsById[rootMapping.victimeAdressePostale.id]
        ? createAddress(champsById[rootMapping.victimeAdressePostale.id])
        : null,
      aAutrePersonnes,
      autrePersonnes,
    };

    return {
      declarant,
      victime,
    };
  }
};

const getOtherSituations = (champsById: MappedChamp) => {
  const champ = champsById[rootMapping.autreFaits.id];
  const subMapping = rootMapping.autreFaits.champs;
  if (champ.__typename === 'RepetitionChamp' && champ.champs.length > 0) {
    const repetitionChamps = splitRepetitionChamp(champ.champs);
    return repetitionChamps.map((repChamps) => {
      const faits = [getFait(repChamps, subMapping)];
      const demarchesEngagees = getDemarchesEngagees(repChamps, subMapping);
      const lieuDeSurvenue = getLieuDeSurvenue(repChamps, subMapping);
      const misEnCause = getMisEnCause(repChamps, subMapping);
      return {
        lieuDeSurvenue,
        misEnCause,
        demarchesEngagees,
        faits,
        entiteIds: [],
      };
    });
  }
  return [];
};

export const mapDataForPrisma = (
  champs: RootChampFragmentFragment[],
  id: number,
  date: string,
  mandataire: Mandataire,
  demandeur: Demandeur,
): CreateRequeteFromDematSocialDto => {
  const champsById = indexChamps(champs);

  const { declarant, victime } = getVictime(champsById, mandataire, demandeur);
  const faits = [getFait(champsById, rootMapping)];
  const demarchesEngagees = getDemarchesEngagees(champsById, rootMapping);
  const lieuDeSurvenue = getLieuDeSurvenue(champsById, rootMapping);
  const misEnCause = getMisEnCause(champsById, rootMapping);

  const situations = [
    {
      lieuDeSurvenue: lieuDeSurvenue,
      misEnCause,
      demarchesEngagees,
      faits,
      entiteIds: [],
    },
    ...getOtherSituations(champsById),
  ];

  return {
    receptionDate: new Date(date),
    receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
    declarant,
    participant: victime,
    dematSocialId: id,
    situations,
  };
};
