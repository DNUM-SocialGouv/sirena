import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorHandler } from '../../../helpers/errors.js';
import appWithLogs from '../../../helpers/factories/appWithLogs.js';
import { generateApiKey } from '../../../libs/apiKey.js';
import { prisma } from '../../../libs/prisma.js';
import { enhancedPinoMiddleware } from '../../../middlewares/pino.middleware.js';
import ThirdPartyController from '../third-party.controller.js';

const app = appWithLogs
  .createApp()
  .use(enhancedPinoMiddleware())
  .route('/', ThirdPartyController)
  .onError(errorHandler);

let apiKey: string;
let accountId: string;
let apiKeyId: string;
const createdRequeteIds: string[] = [];

beforeAll(async () => {
  const account = await prisma.thirdPartyAccount.create({
    data: { name: `smoke-test-${Date.now()}` },
  });
  accountId = account.id;

  const { key, hash, prefix } = generateApiKey();
  apiKey = key;

  const record = await prisma.apiKey.create({
    data: {
      accountId: account.id,
      keyHash: hash,
      keyPrefix: prefix,
    },
  });
  apiKeyId = record.id;
});

afterAll(async () => {
  for (const id of createdRequeteIds) {
    const situations = await prisma.situation.findMany({ where: { requeteId: id } });
    for (const s of situations) {
      await prisma.faitMaltraitanceType.deleteMany({ where: { situationId: s.id } });
      await prisma.faitConsequence.deleteMany({ where: { situationId: s.id } });
      await prisma.faitMotifDeclaratif.deleteMany({ where: { situationId: s.id } });
      await prisma.fait.deleteMany({ where: { situationId: s.id } });
      await prisma.situationEntite.deleteMany({ where: { situationId: s.id } });
    }
    await prisma.situation.deleteMany({ where: { requeteId: id } });
    await prisma.requeteEtape.deleteMany({ where: { requeteId: id } });
    await prisma.requeteEntite.deleteMany({ where: { requeteId: id } });
    await prisma.uploadedFile.deleteMany({ where: { requeteId: id } });
    await prisma.personneConcernee.deleteMany({ where: { declarantDeId: id } });
    await prisma.personneConcernee.deleteMany({ where: { participantDeId: id } });
    await prisma.requete.delete({ where: { id } });
  }
  await prisma.apiKey.delete({ where: { id: apiKeyId } });
  await prisma.thirdPartyAccount.delete({ where: { id: accountId } });
  await prisma.$disconnect();
});

const request = (
  method: 'GET' | 'POST',
  path: string,
  options?: { headers?: Record<string, string>; body?: unknown },
) => {
  const init: RequestInit = {
    method,
    headers: {
      ...options?.headers,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  };
  return app.request(path, init);
};

const authHeaders = () => ({ 'X-API-Key': apiKey });

describe('Third-Party API - Authentication', () => {
  it('returns 401 without API key', async () => {
    const res = await request('GET', '/v1');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid format API key', async () => {
    const res = await request('GET', '/v1', { headers: { 'X-API-Key': 'bad-key' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 with well-formatted but unknown API key', async () => {
    const unknownKey = `sk_${'a'.repeat(64)}`;
    const res = await request('GET', '/v1', { headers: { 'X-API-Key': unknownKey } });
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid API key', async () => {
    const res = await request('GET', '/v1', { headers: authHeaders() });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toMatchObject({
      message: 'Authentication successful',
      accountId,
    });
    expect(res.headers.get('x-trace-id')).toBeDefined();
  });
});

describe('Third-Party API - Enums', () => {
  it('GET /v1/enums/age returns enum list', async () => {
    const res = await request('GET', '/v1/enums/age', { headers: authHeaders() });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty('id');
    expect(json[0]).toHaveProperty('label');
  });

  it('GET /v1/enums/civilite returns enum list', async () => {
    const res = await request('GET', '/v1/enums/civilite', { headers: authHeaders() });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });

  it('GET /v1/enums/lien-victime returns enum list', async () => {
    const res = await request('GET', '/v1/enums/lien-victime', { headers: authHeaders() });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });

  it('GET /v1/enums/mis-en-cause-type returns enum list', async () => {
    const res = await request('GET', '/v1/enums/mis-en-cause-type', { headers: authHeaders() });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });
});

describe('Third-Party API - POST /v1/requetes', () => {
  const validPayload = {
    declarant: {
      nom: 'Smoke',
      prenom: 'Test',
    },
    victime: {
      nom: 'Victime',
      prenom: 'Test',
    },
    situations: [
      {
        lieuDeSurvenue: {},
        misEnCause: {},
        demarchesEngagees: {},
      },
    ],
  };

  it('returns 200 with valid payload', async () => {
    const res = await request('POST', '/v1/requetes', {
      headers: authHeaders(),
      body: validPayload,
    });

    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.requeteId).toBeDefined();

    createdRequeteIds.push(json.requeteId);
  });

  it('returns 400 with empty body', async () => {
    const res = await request('POST', '/v1/requetes', {
      headers: authHeaders(),
      body: {},
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 with missing declarant', async () => {
    const res = await request('POST', '/v1/requetes', {
      headers: authHeaders(),
      body: {
        victime: validPayload.victime,
        situations: validPayload.situations,
      },
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 with empty situations array', async () => {
    const res = await request('POST', '/v1/requetes', {
      headers: authHeaders(),
      body: {
        ...validPayload,
        situations: [],
      },
    });

    expect(res.status).toBe(400);
  });

  it('returns 401 without API key', async () => {
    const res = await request('POST', '/v1/requetes', {
      body: validPayload,
    });

    expect(res.status).toBe(401);
  });
});

describe('Third-Party API - POST /v1/requetes (fiche contact complète)', () => {
  const ficheContactPayload = {
    receptionDate: '2026-02-18T10:30:00.000Z',
    declarant: {
      civiliteId: 'MME',
      nom: 'Durand',
      prenom: 'Marie',
      lienVictimeId: 'MEMBRE_FAMILLE',
      email: 'marie.durand@example.com',
      telephone: '0612345678',
      estVictime: false,
      veutGarderAnonymat: true,
      adresse: {
        label: '12 Rue de la Paix, 75002 Paris',
        numero: '12',
        rue: 'Rue de la Paix',
        codePostal: '75002',
        ville: 'Paris',
      },
    },
    victime: {
      civiliteId: 'M',
      nom: 'Durand',
      prenom: 'Jean',
      ageId: '>= 80',
      telephone: '0698765432',
      estHandicapee: false,
      estVictimeInformee: true,
      veutGarderAnonymat: false,
      adresse: {
        label: '5 Avenue des Lilas, 13001 Marseille',
        numero: '5',
        rue: 'Avenue des Lilas',
        codePostal: '13001',
        ville: 'Marseille',
      },
    },
    situations: [
      {
        lieuDeSurvenue: {
          lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES',
          codePostal: '13001',
          commentaire: 'EHPAD Les Oliviers',
          adresse: {
            label: '20 Boulevard Gambetta, 13001 Marseille',
            numero: '20',
            rue: 'Boulevard Gambetta',
            codePostal: '13001',
            ville: 'Marseille',
          },
        },
        misEnCause: {
          misEnCauseTypeId: 'ETABLISSEMENT',
          commentaire: 'Manque de personnel la nuit, absence de surveillance régulière',
        },
        demarchesEngagees: {
          demarches: ['CONTACT_RESPONSABLES', 'PLAINTE'],
          dateContactEtablissement: '2026-02-10T09:00:00.000Z',
          etablissementARepondu: true,
          commentaire: "La direction a reconnu un sous-effectif ponctuel mais n'a proposé aucune mesure corrective",
          datePlainte: '2026-02-15T14:00:00.000Z',
          autoriteTypeId: 'COMMISSARIAT',
        },
        faits: [
          {
            motifsDeclaratifs: ['PROBLEME_QUALITE_SOINS', 'PROBLEME_ORGANISATION'],
            consequences: ['SANTE', 'BESOINS'],
            maltraitanceTypes: ['NEGLIGENCES'],
            dateDebut: '2026-01-15T00:00:00.000Z',
            dateFin: undefined,
            commentaire:
              "Mon père de 82 ans réside à l'EHPAD Les Oliviers depuis 2024. " +
              'Depuis janvier 2026, nous constatons une dégradation importante de sa prise en charge : ' +
              "toilettes non effectuées certains jours, repas servis froids, sonnette d'appel sans réponse pendant plus d'une heure. " +
              "Il a développé une escarre au talon gauche qui n'a pas été détectée à temps par le personnel.",
          },
        ],
      },
    ],
  };

  it('returns 200 with complete fiche contact payload', async () => {
    const res = await request('POST', '/v1/requetes', {
      headers: authHeaders(),
      body: ficheContactPayload,
    });

    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.requeteId).toBeDefined();

    const requeteId = json.requeteId;
    createdRequeteIds.push(requeteId);

    const requete = await prisma.requete.findUniqueOrThrow({
      where: { id: requeteId },
      include: {
        declarant: { include: { identite: true, adresse: true, lienVictime: true } },
        participant: { include: { identite: true, adresse: true, age: true } },
        situations: {
          include: {
            lieuDeSurvenue: { include: { adresse: true, lieuType: true } },
            misEnCause: true,
            demarchesEngagees: { include: { demarches: true, autoriteType: true } },
            faits: {
              include: {
                motifsDeclaratifs: { include: { motifDeclaratif: true } },
                consequences: { include: { consequence: true } },
                maltraitanceTypes: { include: { maltraitanceType: true } },
              },
            },
          },
        },
      },
    });

    // Declarant
    expect(requete.declarant).toBeDefined();
    expect(requete.declarant?.identite?.nom).toBe('Durand');
    expect(requete.declarant?.identite?.prenom).toBe('Marie');
    expect(requete.declarant?.identite?.email).toBe('marie.durand@example.com');
    expect(requete.declarant?.identite?.telephone).toBe('0612345678');
    expect(requete.declarant?.lienVictime?.id).toBe('MEMBRE_FAMILLE');
    expect(requete.declarant?.veutGarderAnonymat).toBe(true);
    expect(requete.declarant?.adresse?.codePostal).toBe('75002');
    expect(requete.declarant?.adresse?.ville).toBe('Paris');

    // Participant (personne concernée)
    expect(requete.participant).toBeDefined();
    expect(requete.participant?.identite?.nom).toBe('Durand');
    expect(requete.participant?.identite?.prenom).toBe('Jean');
    expect(requete.participant?.age?.id).toBe('>= 80');
    expect(requete.participant?.estVictimeInformee).toBe(true);
    expect(requete.participant?.adresse?.ville).toBe('Marseille');

    // Situation
    const [situation] = requete.situations;
    expect(situation).toBeDefined();

    // Lieu de survenue
    expect(situation.lieuDeSurvenue.lieuType?.id).toBe('ETABLISSEMENT_PERSONNES_AGEES');
    expect(situation.lieuDeSurvenue.commentaire).toBe('EHPAD Les Oliviers');
    expect(situation.lieuDeSurvenue.adresse?.rue).toBe('Boulevard Gambetta');

    // Mis en cause
    expect(situation.misEnCause.misEnCauseTypeId).toBe('ETABLISSEMENT');

    // Démarches engagées
    expect(situation.demarchesEngagees.demarches).toHaveLength(2);
    const demarcheIds = situation.demarchesEngagees.demarches.map((d: { id: string }) => d.id).sort();
    expect(demarcheIds).toEqual(['CONTACT_RESPONSABLES', 'PLAINTE']);
    expect(situation.demarchesEngagees.etablissementARepondu).toBe(true);
    expect(situation.demarchesEngagees.autoriteType?.id).toBe('COMMISSARIAT');

    // Faits
    const [fait] = situation.faits;
    expect(fait).toBeDefined();
    expect(fait.commentaire).toContain('escarre');

    const motifIds = fait.motifsDeclaratifs.map((m: { motifDeclaratifId: string }) => m.motifDeclaratifId).sort();
    expect(motifIds).toEqual(['PROBLEME_ORGANISATION', 'PROBLEME_QUALITE_SOINS']);

    const consequenceIds = fait.consequences.map((c: { consequenceId: string }) => c.consequenceId).sort();
    expect(consequenceIds).toEqual(['BESOINS', 'SANTE']);

    const maltraitanceIds = fait.maltraitanceTypes
      .map((m: { maltraitanceTypeId: string }) => m.maltraitanceTypeId)
      .sort();
    expect(maltraitanceIds).toEqual(['NEGLIGENCES']);
  });
});
