import { RECEPTION_TYPE } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { AddressType, type RootChampFragmentFragment } from '@/libs/graffle';
import { mapDataForPrisma } from './dematSocial.adaptater';
import rootMapping from './dematSocial.mapper';

const toB64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const fromB64 = (s: string) => Buffer.from(s, 'base64').toString('utf8');

function labelFor<T extends { key: string | boolean; label: string }>(options: T[], keyToPick: T['key']) {
  const found = options.find((o) => o.key === keyToPick);
  if (!found) throw new Error('Option not found');
  return found.label;
}
function firstLabel(options: { label: string }[]) {
  if (!options.length) throw new Error('options empty');
  return options[0].label;
}
const textChamp = (mappingId: string, stringValue: string | null): RootChampFragmentFragment => ({
  __typename: 'TextChamp',
  label: '',
  id: toB64(mappingId),
  stringValue,
});

const multiSelectChamp = (mappingId: string, values: string[]): RootChampFragmentFragment => ({
  __typename: 'MultipleDropDownListChamp',
  label: '',
  id: toB64(mappingId),
  values,
});

const dateChamp = (mappingId: string, iso: string | null): RootChampFragmentFragment => ({
  __typename: 'DateChamp',
  label: '',
  id: toB64(mappingId),
  date: iso,
});

const repetitionEmpty = (mappingId: string): RootChampFragmentFragment => ({
  __typename: 'RepetitionChamp',
  label: '',
  id: toB64(mappingId),
  champs: [],
});

const addressChamp = (mappingIdB64: string): RootChampFragmentFragment => ({
  __typename: 'AddressChamp',
  label: '',
  id: toB64(mappingIdB64),
  address: {
    label: 'l',
    type: AddressType.Street,
    postalCode: '75001',
    cityName: 'paris',
    cityCode: 'paris',
  },
});

const filesChamp = (
  mappingId: string,
  files: Array<{ filename: string; url: string; contentType: string }>,
): RootChampFragmentFragment => ({
  __typename: 'PieceJustificativeChamp',
  label: '',
  id: toB64(mappingId),
  files: files.map((f) => ({
    __typename: 'File',
    checksum: '',
    byteSize: 0n,
    createdAt: new Date().toISOString(),
    ...f,
  })),
});

const repetitionChamp = (mappingId: string, parts: Record<string, RootChampFragmentFragment[]>) => {
  const champs = Object.entries(parts).flatMap(([partKey, arr]) =>
    arr.map((champ) => ({
      ...champ,
      id: toB64(`${fromB64(champ.id)}|${partKey}`),
    })),
  );

  return {
    __typename: 'RepetitionChamp' as const,
    label: '',
    id: toB64(mappingId),
    champs,
  };
};

describe('dematSocial.mapper mapDataForPrisma', () => {
  it('create a dto', () => {
    const estVictimeOui = labelFor(rootMapping.estVictime.options, true);
    const estAnonLabel = firstLabel(rootMapping.estAnonyme.options);
    const estHandiLabel = firstLabel(rootMapping.estHandicape.options);

    const motifsLbl = firstLabel(rootMapping.motifsMap.options);
    const consequencesLbl = firstLabel(rootMapping.consequencesMap.options);
    const maltraitanceLbl = firstLabel(rootMapping.maltraitanceTypesMap.options);
    const demarchesLbl = firstLabel(rootMapping.demarchesEngagees.options);

    const consLbl = firstLabel(rootMapping.autreFaits.champs.consequencesMap.options);
    const maltLbl = firstLabel(rootMapping.autreFaits.champs.maltraitanceTypesMap.options);
    const demLbl = firstLabel(rootMapping.autreFaits.champs.demarchesEngagees.options);

    const rep = repetitionChamp(rootMapping.autreFaits.id, {
      faits: [
        multiSelectChamp(rootMapping.autreFaits.champs.motifsMap.id, [motifsLbl]),
        multiSelectChamp(rootMapping.autreFaits.champs.consequencesMap.id, [consLbl]),
        multiSelectChamp(rootMapping.autreFaits.champs.maltraitanceTypesMap.id, [maltLbl]),
        dateChamp(rootMapping.autreFaits.champs.dateDebut.id, '2025-03-01'),
        dateChamp(rootMapping.autreFaits.champs.dateFin.id, null),
        textChamp(rootMapping.autreFaits.champs.faitsCommentaire.id, 'c1'),
        filesChamp(rootMapping.autreFaits.champs.faitsFichiers.id, [
          { filename: 'a.pdf', url: 'u', contentType: 'application/pdf' },
        ]),
        multiSelectChamp(rootMapping.autreFaits.champs.demarchesEngagees.id, [demLbl]),
        dateChamp(rootMapping.autreFaits.champs.demarchesEngageesDateContactEtablissement.id, '2025-03-02'),
        textChamp(rootMapping.autreFaits.champs.demarchesEngageesEtablissementARepondu.id, 'Non'),
        textChamp(rootMapping.autreFaits.champs.demarchesEngageesOrganisme.id, 'Org'),
        dateChamp(rootMapping.autreFaits.champs.demarcheEngageDatePlainte.id, null),
        textChamp(
          rootMapping.autreFaits.champs.demarcheEngageAutoriteType.id,
          firstLabel(rootMapping.autreFaits.champs.demarcheEngageAutoriteType.options),
        ),
        textChamp(
          rootMapping.autreFaits.champs.lieuType.id,
          firstLabel(rootMapping.autreFaits.champs.lieuType.options),
        ),
        textChamp(
          rootMapping.autreFaits.champs.transportType.id,
          firstLabel(rootMapping.autreFaits.champs.transportType.options),
        ),
      ],
      // faits2: [
      //   multiSelectChamp(rootMapping.autreFaits.champs.motifsMap.id, [motifsLbl]),
      //   multiSelectChamp(rootMapping.autreFaits.champs.consequencesMap.id, [consLbl]),
      //   multiSelectChamp(rootMapping.autreFaits.champs.maltraitanceTypesMap.id, [maltLbl]),
      //   dateChamp(rootMapping.autreFaits.champs.dateDebut.id, '2025-03-05'),
      // ],
    });

    const champs: RootChampFragmentFragment[] = [
      textChamp(rootMapping.estVictime.id, estVictimeOui),
      textChamp(rootMapping.estAnonyme.id, estAnonLabel),
      textChamp(rootMapping.estHandicape.id, estHandiLabel),

      multiSelectChamp(rootMapping.motifsMap.id, [motifsLbl]),
      multiSelectChamp(rootMapping.consequencesMap.id, [consequencesLbl]),
      multiSelectChamp(rootMapping.maltraitanceTypesMap.id, [maltraitanceLbl]),
      dateChamp(rootMapping.dateDebut.id, '2025-01-03T10:00:00.000Z'),
      dateChamp(rootMapping.dateFin.id, null),

      multiSelectChamp(rootMapping.demarchesEngagees.id, [demarchesLbl]),
      repetitionEmpty(rootMapping.autreFaits.id),
      addressChamp(rootMapping.victimeAdresse.id),
      rep,
    ];

    const demandeur = { nom: 'X', prenom: 'Y', civiliteId: 'M', email: '' } as const;
    const receptionDateIso = '2025-01-02T00:00:00.000Z';

    const dto = mapDataForPrisma(champs, 123, receptionDateIso, demandeur);

    expect(dto.receptionTypeId).toBe(RECEPTION_TYPE.FORMULAIRE);
    expect(dto.dematSocialId).toBe(123);
    expect(dto.receptionDate.toISOString()).toBe(new Date(receptionDateIso).toISOString());

    expect(dto.declarant?.estVictime).toBe(true);
    expect(dto.participant).toBeNull();

    expect(dto.situations.length).toBeGreaterThan(0);
    const s0 = dto.situations[0];

    expect(s0.faits[0].dateDebut instanceof Date).toBe(true);

    const motifsKey = rootMapping.motifsMap.options.find((o) => o.label === motifsLbl)?.key;
    const consKey = rootMapping.consequencesMap.options.find((o) => o.label === consequencesLbl)?.key;
    const maltKey = rootMapping.maltraitanceTypesMap.options.find((o) => o.label === maltraitanceLbl)?.key;
    const demarchesKey = rootMapping.demarchesEngagees.options.find((o) => o.label === demarchesLbl)?.key;

    expect(s0.faits[0].motifs).toContain(motifsKey);
    expect(s0.faits[0].consequences).toContain(consKey);
    expect(s0.faits[0].maltraitanceTypes).toContain(maltKey);
    expect(s0.demarchesEngagees.demarches).toContain(demarchesKey);

    expect(dto.situations.slice(1)).toHaveLength(1);
  });
});
