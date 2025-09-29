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
    champ.address?.streetName &&
    champ.address?.streetNumber
  ) {
    return {
      label: champ.address.label,
      codePostal: champ.address.postalCode,
      ville: champ.address.cityName,
      rue: champ.address.streetName,
      numero: champ.address.streetNumber,
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
    organisme: champsById[mapping.demarchesEngageesOrganisme.id]?.stringValue ?? '',
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

  const lieux = {
    codePostal: champsById[mapping.lieuCodePostal.id]?.stringValue ?? '',
    commentaire: champsById[mapping.lieuCommentaire.id]?.stringValue ?? '',
    adresse: address,
    lieuTypeId: getEnumIdFromLabel(mapping.lieuType.options, champsById[mapping.lieuType.id]?.stringValue ?? null),
    transportTypeId: getEnumIdFromLabel(
      mapping.transportType.options,
      champsById[mapping.transportType.id]?.stringValue ?? null,
    ),
    societeTransport: champsById[mapping.transportSociete.id]?.stringValue ?? '',
    finess: champsById[mapping.finess.id]?.stringValue ?? '',
  };
  return lieux;
};

const getMisEnCause = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const misEnCause = {
    misEnCauseTypeId: getEnumIdFromLabel(
      mapping.responsableType.options,
      champsById[mapping.responsableType.id]?.stringValue ?? null,
    ),
    professionTypeId: getEnumIdFromLabel(
      mapping.professionnelResponsable.options,
      champsById[mapping.professionnelResponsable.id]?.stringValue ?? null,
    ),
    professionDomicileTypeId: getEnumIdFromLabel(
      mapping.professionnelResponsableDomicile.options,
      champsById[mapping.professionnelResponsableDomicile.id]?.stringValue ?? null,
    ),
    rpps: champsById[mapping.professionnelResponsableIdentite.id]?.stringValue ?? null,
    commentaire: champsById[mapping.responsableComment.id]?.stringValue ?? null,
  };
  return misEnCause;
};

const getFait = (champsById: MappedChamp | MappedRepetitionChamp, mapping: Mapping | AutreFaitsMapping) => {
  const fait = {
    motifs: getEnumsFromLabel(mapping.motifsMap.options, champsById[mapping.motifsMap.id]),
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

const getDeclarantVictime = (champsById: MappedChamp, demandeur: Demandeur) => {
  const address = champsById[rootMapping.victimeAdresse.id]
    ? createAddress(champsById[rootMapping.victimeAdresse.id])
    : null;
  const personneConcernee = {
    ...demandeur,
    ageId: getEnumIdFromLabel(rootMapping.age.options, champsById[rootMapping.age.id]?.stringValue ?? null),
    telephone: champsById[rootMapping.telephone.id]?.stringValue ?? null,
    estHandicapee: getBooleanOrNull(champsById[rootMapping.estHandicape.id], rootMapping.estHandicape.options),
    lienVictimeId: null,
    estVictime: true,
    estAnonyme: getBooleanOrNull(champsById[rootMapping.estAnonyme.id], rootMapping.estAnonyme.options),
    adresse: address,
  };
  return personneConcernee;
};

const declarantNonConcerne = (champsById: MappedChamp, demandeur: Demandeur) => {
  const personneConcernee = {
    ...demandeur,
    ageId: null,
    telephone: champsById[rootMapping.declarantTelephone.id]?.stringValue ?? null,
    estHandicapee: null,
    lienVictimeId: getEnumIdFromLabel(
      rootMapping.lienVictime.options,
      champsById[rootMapping.lienVictime.id]?.stringValue ?? null,
    ),
    estVictime: false,
    estAnonyme: false,
    adresse: null,
  };
  return personneConcernee;
};

const getVictimeNonConcernee = (champsById: MappedChamp) => {
  const address = champsById[rootMapping.victimeAdressePostale.id]
    ? createAddress(champsById[rootMapping.victimeAdressePostale.id])
    : null;
  const personneConcernee = {
    telephone: champsById[rootMapping.victimeTelephone.id]?.stringValue ?? null,
    ageId: getEnumIdFromLabel(
      rootMapping.victimeAge.options,
      champsById[rootMapping.victimeAge.id]?.stringValue ?? null,
    ),
    adresse: address,
    estHandicapee: getBooleanOrNull(champsById[rootMapping.victimeEstHandicape.id], rootMapping.estHandicape.options),
    estVictimeInformee: getBooleanOrNull(
      champsById[rootMapping.estVictimeInformee.id],
      rootMapping.estVictimeInformee.options,
    ),
    victimeInformeeCommentaire: champsById[rootMapping.estVictimeInformeeCommentaire.id]?.stringValue ?? null,
    autrePersonnes: champsById[rootMapping.autreVictimesDetails.id]?.stringValue ?? null,
  };
  return personneConcernee;
};

const getVictime = (champsById: MappedChamp, demandeur: Demandeur) => {
  if (getBooleanOrNull(champsById[rootMapping.estVictime.id], rootMapping.estVictime.options)) {
    return {
      declarant: getDeclarantVictime(champsById, demandeur),
      victime: null,
    };
  }
  return {
    declarant: declarantNonConcerne(champsById, demandeur),
    victime: getVictimeNonConcernee(champsById),
  };
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
