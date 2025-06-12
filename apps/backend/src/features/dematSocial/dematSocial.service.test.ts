import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTHORITIES,
  NATURE_LIEU,
  SERVICE_A_DOMICILE,
  TYPE_DE_FAITS,
  TYPE_DE_MIS_EN_CAUSE,
} from './dematSocial.constants';
import { getCompetentAuthorities } from './dematSocial.service';

import type { Reclamation } from './dematSocial.type';

vi.mock('@/config/env', () => ({
  envVars: {
    OPENDATASOFT_URI: 'https://arssante.opendatasoft.com/api/explore/v2.1/catalog/datasets',
  },
}));

describe('siReclamation.service.ts service to connect to siReclamation', () => {
  it('returns CD authority for domicile with non-professionnel misEnCause', async () => {
    const mockReclamation: Reclamation = {
      id: '1',
      declarant: {
        civilite: 'Mme',
        prenom: 'Jane',
        telephone: '0123456789',
        estLaVictime: true,
        lienVictime: 'Autre',
        victimeInformeeDemarche: 'oui',
        anonymatVictimeDemande: false,
        anonymatMisEnCauseDemande: false,
        suiviDemande: true,
      },
      victime: {
        civilite: 'Mme',
        nom: 'Doe',
        prenom: 'Jane',
        trancheAge: '30 à 59 ans',
        enSituationDeHandicap: false,
        anonymatMisEnCauseDemande: 'Non',
        autresPersonnesVictimes: 'Non',
      },
      lieuSurvenue: {
        codePostal: '75001',
        commune: 'Paris',
        natureLieu: NATURE_LIEU.DOMICILE,
      },
      misEnCause: {
        typeDeMisEnCause: TYPE_DE_MIS_EN_CAUSE.MEMBRE_FAMILLE,
      },
      description: {
        maltraitance: false,
        typesDeFaits: [],
        consequenceSurLaVictime: [],
        situationToujoursActuelle: 'Oui',
        description: 'A description of the incident',
      },
      demarches: {
        contactEtablissementOuPersonneResponsable: {
          contactEffectue: false,
        },
      },
    };

    const result = await getCompetentAuthorities(mockReclamation);
    expect(result).toEqual(new Set([AUTHORITIES.CD]));
  });

  it('returns ARS authority for domicile with home hospitalization', async () => {
    const mockReclamation: Reclamation = {
      id: '1',
      declarant: {
        civilite: 'Mme',
        prenom: 'Jane',
        telephone: '0123456789',
        estLaVictime: true,
        lienVictime: 'Autre',
        victimeInformeeDemarche: 'oui',
        anonymatVictimeDemande: false,
        anonymatMisEnCauseDemande: false,
        suiviDemande: true,
      },
      victime: {
        civilite: 'Mme',
        nom: 'Doe',
        prenom: 'Jane',
        trancheAge: '30 à 59 ans',
        enSituationDeHandicap: false,
        anonymatMisEnCauseDemande: 'Non',
        autresPersonnesVictimes: 'Non',
      },
      lieuSurvenue: {
        codePostal: '75001',
        commune: 'Paris',
        natureLieu: NATURE_LIEU.DOMICILE,
        domicile: {
          adresse: '123 Rue de Paris',
          serviceADomicile: SERVICE_A_DOMICILE.HAD,
        },
      },
      misEnCause: {
        typeDeMisEnCause: TYPE_DE_MIS_EN_CAUSE.PROFESSIONNEL,
      },
      description: {
        maltraitance: false,
        typesDeFaits: [],
        consequenceSurLaVictime: [],
        situationToujoursActuelle: 'Oui',
        description: 'A description of the incident',
      },
      demarches: {
        contactEtablissementOuPersonneResponsable: {
          contactEffectue: false,
        },
      },
    };

    const result = await getCompetentAuthorities(mockReclamation);
    expect(result).toEqual(new Set([AUTHORITIES.ARS]));
  });

  it('returns ARS authority for domicile with judicial representative', async () => {
    const mockReclamation: Reclamation = {
      id: '1',
      declarant: {
        civilite: 'Mme',
        prenom: 'Jane',
        telephone: '0123456789',
        estLaVictime: true,
        lienVictime: 'Autre',
        victimeInformeeDemarche: 'oui',
        anonymatVictimeDemande: false,
        anonymatMisEnCauseDemande: false,
        suiviDemande: true,
      },
      victime: {
        civilite: 'Mme',
        nom: 'Doe',
        prenom: 'Jane',
        trancheAge: '30 à 59 ans',
        enSituationDeHandicap: false,
        anonymatMisEnCauseDemande: 'Non',
        autresPersonnesVictimes: 'Non',
      },
      lieuSurvenue: {
        codePostal: '75001',
        commune: 'Paris',
        natureLieu: NATURE_LIEU.DOMICILE,
        domicile: {
          adresse: '123 Rue de Paris',
          serviceADomicile: SERVICE_A_DOMICILE.MJPM,
        },
      },
      misEnCause: {
        typeDeMisEnCause: TYPE_DE_MIS_EN_CAUSE.PROFESSIONNEL,
      },
      description: {
        maltraitance: false,
        typesDeFaits: [],
        consequenceSurLaVictime: [],
        situationToujoursActuelle: 'Oui',
        description: 'A description of the incident',
      },
      demarches: {
        contactEtablissementOuPersonneResponsable: {
          contactEffectue: false,
        },
      },
    };

    const result = await getCompetentAuthorities(mockReclamation);
    expect(result).toEqual(new Set([AUTHORITIES.DDETS]));
  });

  it('returns CD, ARS authority for abuse with familly member in hospital', async () => {
    const mockReclamation: Reclamation = {
      id: '1',
      declarant: {
        civilite: 'Mme',
        prenom: 'Jane',
        telephone: '0123456789',
        estLaVictime: true,
        lienVictime: 'Autre',
        victimeInformeeDemarche: 'oui',
        anonymatVictimeDemande: false,
        anonymatMisEnCauseDemande: false,
        suiviDemande: true,
      },
      victime: {
        civilite: 'Mme',
        nom: 'Doe',
        prenom: 'Jane',
        trancheAge: '30 à 59 ans',
        enSituationDeHandicap: false,
        anonymatMisEnCauseDemande: 'Non',
        autresPersonnesVictimes: 'Non',
      },
      lieuSurvenue: {
        codePostal: '75001',
        commune: 'Paris',
        natureLieu: NATURE_LIEU.ETABLISSEMENT_SANTE,
      },
      misEnCause: {
        typeDeMisEnCause: TYPE_DE_MIS_EN_CAUSE.MEMBRE_FAMILLE,
      },
      description: {
        maltraitance: true,
        typesDeFaits: [],
        consequenceSurLaVictime: [],
        situationToujoursActuelle: 'Oui',
        description: 'A description of the incident',
      },
      demarches: {
        contactEtablissementOuPersonneResponsable: {
          contactEffectue: false,
        },
      },
    };

    const result = await getCompetentAuthorities(mockReclamation);
    expect(result).toEqual(new Set([AUTHORITIES.ARS, AUTHORITIES.CD]));
  });

  it('returns only ARS authority for abuse with familly member in EPHAD, with difficulty accessing care', async () => {
    const mockReclamation: Reclamation = {
      id: '1',
      declarant: {
        civilite: 'Mme',
        prenom: 'Jane',
        telephone: '0123456789',
        estLaVictime: true,
        lienVictime: 'Autre',
        victimeInformeeDemarche: 'oui',
        anonymatVictimeDemande: false,
        anonymatMisEnCauseDemande: false,
        suiviDemande: true,
      },
      victime: {
        civilite: 'Mme',
        nom: 'Doe',
        prenom: 'Jane',
        trancheAge: '30 à 59 ans',
        enSituationDeHandicap: false,
        anonymatMisEnCauseDemande: 'Non',
        autresPersonnesVictimes: 'Non',
      },
      lieuSurvenue: {
        codePostal: '75001',
        commune: 'Paris',
        natureLieu: NATURE_LIEU.ETABLISSEMENT_HEBERGEMENT,
      },
      misEnCause: {
        typeDeMisEnCause: TYPE_DE_MIS_EN_CAUSE.MEMBRE_FAMILLE,
      },
      description: {
        maltraitance: true,
        typesDeFaits: [TYPE_DE_FAITS.DIFFICULTES_ACCES_SOINS],
        consequenceSurLaVictime: [],
        situationToujoursActuelle: 'Oui',
        description: 'A description of the incident',
      },
      demarches: {
        contactEtablissementOuPersonneResponsable: {
          contactEffectue: false,
        },
      },
    };

    const result = await getCompetentAuthorities(mockReclamation);
    expect(result).toEqual(new Set([AUTHORITIES.ARS]));
  });

  it('returns only CD, DDETS authority for abuse with familly member in EPHAD, with difficulty accessing care', async () => {
    const finess = '210008702'; // real number

    const mockReclamation: Reclamation = {
      id: '1',
      declarant: {
        civilite: 'Mme',
        prenom: 'Jane',
        telephone: '0123456789',
        estLaVictime: true,
        lienVictime: 'Autre',
        victimeInformeeDemarche: 'oui',
        anonymatVictimeDemande: false,
        anonymatMisEnCauseDemande: false,
        suiviDemande: true,
      },
      victime: {
        civilite: 'Mme',
        nom: 'Doe',
        prenom: 'Jane',
        trancheAge: '30 à 59 ans',
        enSituationDeHandicap: false,
        anonymatMisEnCauseDemande: 'Non',
        autresPersonnesVictimes: 'Non',
      },
      lieuSurvenue: {
        codePostal: '75001',
        commune: 'Paris',
        natureLieu: NATURE_LIEU.ETABLISSEMENT_HEBERGEMENT,
        etablissementSanitaireEtSocial: {
          et_finess: finess,
        },
      },
      misEnCause: {
        typeDeMisEnCause: TYPE_DE_MIS_EN_CAUSE.MEMBRE_FAMILLE,
      },
      description: {
        maltraitance: false,
        typesDeFaits: [TYPE_DE_FAITS.PROBLEME_COMPORTEMENTAL],
        consequenceSurLaVictime: [],
        situationToujoursActuelle: 'Oui',
        description: 'A description of the incident',
      },
      demarches: {
        contactEtablissementOuPersonneResponsable: {
          contactEffectue: false,
        },
      },
    };

    const results = [{ tutelle: AUTHORITIES.DDETS, finess }];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total_count: 1,
          results,
        }),
      }),
    );

    const result = await getCompetentAuthorities(mockReclamation);
    expect(result).toEqual(new Set([AUTHORITIES.CD, AUTHORITIES.DDETS]));

    vi.unstubAllGlobals();
  });
});
