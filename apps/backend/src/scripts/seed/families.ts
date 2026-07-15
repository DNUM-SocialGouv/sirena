import {
  AGE,
  LIEU_TYPE,
  MIS_EN_CAUSE_TYPE,
  RECEPTION_TYPE,
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_PRIORITE_TYPES,
  REQUETE_STATUT_TYPES,
} from '@sirena/common/constants';
import type {
  DemarchesBlueprint,
  EtapeBlueprint,
  FaitBlueprint,
  FileBlueprint,
  LieuBlueprint,
  MisEnCauseBlueprint,
  PersonneBlueprint,
  RequeteBlueprint,
  SituationBlueprint,
} from './blueprint.js';
import type { SeedContext } from './context.js';
import { address, finess, pastDate, phone, rpps } from './faker.helpers.js';

const RECEPTION_TYPES = [RECEPTION_TYPE.PLATEFORME, RECEPTION_TYPE.TELEPHONE, RECEPTION_TYPE.FORMULAIRE];

/** One of the two seeded ARS, at random. */
const pickEntiteId = (ctx: SeedContext): string =>
  ctx.faker.helpers.arrayElement([ctx.entites.normandie.id, ctx.entites.idf.id]);

const makeIdentifiedPersonne = (ctx: SeedContext, estVictime: boolean): PersonneBlueprint => ({
  civiliteId: ctx.refs.civilites.pick(ctx.faker),
  prenom: ctx.faker.person.firstName(),
  nom: ctx.faker.person.lastName(),
  email: ctx.faker.internet.email(),
  telephone: phone(ctx.faker),
  ageId: ctx.refs.ages.pick(ctx.faker),
  estVictime,
  estHandicapee: ctx.faker.datatype.boolean(),
  veutGarderAnonymat: false,
  estIdentifie: true,
  lienVictimeId: estVictime ? null : ctx.refs.lienVictimes.pick(ctx.faker),
  mesureProtection: null,
  adresse: address(ctx.faker),
});

const makeLieu = (ctx: SeedContext, lieuTypeId: string): LieuBlueprint => ({
  lieuTypeId,
  transportTypeId: null,
  societeTransport: '',
  finess: '',
  codePostal: ctx.faker.location.zipCode('#####'),
  commentaire: ctx.faker.lorem.sentence(),
  adresse: address(ctx.faker),
});

const makeMisEnCause = (ctx: SeedContext, misEnCauseTypeId: string): MisEnCauseBlueprint => ({
  misEnCauseTypeId,
  rpps: null,
  civilite: ctx.faker.helpers.arrayElement(['M', 'MME']),
  nom: ctx.faker.person.lastName(),
  prenom: ctx.faker.person.firstName(),
  commentaire: ctx.faker.lorem.sentence(),
});

const emptyDemarches = (): DemarchesBlueprint => ({
  demarchesIds: [],
  datePlainte: null,
  autoriteTypeId: null,
  etablissementARepondu: null,
  dateContactEtablissement: null,
  organisme: '',
  commentaire: '',
});

const makeFait = (ctx: SeedContext): FaitBlueprint => ({
  motifsDeclaratifsIds: ctx.refs.motifsDeclaratifs.pickMany(ctx.faker, 1, 2),
  consequencesIds: ctx.refs.consequences.pickMany(ctx.faker, 0, 2),
  maltraitanceTypesIds: [],
  dateDebut: pastDate(ctx.faker, 8),
  dateFin: null,
  commentaire: ctx.faker.lorem.sentence(),
});

const pdfFile = (ctx: SeedContext): FileBlueprint => ({
  fileName: `piece-jointe-${ctx.faker.string.alphanumeric(6)}.pdf`,
  mimeType: 'application/pdf',
  size: ctx.faker.number.int({ min: 20_000, max: 500_000 }),
});

/** An in-progress processing step carrying a note and, optionally, an attachment. */
const makeProcessingEtape = (ctx: SeedContext, withFile: boolean): EtapeBlueprint => ({
  nom: 'Instruction en cours',
  statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
  notes: [ctx.faker.lorem.sentence(), ctx.faker.lorem.sentence()],
  files: withFile ? [pdfFile(ctx)] : [],
  clotureReasonIds: [],
  clotureDate: null,
});

const makeSituation = (ctx: SeedContext, entiteIds: string[]): SituationBlueprint => ({
  lieu: makeLieu(ctx, ctx.refs.lieuTypes.pick(ctx.faker)),
  misEnCause: makeMisEnCause(ctx, ctx.refs.misEnCauseTypes.pick(ctx.faker)),
  demarches: emptyDemarches(),
  fait: makeFait(ctx),
  entiteIds,
});

/**
 * A plausible, fully-formed request with random-but-coherent data. Each family
 * starts from this base and only overrides its signature.
 */
const makeBaseBlueprint = (ctx: SeedContext): RequeteBlueprint => {
  const entiteIds = [pickEntiteId(ctx)];
  return {
    familyId: 'base',
    familyLabel: 'Base',
    origin: 'MANUAL',
    receptionType: ctx.faker.helpers.arrayElement(RECEPTION_TYPES),
    receptionDate: pastDate(ctx.faker, 6),
    statutCible: REQUETE_STATUT_TYPES.EN_COURS,
    prioriteId: ctx.faker.helpers.arrayElement([
      REQUETE_PRIORITE_TYPES.BASSE,
      REQUETE_PRIORITE_TYPES.MOYENNE,
      REQUETE_PRIORITE_TYPES.HAUTE,
      null,
    ]),
    declarant: makeIdentifiedPersonne(ctx, false),
    participant: makeIdentifiedPersonne(ctx, true),
    situations: [makeSituation(ctx, entiteIds)],
    extraEtapes: [],
    entiteIds,
  };
};

export type Family = {
  id: string;
  label: string;
  build: (ctx: SeedContext) => RequeteBlueprint;
};

/**
 * Builds a family's blueprint and stamps it with the family's id/label — the
 * single source of truth (a family's `build` no longer repeats them).
 */
export const buildFamily = (family: Family, ctx: SeedContext): RequeteBlueprint => {
  const bp = family.build(ctx);
  bp.familyId = family.id;
  bp.familyLabel = family.label;
  return bp;
};

/**
 * The 11 case families. Together they guarantee coverage of the main business
 * shapes; beyond 11 requests, families are drawn at random.
 */
export const FAMILIES: Family[] = [
  {
    id: 'anonyme',
    label: 'Signalement anonyme',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      bp.statutCible = REQUETE_STATUT_TYPES.NOUVEAU;
      bp.declarant = {
        ...bp.declarant,
        estVictime: false,
        estIdentifie: false,
        veutGarderAnonymat: true,
        civiliteId: null,
        email: '',
        telephone: '',
        adresse: null,
      };
      return bp;
    },
  },
  {
    id: 'usager-identifie',
    label: 'Réclamation usager identifié',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      bp.declarant = makeIdentifiedPersonne(ctx, true);
      bp.participant = null;
      bp.extraEtapes.push(makeProcessingEtape(ctx, false));
      return bp;
    },
  },
  {
    id: 'ehpad',
    label: 'Maltraitance en établissement (EHPAD)',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      const situation = bp.situations[0];
      situation.lieu = makeLieu(
        ctx,
        ctx.refs.lieuTypes.requireOrPick(ctx.faker, LIEU_TYPE.ETABLISSEMENT_PERSONNES_AGEES),
      );
      situation.lieu.finess = finess(ctx.faker);
      situation.misEnCause = makeMisEnCause(
        ctx,
        ctx.refs.misEnCauseTypes.requireOrPick(ctx.faker, MIS_EN_CAUSE_TYPE.ETABLISSEMENT),
      );
      situation.fait.maltraitanceTypesIds = ctx.refs.maltraitanceTypes.pickMany(ctx.faker, 1, 3, (r) => r.id !== 'NON');
      bp.extraEtapes.push(makeProcessingEtape(ctx, true));
      return bp;
    },
  },
  {
    id: 'mineur-vulnerable',
    label: 'Victime mineure vulnérable',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      bp.participant = {
        ...makeIdentifiedPersonne(ctx, true),
        ageId: ctx.refs.ages.requireOrPick(ctx.faker, AGE['-18']),
        estHandicapee: true,
        mesureProtection: 'MANDATAIRE_JUDICIAIRE',
      };
      return bp;
    },
  },
  {
    id: 'pro-sante',
    label: 'Professionnel de santé mis en cause',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      const situation = bp.situations[0];
      situation.misEnCause = makeMisEnCause(
        ctx,
        ctx.refs.misEnCauseTypes.requireOrPick(ctx.faker, MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE),
      );
      situation.misEnCause.rpps = rpps(ctx.faker);
      situation.lieu = makeLieu(ctx, ctx.refs.lieuTypes.requireOrPick(ctx.faker, LIEU_TYPE.DOMICILE));
      return bp;
    },
  },
  {
    id: 'cloturee',
    label: 'Requête clôturée',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      bp.statutCible = REQUETE_STATUT_TYPES.CLOTUREE;
      bp.extraEtapes.push({
        nom: 'Clôture',
        statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
        notes: [ctx.faker.lorem.sentence()],
        files: [],
        clotureReasonIds: [ctx.refs.clotureReasons.pick(ctx.faker)],
        clotureDate: pastDate(ctx.faker, 2),
      });
      return bp;
    },
  },
  {
    id: 'multi-entites',
    label: 'Requête multi-entités',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      const entiteIds = [ctx.entites.normandie.id, ctx.entites.idf.id];
      bp.entiteIds = entiteIds;
      for (const situation of bp.situations) {
        situation.entiteIds = entiteIds;
      }
      return bp;
    },
  },
  {
    id: 'plainte',
    label: 'Plainte / démarches engagées',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      bp.situations[0].demarches = {
        demarchesIds: ctx.refs.demarches.pickMany(ctx.faker, 1, 2),
        datePlainte: pastDate(ctx.faker, 4),
        autoriteTypeId: ctx.refs.autoriteTypes.pick(ctx.faker),
        etablissementARepondu: true,
        dateContactEtablissement: pastDate(ctx.faker, 5),
        organisme: ctx.faker.company.name(),
        commentaire: ctx.faker.lorem.sentence(),
      };
      bp.extraEtapes.push(makeProcessingEtape(ctx, true));
      return bp;
    },
  },
  {
    id: 'transport',
    label: 'Transport sanitaire',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      const lieu = makeLieu(ctx, ctx.refs.lieuTypes.requireOrPick(ctx.faker, LIEU_TYPE.TRAJET));
      lieu.transportTypeId = ctx.refs.transportTypes.pick(ctx.faker);
      lieu.societeTransport = ctx.faker.company.name();
      lieu.adresse = null;
      bp.situations[0].lieu = lieu;
      return bp;
    },
  },
  {
    id: 'multi-situations',
    label: 'Requête multi-situations',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      const count = ctx.faker.number.int({ min: 2, max: 3 });
      bp.situations = Array.from({ length: count }, () => makeSituation(ctx, bp.entiteIds));
      return bp;
    },
  },
  {
    id: 'traitee',
    label: 'Requête traitée',
    build: (ctx) => {
      const bp = makeBaseBlueprint(ctx);
      bp.statutCible = REQUETE_STATUT_TYPES.TRAITEE;
      return bp;
    },
  },
];
