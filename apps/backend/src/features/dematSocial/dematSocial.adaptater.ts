import { RECEPTION_TYPE } from '@sirena/common/constants';
import type { CreateRequeteFromDematSocialDto } from '@/features/requetes/requetes.type';
import type { RootChampFragmentFragment } from '@/libs/graffle';
import { ChampMappingError, EnumNotFound } from './dematSocial.error';
import mapping from './dematSocial.mapper';

type MappedChamp = {
  [key: string]: RootChampFragmentFragment;
};

const indexChamps = (champs: RootChampFragmentFragment[]) =>
  Object.fromEntries(champs.map((champ) => [atob(champ.id), champ]));

const getEnumIdFromLabel = (options: { key: string; label: string }[], label: string | null) => {
  const element = options.find((o) => o.label === label)?.key ?? null;
  if (!element) {
    return null;
  }
  return element;
};

const getEnumsFromLabel = (options: { key: string; label: string }[], champ: RootChampFragmentFragment): string[] => {
  if (champ.__typename !== 'MultipleDropDownListChamp') {
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

const getDateByChamps = (champ: RootChampFragmentFragment) => {
  if (champ.__typename !== 'DateChamp') {
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

const createAddress = (champ: RootChampFragmentFragment) => {
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

const getBooleanOrNull = (champ: RootChampFragmentFragment, options: { key: boolean | null; label: string }[]) => {
  if (champ.stringValue) {
    const match = options.find((opt) => opt.label === champ.stringValue);
    if (match) {
      return match.key;
    }
  }
  throw new ChampMappingError(champ, 'unknown', 'Invalid mapping value');
};

const getDemarchesEngagees = (champsById: MappedChamp) => {
  const demarchesEngagees = {
    demarches: getEnumsFromLabel(mapping.demarchesEngagees.options, champsById[mapping.demarchesEngagees.id]),
    dateContactEtablissement: getDateByChamps(champsById[mapping.demarchesEngageesDateContactEtablissement.id]),
    etablissementARepondu: champsById[mapping.demarchesEngageesEtablissementARepondu.id]?.stringValue === 'Oui',
    organisme: champsById[mapping.demarchesEngageesOrganisme.id]?.stringValue ?? '',
    datePlainte: champsById[mapping.demarcheEngageDatePlainte.id]
      ? getDateByChamps(champsById[mapping.demarcheEngageDatePlainte.id])
      : null,
    autoriteTypeId: getEnumIdFromLabel(
      mapping.demarcheEngageAutoriteType.options,
      champsById[mapping.demarcheEngageAutoriteType.id]?.stringValue ?? null,
    ),
  };
  return demarchesEngagees;
};

const getLieuDeSurvenue = (champsById: MappedChamp) => {
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
    societeTransport: champsById[mapping.transportSociété.id]?.stringValue ?? '',
    finess: champsById[mapping.finess.id]?.stringValue ?? '',
  };
  return lieux;
};

const getMisEnCause = (champsById: MappedChamp) => {
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
    commentaire: champsById[mapping.responssableComment.id]?.stringValue ?? null,
  };
  return misEnCause;
};

const getFait = (champsById: MappedChamp) => {
  const fait = {
    motifs: getEnumsFromLabel(mapping.motifsMap.options, champsById[mapping.motifsMap.id]),
    consequences: getEnumsFromLabel(mapping.consequencesMap.options, champsById[mapping.consequencesMap.id]),
    maltraitanceTypes: getEnumsFromLabel(
      mapping.maltraitanceTypesMap.options,
      champsById[mapping.maltraitanceTypesMap.id],
    ),
    dateDebut: getDateByChamps(champsById[mapping.dateDebut.id]),
    dateFin: champsById[mapping.dateFin.id] ? getDateByChamps(champsById[mapping.dateFin.id]) : null,
    commentaire: champsById[mapping.faitsCommentaire.id]?.stringValue ?? null,
  };
  return fait;
};

const getDeclarantVictime = (champsById: MappedChamp) => {
  const address = createAddress(champsById[mapping.victimeAdresse.id]);
  const personneConcernee = {
    ageId: getEnumIdFromLabel(mapping.age.options, champsById[mapping.age.id]?.stringValue ?? null),
    telephone: champsById[mapping.telephone.id]?.stringValue ?? null,
    estHandicapee: getBooleanOrNull(champsById[mapping.estHandicape.id], mapping.estHandicape.options),
    lienVictimeId: null,
    estVictime: true,
    estAnonyme: getBooleanOrNull(champsById[mapping.estAnonyme.id], mapping.estAnonyme.options),
    adresse: address,
  };
  return personneConcernee;
};

const declarantNonConcerne = (champsById: MappedChamp) => {
  const personneConcernee = {
    ageId: null,
    telephone: champsById[mapping.declarantTelephone.id]?.stringValue ?? null,
    estHandicapee: null,
    lienVictimeId: getEnumIdFromLabel(
      mapping.lienVictime.options,
      champsById[mapping.lienVictime.id]?.stringValue ?? null,
    ),
    estVictime: false,
    estAnonyme: false,
    adresse: null,
  };
  return personneConcernee;
};

const getVictimeNonConcernee = (champsById: MappedChamp) => {
  const address = createAddress(champsById[mapping.victimeAdressePostale.id]);
  const personneConcernee = {
    telephone: champsById[mapping.victimeTelephone.id]?.stringValue ?? null,
    ageId: getEnumIdFromLabel(mapping.victimeAge.options, champsById[mapping.victimeAge.id]?.stringValue ?? null),
    adresse: address,
    estHandicapee: getBooleanOrNull(champsById[mapping.victimeEstHandicape.id], mapping.estHandicape.options),
    estVictimeInformee: getBooleanOrNull(champsById[mapping.estVictimeInformee.id], mapping.estVictimeInformee.options),
    victimeInformeeCommentaire: champsById[mapping.estVictimeInformeeCommentaire.id]?.stringValue ?? null,
    autrePersonnes: champsById[mapping.autreVictimes.id]?.stringValue ?? null,
  };
  return personneConcernee;
};

const getVictime = (champsById: MappedChamp) => {
  if (getBooleanOrNull(champsById[mapping.estVictime.id], mapping.estVictime.options)) {
    return {
      declarant: getDeclarantVictime(champsById),
      victime: null,
    };
  }
  return {
    declarant: declarantNonConcerne(champsById),
    victime: getVictimeNonConcernee(champsById),
  };
};

export const mapDataForPrisma = (
  champs: RootChampFragmentFragment[],
  id: number,
  date: string,
): CreateRequeteFromDematSocialDto => {
  const champsById = indexChamps(champs);

  const { declarant, victime } = getVictime(champsById);
  const faits = [getFait(champsById)];
  const demarchesEngagees = getDemarchesEngagees(champsById);
  const lieuDeSurvenue = getLieuDeSurvenue(champsById);
  const misEnCause = getMisEnCause(champsById);

  const situations = [
    {
      lieuDeSurvenue: lieuDeSurvenue,
      misEnCause,
      demarchesEngagees,
      faits,
      entiteIds: [],
    },
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
