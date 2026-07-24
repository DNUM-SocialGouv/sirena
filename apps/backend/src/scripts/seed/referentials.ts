import type { Faker } from '@faker-js/faker';
import { prisma } from '../../libs/prisma.js';

type EnumRow = { id: string; label: string };

/**
 * A referential (enum table) loaded from the DB. We read at runtime and pick
 * from what actually exists, so the seed never references an id that was not
 * seeded (no hardcoded ids, no FK violation mid-run).
 */
export class EnumSet {
  private readonly byId: Map<string, EnumRow>;

  constructor(
    readonly name: string,
    readonly rows: EnumRow[],
  ) {
    this.byId = new Map(rows.map((r) => [r.id, r]));
  }

  /** Random id among all rows (optionally filtered). */
  pick(faker: Faker, filter?: (r: EnumRow) => boolean): string {
    const pool = filter ? this.rows.filter(filter) : this.rows;
    if (pool.length === 0) {
      throw new Error(`Referential "${this.name}" is empty — are the enum migrations applied?`);
    }
    return faker.helpers.arrayElement(pool).id;
  }

  /** Several distinct random ids. */
  pickMany(faker: Faker, min: number, max: number, filter?: (r: EnumRow) => boolean): string[] {
    const pool = filter ? this.rows.filter(filter) : this.rows;
    const count = Math.min(pool.length, faker.number.int({ min, max }));
    return faker.helpers.arrayElements(pool, count).map((r) => r.id);
  }

  /** A specific id, asserting it was seeded (clear error otherwise). */
  require(id: string): string {
    if (!this.byId.has(id)) {
      throw new Error(`Referential "${this.name}" is missing expected id "${id}".`);
    }
    return id;
  }

  /** A specific id if present, otherwise a random fallback. */
  requireOrPick(faker: Faker, id: string): string {
    return this.byId.has(id) ? id : this.pick(faker);
  }
}

export type Referentials = {
  motifsDeclaratifs: EnumSet;
  consequences: EnumSet;
  maltraitanceTypes: EnumSet;
  lieuTypes: EnumSet;
  transportTypes: EnumSet;
  misEnCauseTypes: EnumSet;
  clotureReasons: EnumSet;
  ages: EnumSet;
  civilites: EnumSet;
  lienVictimes: EnumSet;
  autoriteTypes: EnumSet;
  demarches: EnumSet;
};

/**
 * Loads every referential the request factory needs, once, from the DB.
 */
export const loadReferentials = async (): Promise<Referentials> => {
  const [
    motifsDeclaratifs,
    consequences,
    maltraitanceTypes,
    lieuTypes,
    transportTypes,
    misEnCauseTypes,
    clotureReasons,
    ages,
    civilites,
    lienVictimes,
    autoriteTypes,
    demarches,
  ] = await Promise.all([
    prisma.motifDeclaratifEnum.findMany({ select: { id: true, label: true } }),
    prisma.consequenceEnum.findMany({ select: { id: true, label: true } }),
    prisma.maltraitanceTypeEnum.findMany({ select: { id: true, label: true } }),
    prisma.lieuTypeEnum.findMany({ select: { id: true, label: true } }),
    prisma.transportTypeEnum.findMany({ select: { id: true, label: true } }),
    prisma.misEnCauseTypeEnum.findMany({ select: { id: true, label: true } }),
    prisma.requeteClotureReasonEnum.findMany({ select: { id: true, label: true } }),
    prisma.ageEnum.findMany({ select: { id: true, label: true } }),
    prisma.civiliteEnum.findMany({ select: { id: true, label: true } }),
    prisma.lienVictimeEnum.findMany({ select: { id: true, label: true } }),
    prisma.autoriteTypeEnum.findMany({ select: { id: true, label: true } }),
    prisma.demarchesEngageesEnum.findMany({ select: { id: true, label: true } }),
  ]);

  return {
    motifsDeclaratifs: new EnumSet('MotifDeclaratifEnum', motifsDeclaratifs),
    consequences: new EnumSet('ConsequenceEnum', consequences),
    maltraitanceTypes: new EnumSet('MaltraitanceTypeEnum', maltraitanceTypes),
    lieuTypes: new EnumSet('LieuTypeEnum', lieuTypes),
    transportTypes: new EnumSet('TransportTypeEnum', transportTypes),
    misEnCauseTypes: new EnumSet('MisEnCauseTypeEnum', misEnCauseTypes),
    clotureReasons: new EnumSet('RequeteClotureReasonEnum', clotureReasons),
    ages: new EnumSet('AgeEnum', ages),
    civilites: new EnumSet('CiviliteEnum', civilites),
    lienVictimes: new EnumSet('LienVictimeEnum', lienVictimes),
    autoriteTypes: new EnumSet('AutoriteTypeEnum', autoriteTypes),
    demarches: new EnumSet('DemarchesEngageesEnum', demarches),
  };
};
