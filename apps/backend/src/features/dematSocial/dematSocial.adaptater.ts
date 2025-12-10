import { RECEPTION_TYPE } from '@sirena/common/constants';
import type { CreateRequeteFromDematSocialDto } from '@/features/requetes/requetes.type';
import type { RootChampFragmentFragment } from '@/libs/graffle';
import { ChampMappingError, EnumNotFound } from './dematSocial.error';
import rootMapping from './dematSocial.mapper';
import type {
  AutreFaitsMapping,
  Demandeur,
  MappedChamp,
  MappedRepetitionChamp,
  Mapping,
  RepetitionChamp,
} from './dematSocial.type';

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

const getEnumIdFromLabel = (options: { key: string; label: string }[], label: string | null) => {
  const element = options.find((o) => o.label === label)?.key ?? null;
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
    const element = options.find((o) => o.label === value)?.key ?? null;
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

const createAddress = (champ: RootChampFragmentFragment | RepetitionChamp) => {
  if (
    champ.__typename === 'AddressChamp' &&
    champ.address?.label &&
    champ.address?.postalCode &&
    champ.address?.cityName &&
    champ.address?.streetName
  ) {
    return {
      label: champ.address.label,
      codePostal: champ.address.postalCode,
      ville: champ.address.cityName,
      rue: champ.address.streetName,
      numero: champ.address.streetNumber || '',
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
  const demarchesEngagees = {
    demarches: getEnumsFromLabel(mapping.demarchesEngagees.options, champsById[mapping.demarchesEngagees.id]),
    dateContactEtablissement: getDateByChamps(champsById[mapping.demarchesEngageesDateContactEtablissement.id]),
    etablissementARepondu: getBooleanOrNull(champsById[mapping.demarchesEngageesEtablissementARepondu.id]) || false,
    commentaire: champsById[mapping.demarchesEngageesAutre.id]?.stringValue ?? '',
    datePlainte: getDateByChamps(champsById[mapping.demarcheEngageDatePlainte.id]),
    files: getFilesByChamps(champsById[mapping.demarchesEngageesReponseFile.id]),
    autoriteTypeId: getEnumIdFromLabel(
      mapping.demarcheEngageAutoriteType.options,
      champsById[mapping.demarcheEngageAutoriteType.id]?.stringValue ?? null,
    ),
  };
  return demarchesEngagees;
};

const getLieuDeSurvenue = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const address = champsById[mapping.lieuAdresse.id] ? createAddress(champsById[mapping.lieuAdresse.id]) : null;
  const codePostal = getCodePostalByCommuneChamp(champsById[mapping.lieuCodePostal.id]);
  const nomEtablissementValue =
    'nomEtablissement' in mapping ? (champsById[mapping.nomEtablissement.id]?.stringValue ?? '') : '';
  const adresse = address ?? { label: nomEtablissementValue ?? '', codePostal, ville: '', rue: '', numero: '' };
  const finessValue = champsById[mapping.finess.id]?.stringValue ?? '';
  const lieux = {
    codePostal,
    commentaire: '',
    adresse,
    lieuTypeId: getEnumIdFromLabel(mapping.lieuType.options, champsById[mapping.lieuType.id]?.stringValue ?? null),
    transportTypeId: getEnumIdFromLabel(
      mapping.transportType.options,
      champsById[mapping.transportType.id]?.stringValue ?? null,
    ),
    societeTransport: champsById[mapping.transportSociete.id]?.stringValue ?? '',
    finess: finessValue,
  };
  return lieux;
};

const getResponsable = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  if (champsById[mapping.responsableType.id]?.stringValue) {
    return getEnumIdFromLabel(
      mapping.responsableType.options,
      champsById[mapping.responsableType.id]?.stringValue ?? null,
    );
  } else if (champsById[mapping.responsableType2.id]?.stringValue) {
    return getEnumIdFromLabel(
      mapping.responsableType2.options,
      champsById[mapping.responsableType2.id]?.stringValue ?? null,
    );
  }
  return null;
};

const getMisEnCause = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const misEnCause = {
    misEnCauseTypeId: getResponsable(champsById, mapping),
    professionTypeId: getEnumIdFromLabel(
      mapping.professionnelResponsable.options,
      champsById[mapping.professionnelResponsable.id]?.stringValue ?? null,
    ),
    professionDomicileTypeId: getEnumIdFromLabel(
      mapping.professionnelResponsableDomicile.options,
      champsById[mapping.professionnelResponsableDomicile.id]?.stringValue ?? null,
    ),
    rpps: champsById[mapping.professionnelResponsableIdentite.id]?.stringValue ?? null,
    commentaire: champsById[mapping.faitsCommentaire.id]?.stringValue ?? null,
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

const getVictime = (champsById: MappedChamp, demandeur: Demandeur) => {
  const estVictimeChamp = champsById[rootMapping.estVictime.id];
  const estVictime = getBooleanOrNull(estVictimeChamp, rootMapping.estVictime.options);

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
      email: demandeur.email,
      telephone: champsById[rootMapping.telephone.id]?.stringValue ?? null,
      ageId: getEnumIdFromLabel(rootMapping.age.options, champsById[rootMapping.age.id]?.stringValue ?? null),
      estHandicapee: getBooleanOrNull(champsById[rootMapping.estHandicape.id], rootMapping.estHandicape.options),
      lienVictimeId: null, // No link as it's the "Personne concernée"
      estVictime: true,
      estVictimeInformee: null,
      victimeInformeeCommentaire: null,
      veutGarderAnonymat,
      adresse: champsById[rootMapping.adresse.id] ? createAddress(champsById[rootMapping.adresse.id]) : null,
      autrePersonnes: champsById[rootMapping.autreVictimes.id]?.stringValue ?? '',
    };

    return {
      declarant: personneConcernee,
      victime: personneConcernee, // Same entity
    };
  } else {
    // "Non, je suis témoin, aidant ou proche d'une personne concernée"
    // → The declarant is the mandataire, the participant is the "Personne concernée"

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
      prenom: demandeur.prenom,
      nom: demandeur.nom,
      civiliteId: demandeur.civiliteId,
      email: demandeur.email, // Usager email = mandataire email
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

    // Participant = personne concernée
    const victime = {
      prenom: 'PersonneConcernéePrénom', // Fictive identity as no info is available
      nom: 'PersonneConcernéeNom',
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
      victimeInformeeCommentaire: champsById[rootMapping.raisons.id]?.stringValue ?? null,
      veutGarderAnonymat: victimeVeutGarderAnonymat,
      adresse: champsById[rootMapping.victimeAdressePostale.id]
        ? createAddress(champsById[rootMapping.victimeAdressePostale.id])
        : null,
      autrePersonnes: champsById[rootMapping.autreVictimes.id]?.stringValue ?? '',
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
  demandeur: Demandeur,
): CreateRequeteFromDematSocialDto => {
  const champsById = indexChamps(champs);

  const { declarant, victime } = getVictime(champsById, demandeur);
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
