import { ChampMappingError, EnumNotFound } from '@/features/dematSocial/dematSocial.errors';
import type { RootChampFragmentFragment } from '@/libs/graffle';
import { receptionTypes } from '@sirena/common/constants';
import mapping from './dematSocial.mapper';

const indexChamps = (champs: RootChampFragmentFragment[]) =>
  Object.fromEntries(champs.map((champ) => [champ.id, champ]));

const getEnumIdFromLabel = (options: { key: string; label: string }[], label: string | null): string => {
  const element = options.find((o) => o.label === label)?.key ?? null;
  if (!element) {
    throw new EnumNotFound(`No enum found for label: ${label}`);
  }
  return element;
};
const getDateByChamps = (champ: RootChampFragmentFragment) => {
  if (champ.__typename === 'DateChamp' && champ.date) {
    const date = new Date(champ.date);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    throw new ChampMappingError(champ, 'date', `Invalid date value: ${champ?.date}`);
  }
  throw new ChampMappingError(champ, 'date', 'Invalid mapping value');
};

const splitStringValues = (value?: string | null): string[] => value?.split(',')?.map((v) => v.trim()) ?? [];

const decodeChampId = (id: string): [string, string] => {
  const [champId, groupId] = atob(id).split('|');
  return [champId, groupId];
};

const mapMisEnCause = (champ: RootChampFragmentFragment) => {
  if (champ.__typename === 'RepetitionChamp' && champ.champs) {
    return champ.champs.flatMap((champ) => {
      if (champ.stringValue) {
        return [
          {
            commentaire: champ.stringValue,
          },
        ];
      }
      return [];
    });
  }
  throw new ChampMappingError(champ, 'RepetitionChamp', 'Invalid mapping value');
};

const isChecked = (champ: RootChampFragmentFragment) => {
  if (champ.__typename === 'CheckboxChamp') {
    return champ.checked;
  }
  throw new ChampMappingError(champ, 'CheckboxChamp', 'Invalid mapping value');
};

const mapLieux = (champ: RootChampFragmentFragment) => {
  if (champ.__typename === 'RepetitionChamp' && champ.champs) {
    const grouped: Record<string, { lieu?: string; commentaire?: string }> = {};

    for (const subChamp of champ.champs) {
      const [champCode, groupId] = decodeChampId(champ.id);

      if (!grouped[groupId]) grouped[groupId] = {};

      if (champCode === 'Champ-28175') {
        grouped[groupId].lieu = subChamp.stringValue ?? '';
      } else if (champCode === 'Champ-28176') {
        grouped[groupId].commentaire = subChamp.stringValue ?? '';
      }
    }

    const mapped = Object.values(grouped).flatMap((entry) => {
      if (entry.lieu) {
        return [
          {
            lieuType: {
              connect: {
                id: getEnumIdFromLabel(mapping.lieuType.options, entry.lieu),
              },
            },
            commentaire: entry.commentaire ?? null,
          },
        ];
      }
      return [];
    });
    return mapped;
  }
  throw new ChampMappingError(champ, 'RepetitionChamp', 'Invalid mapping value');
};

const getConnection = <T extends string>(key: T, options: { key: string; label: string }[], label: string | null) => {
  if (!label) {
    return {
      [key]: null,
    } as { [P in T]: null };
  }
  const id = getEnumIdFromLabel(options, label);
  if (id) {
    return {
      [key]: {
        connect: {
          id,
        },
      },
    } as { [P in T]: { connect: { id: string } } };
  }
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
      address: {
        create: {
          label: champ.address.label,
          codePostal: champ.address.postalCode,
          ville: champ.address.cityName,
          rue: champ.address.streetName,
          numRue: champ.address.streetNumber,
        },
      },
    };
  }
  throw new ChampMappingError(champ, 'AddressChamp', 'Invalid mapping value');
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

export const mapDataForPrisma = (champs: RootChampFragmentFragment[], id: number, date: string) => {
  const champsById = indexChamps(champs);

  if (isChecked(champsById[mapping.estVictime.id])) {
    const declarant = {
      estIdentifie: true,
      ...createAddress(champsById[mapping.victimeAdresse.id]),
      identite: {
        create: {
          telephone: champsById[mapping.telephone.id]?.stringValue ?? null,
        },
      },
      age: {
        connect: { id: getEnumIdFromLabel(mapping.age.options, champsById[mapping.age.id]?.stringValue ?? null) },
      },
    };

    const victime = {
      ...declarant,
      estAnonyme: getBooleanOrNull(champsById[mapping.estAnonyme.id], mapping.estAnonyme.options),
      estHandicapee: getBooleanOrNull(champsById[mapping.estHandicape.id], mapping.estHandicape.options),
      commentaire: champsById[mapping.autreVictimes.id]?.stringValue ?? null,
    };
  } else {
    const victimeInfformeeCommentaire =
      champsById[mapping.estVictimeInformeeComment.id]?.stringValue ||
      champsById[mapping.estVictimeInformeeComment2.id]?.stringValue;

    const declarant = {
      estIdentifie: true,
      estAnonyme: getBooleanOrNull(champsById[mapping.estDeclarantAnonyme.id], mapping.estAnonyme.options),
      lienVictime: getEnumIdFromLabel(
        mapping.lienVictime.options,
        champsById[mapping.lienVictime.id]?.stringValue || null,
      ),
      identite: {
        create: {
          telephone: champsById[mapping.declarantTelephone.id]?.stringValue ?? null,
        },
      },
      estVictimeInformee: getBooleanOrNull(
        champsById[mapping.estVictimeInformee.id],
        mapping.estVictimeInformee.options,
      ),
      estVictimeInformeeCommentaire: victimeInfformeeCommentaire,
    };

    const victime = {
      estHandicapee: getBooleanOrNull(champsById[mapping.victimeEstHandicape.id], mapping.estHandicape.options),
      estAnonyme: getBooleanOrNull(champsById[mapping.victimeEstAnonyme.id], mapping.estAnonyme.options),
      identite: {
        create: {
          nom: champsById[mapping.victimeNom.id]?.stringValue ?? null,
          prenom: champsById[mapping.victimePrenom.id]?.stringValue ?? null,
          telephone: champsById[mapping.victimeTelephone.id]?.stringValue ?? null,
          email: champsById[mapping.victimeEmail.id]?.stringValue ?? null,
        },
      },
      ...createAddress(champsById[mapping.victimeAdresse.id]),
      age: {
        connect: {
          id: getEnumIdFromLabel(mapping.age.options, champsById[mapping.victimeAge.id]?.stringValue ?? null),
        },
      },
      civilite: {
        connect: {
          id: getEnumIdFromLabel(
            mapping.victimeCivilite.options,
            champsById[mapping.victimeCivilite.id]?.stringValue ?? null,
          ),
        },
      },
    };
  }

  const declarant = {
    estIdentifie: true,
    estAnonyme: champsById[mapping.estAnonyme.id]?.stringValue === 'Oui',
    age: {
      connect: { id: getEnumIdFromLabel(mapping.age.options, champsById[mapping.age.id]?.stringValue ?? null) },
    },
    // address only if victime
    ...createAddress(champsById[mapping.victimeAdresse.id]),
    identite: {
      create: {
        telephone: champsById[mapping.telephone.id]?.stringValue ?? null,
        commentaire: champsById[mapping.faitsCommentaire.id]?.stringValue ?? null,
      },
    },
  };

  const victime = {
    estAnonyme: champsById[mapping.estAnonyme.id]?.stringValue === 'Oui',
    estHandicapee: champsById[mapping.estHandicape.id]?.stringValue === 'Oui',
    estInformee: champsById[mapping.estVictimeInformee.id]?.stringValue === 'Oui',
    identite: {
      create: {
        nom: champsById[mapping.victimeNom.id]?.stringValue ?? null,
        prenom: champsById[mapping.victimePrenom.id]?.stringValue ?? null,
        telephone: champsById[mapping.telephone.id]?.stringValue ?? null,
        commentaire: champsById[mapping.faitsCommentaire.id]?.stringValue ?? null,
      },
    },
    age: {
      connect: { id: getEnumIdFromLabel(mapping.age.options, champsById[mapping.age.id]?.stringValue ?? null) },
    },
  };

  const descriptionFaits = {
    estMaltraitance: champsById[mapping.estMaltraitance.id]?.stringValue === 'Oui',
    dateDebut: getDateByChamps(champsById[mapping.dateDebut.id]),
    commentaire: champsById[mapping.faitsCommentaire.id]?.stringValue,
    motifs: {
      create: splitStringValues(champsById[mapping.motifsMap.id]?.stringValue).map((label) => ({
        motif: { connect: { id: getEnumIdFromLabel(mapping.motifsMap.options, label) } },
      })),
    },
    consequences: {
      create: splitStringValues(champsById[mapping.consequencesMap.id]?.stringValue).map((label) => ({
        consequence: { connect: { id: getEnumIdFromLabel(mapping.consequencesMap.options, label) } },
      })),
    },
    maltraitanceTypes: {
      create: splitStringValues(champsById[mapping.maltraitanceTypesMap.id]?.stringValue).map((label) => ({
        maltraitanceType: { connect: { id: getEnumIdFromLabel(mapping.maltraitanceTypesMap.options, label) } },
      })),
    },
  };

  const demarchesEngagees = {
    aContacte: champsById[mapping.estDemarcheEngage.id]?.stringValue === 'Oui',
    dateContact: getDateByChamps(champsById[mapping.demarcheEngageDate.id]),
    aRepondu: champsById[mapping.demarcheEngageReponse.id]?.stringValue === 'Oui',
    aContacteAutre: champsById[mapping.demarcheEngageAutre.id]?.stringValue === 'Oui',
    autreOrganisation: champsById[mapping.demarcheEngageOrganisme.id]?.stringValue ?? null,
    aDeposePlainte: champsById[mapping.demarcheEngagePlainte.id]?.stringValue === 'Oui',
    plainteDeposeDate: getDateByChamps(champsById[mapping.demarcheEngagePlainteDate.id]),
    plainteDeposeLocation: champsById[mapping.demarcheEngagePlainteContact.id]?.stringValue ?? null,
    commentaire: champsById[mapping.precisions.id]?.stringValue ?? null,
  };

  const lieuxIncident = [
    {
      lieuType: {
        connect: {
          id: getEnumIdFromLabel(mapping.lieuType.options, champsById[mapping.lieuType.id]?.stringValue ?? null),
        },
      },
      commentaire: champsById[mapping.lieuCommentaire.id]?.stringValue ?? null,
      adresse: champsById[mapping.adresseLieu.id]?.stringValue ?? null,
      codePostal: champsById[mapping.lieuCodePostal.id]?.stringValue ?? null,
      ...getConnection(
        'transportType',
        mapping.transportType.options,
        champsById[mapping.transportType.id]?.stringValue ?? null,
      ),
    },
    ...mapLieux(champsById[mapping.lieuAutre.id]),
  ];

  const infosComplementaire = {
    receptionDate: new Date(date),
    commentaire: champsById[mapping.precisions.id]?.stringValue ?? null,
    receptionType: {
      connect: {
        id: receptionTypes.FORUMULAIRE,
      },
    },
  };

  let misEnCauseTypeId: string;
  if (champsById[mapping.responsableType.id]) {
    misEnCauseTypeId = getEnumIdFromLabel(
      mapping.responsableType.options,
      champsById[mapping.responsableType.id]?.stringValue ?? null,
    );
  } else {
    misEnCauseTypeId = getEnumIdFromLabel(
      mapping.responsableTypeDomicile.options,
      champsById[mapping.responsableTypeDomicile.id]?.stringValue ?? null,
    );
  }

  let professionTypeId: string | null = null;
  if (champsById[mapping.professionnelResponsable.id]) {
    professionTypeId = getEnumIdFromLabel(
      mapping.professionnelResponsable.options,
      champsById[mapping.professionnelResponsable.id]?.stringValue ?? null,
    );
  }

  let professionDomicileTypeEnumId: string | null = null;
  if (champsById[mapping.professionnelResponsableDomicile.id]) {
    professionDomicileTypeEnumId = getEnumIdFromLabel(
      mapping.professionnelResponsableDomicile.options,
      champsById[mapping.professionnelResponsableDomicile.id]?.stringValue ?? null,
    );
  }

  const misEnCause = [
    {
      commentaire: champsById[mapping.responsableComment.id]?.stringValue ?? null,
      identite: null,
      rpps: champsById[mapping.professionnelResponsableIdentite.id]?.stringValue ?? null,
      misEnCauseTypeEnum: {
        connect: misEnCauseTypeId,
      },
      ...(professionTypeId
        ? {
            professionType: {
              connect: professionTypeId,
            },
          }
        : {}),
      ...(professionDomicileTypeEnumId
        ? {
            professionDomicileTypeEnum: {
              connect: professionDomicileTypeEnumId,
            },
          }
        : {}),
    },
    ...mapMisEnCause(champsById[mapping.responsableAutre.id]),
  ];
};
