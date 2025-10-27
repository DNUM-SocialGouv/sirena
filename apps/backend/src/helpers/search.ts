import type { Prisma } from '@/libs/prisma';

// Case insensitive search
const ci = (s: string) => ({ contains: s, mode: 'insensitive' as const });

export const createSearchConditionsForRequeteEntite = (raw: string): Prisma.RequeteEntiteWhereInput => {
  const search = raw?.trim();
  if (!search) return {};

  const numberSearch = Number.isFinite(Number(search)) ? Number(search) : null;

  const where: Prisma.RequeteEntiteWhereInput = {
    OR: [
      // ───────── Base "Requete" ─────────
      { requete: { id: ci(search) } },
      { requete: { commentaire: ci(search) } },
      { requete: { receptionType: { label: ci(search) } } },
      ...(numberSearch !== null ? [{ requete: { dematSocialId: numberSearch } }] : []),

      // ───────── Declarant ─────────
      { requete: { declarant: { identite: { prenom: ci(search) } } } },
      { requete: { declarant: { identite: { nom: ci(search) } } } },
      { requete: { declarant: { identite: { email: ci(search) } } } },
      { requete: { declarant: { identite: { telephone: ci(search) } } } },
      { requete: { declarant: { adresse: { ville: ci(search) } } } },
      { requete: { declarant: { adresse: { codePostal: ci(search) } } } },

      // ───────── Participant  ─────────
      { requete: { participant: { identite: { prenom: ci(search) } } } },
      { requete: { participant: { identite: { nom: ci(search) } } } },
      { requete: { participant: { identite: { email: ci(search) } } } },
      { requete: { participant: { identite: { telephone: ci(search) } } } },
      { requete: { participant: { adresse: { ville: ci(search) } } } },
      { requete: { participant: { adresse: { codePostal: ci(search) } } } },

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
                commentaire: ci(search),
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              misEnCause: {
                rpps: ci(search),
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              misEnCause: {
                misEnCauseType: { label: ci(search) },
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              misEnCause: {
                misEnCauseTypePrecision: { label: ci(search) },
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
                commentaire: ci(search),
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              lieuDeSurvenue: {
                finess: ci(search),
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              lieuDeSurvenue: {
                societeTransport: ci(search),
              },
            },
          },
        },
      },
      {
        requete: {
          situations: {
            some: {
              lieuDeSurvenue: {
                adresse: {
                  OR: [{ ville: ci(search) }, { codePostal: ci(search) }, { label: ci(search) }],
                },
              },
            },
          },
        },
      },
    ],
  };

  return where;
};
