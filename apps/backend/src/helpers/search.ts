import type { Prisma } from '../libs/prisma.js';

// Case insensitive search
const ci = (s: string) => ({ contains: s, mode: 'insensitive' as const });

export const createSearchConditionsForRequeteEntite = (raw: string): Prisma.RequeteEntiteWhereInput => {
  const search = raw?.trim();
  if (!search) return {};

  // dematSocialId is a positive Int (int4) column. Match it only for a plain digit string that
  // fits in int4, otherwise Postgres throws "out of range for type integer" (e.g. a 12-digit RPPS).
  const INT32_MAX = 2_147_483_647;
  const dematSocialId = /^\d+$/.test(search) && Number(search) <= INT32_MAX ? Number(search) : null;
  const nameParts = search.split(/\s+/).filter(Boolean);
  const firstName = nameParts.length >= 2 ? nameParts[0] : null;
  const lastName = nameParts.length >= 2 ? nameParts.slice(1).join(' ') : null;
  const fullNameClauses: Prisma.RequeteEntiteWhereInput[] =
    firstName && lastName
      ? [
          {
            AND: [
              { requete: { declarant: { identite: { prenom: ci(firstName) } } } },
              { requete: { declarant: { identite: { nom: ci(lastName) } } } },
            ],
          },
          {
            AND: [
              { requete: { participant: { identite: { prenom: ci(firstName) } } } },
              { requete: { participant: { identite: { nom: ci(lastName) } } } },
            ],
          },
          {
            AND: [
              { requete: { declarant: { identite: { prenom: ci(lastName) } } } },
              { requete: { declarant: { identite: { nom: ci(firstName) } } } },
            ],
          },
          {
            AND: [
              { requete: { participant: { identite: { prenom: ci(lastName) } } } },
              { requete: { participant: { identite: { nom: ci(firstName) } } } },
            ],
          },
        ]
      : [];

  // A full-name match must use the first and last name of the same MisEnCause.
  const misEnCauseFullNameClauses: Prisma.MisEnCauseWhereInput[] =
    firstName && lastName
      ? [
          { prenom: ci(firstName), nom: ci(lastName) },
          { prenom: ci(lastName), nom: ci(firstName) },
        ]
      : [];

  const where: Prisma.RequeteEntiteWhereInput = {
    OR: [
      // ───────── Base "Requete" ─────────
      { requete: { id: ci(search) } },
      { requete: { commentaire: ci(search) } },
      { requete: { receptionType: { label: ci(search) } } },
      ...(dematSocialId !== null ? [{ requete: { dematSocialId } }] : []),

      // ───────── Declarant ─────────
      {
        requete: {
          declarant: {
            identite: {
              OR: [{ prenom: ci(search) }, { nom: ci(search) }, { email: ci(search) }, { telephone: ci(search) }],
            },
          },
        },
      },
      { requete: { declarant: { adresse: { OR: [{ ville: ci(search) }, { codePostal: ci(search) }] } } } },

      // ───────── Participant  ─────────
      {
        requete: {
          participant: {
            identite: {
              OR: [{ prenom: ci(search) }, { nom: ci(search) }, { email: ci(search) }, { telephone: ci(search) }],
            },
          },
        },
      },
      { requete: { participant: { adresse: { OR: [{ ville: ci(search) }, { codePostal: ci(search) }] } } } },
      ...fullNameClauses,

      // ───────── Situations → Faits → Motifs/Conséquences/Maltraitance ─────────
      {
        requete: {
          situations: {
            some: {
              faits: {
                some: {
                  motifs: { some: { motif: { label: ci(search) } } },
                },
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              faits: {
                some: {
                  consequences: { some: { consequence: { label: ci(search) } } },
                },
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              faits: {
                some: {
                  maltraitanceTypes: { some: { maltraitanceType: { label: ci(search) } } },
                },
              },
            },
          },
        },
      },

      // ───────── Situations → MisEnCause ─────────
      {
        requete: {
          situations: {
            some: {
              misEnCause: {
                OR: [
                  { commentaire: ci(search) },
                  { rpps: ci(search) },
                  { nom: ci(search) },
                  { prenom: ci(search) },
                  { finess: ci(search) },
                  { nomService: ci(search) },
                  { misEnCauseType: { label: ci(search) } },
                  { misEnCauseTypePrecision: { label: ci(search) } },
                  ...misEnCauseFullNameClauses,
                ],
              },
            },
          },
        },
      },

      // ───────── Lieu de survenue ─────────
      {
        requete: {
          situations: {
            some: {
              lieuDeSurvenue: {
                OR: [
                  { commentaire: ci(search) },
                  { finess: ci(search) },
                  { societeTransport: ci(search) },
                  { adresse: { OR: [{ ville: ci(search) }, { codePostal: ci(search) }, { label: ci(search) }] } },
                ],
              },
            },
          },
        },
      },
    ],
  };

  return where;
};
