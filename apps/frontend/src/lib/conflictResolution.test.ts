import type { SituationData } from '@sirena/common/schemas';
import { describe, expect, it } from 'vitest';
import {
  detectAndMergeConflicts,
  extractConflictPayload,
  flattenConflictPaths,
  unflattenConflictPaths,
} from './conflictResolution';

describe('extractConflictPayload', () => {
  const payload = { serverData: { id: 'decl-1' }, serverUpdatedAt: '2026-01-01T11:00:00.000Z' };

  it('reads the payload the API puts under cause', () => {
    expect(
      extractConflictPayload({
        message: 'The declarant identity has been modified by another user.',
        cause: { ...payload, kind: 'BUSINESS' },
      }),
    ).toMatchObject(payload);
  });

  it('still reads the legacy conflictData shape', () => {
    expect(extractConflictPayload({ message: 'conflict', conflictData: payload })).toMatchObject(payload);
  });

  it('returns nothing usable for a body without a conflict payload', () => {
    expect(extractConflictPayload({ message: 'conflict' })).toEqual({});
    expect(extractConflictPayload({ message: 'conflict', conflictData: null })).toEqual({});
    expect(extractConflictPayload(null)).toEqual({});
    expect(extractConflictPayload('nope')).toEqual({});
  });

  it('rejects a payload whose serverUpdatedAt is not a string', () => {
    expect(extractConflictPayload({ cause: { ...payload, serverUpdatedAt: 1735729200000 } })).toEqual({});
    expect(extractConflictPayload({ cause: { ...payload, serverUpdatedAt: null } })).toEqual({});
    expect(extractConflictPayload({ cause: { ...payload, serverUpdatedAt: { at: '2026-01-01' } } })).toEqual({});
  });

  it('accepts the extra kind key the API merges into cause', () => {
    expect(
      extractConflictPayload({
        message: 'The declarant identity has been modified by another user.',
        cause: { ...payload, kind: 'business' },
      }),
    ).toEqual(payload);
  });
});

describe('detectAndMergeConflicts', () => {
  it('takes the server value for a field only the server changed', () => {
    const result = detectAndMergeConflicts({ nom: 'Lovelace' }, { nom: 'Lovelace' }, { nom: 'Byron' });

    expect(result.canAutoResolve).toBe(true);
    expect(result.merged).toEqual({ nom: 'Byron' });
  });

  it('reports a field both sides changed as a conflict', () => {
    const result = detectAndMergeConflicts({ nom: 'Lovelace' }, { nom: 'Ada' }, { nom: 'Byron' });

    expect(result.canAutoResolve).toBe(false);
    expect(result.conflicts).toEqual([
      { field: 'nom', originalValue: 'Lovelace', currentValue: 'Ada', serverValue: 'Byron' },
    ]);
  });

  it('keeps a __proto__ key from reaching the prototype', () => {
    const server = JSON.parse('{"__proto__": {"polluted": true}, "nom": "Byron"}');

    const result = detectAndMergeConflicts({ nom: 'Lovelace' }, { nom: 'Lovelace' }, server);

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(result.merged)).toBe(Object.prototype);
    expect(result.merged.nom).toBe('Byron');
  });
});

const situation: SituationData = {
  lieuDeSurvenue: {
    lieuType: 'ETABLISSEMENT_SANTE',
    lieuPrecision: 'CHU',
    codePostal: '75012',
    finess: '750100042',
    tutelle: 'ARS',
    categCode: '355',
    categLib: 'Centre Hospitalier Régional',
    adresse: {
      label: '10 rue de Bercy 75012 Paris',
      numero: '10',
      rue: 'rue de Bercy',
      codePostal: '75012',
      ville: 'Paris',
    },
  },
  misEnCause: {
    misEnCauseType: 'PROFESSIONNEL_SANTE',
    misEnCauseTypePrecision: 'MEDECIN_GENERALISTE',
    rpps: '10001234567',
    civilite: 'MME',
    nom: 'Lovelace',
    prenom: 'Ada',
    nomService: 'Cardiologie',
    codePostal: '75012',
    ville: 'Paris',
    autrePrecision: 'Remplaçante',
    commentaire: 'Signalée à deux reprises',
  },
  fait: {
    motifs: ['MEDICAMENTS/STOCKAGE_MEDICAMENTS'],
    maltraitanceTypes: ['NEGLIGENCES'],
    motifsDeclaratifs: ['MALTRAITANCE'],
    consequences: ['SANTE'],
    dateDebut: '2026-01-05',
    dateFin: '2026-01-09',
    commentaire: 'Traitement interrompu',
    autresPrecisions: 'Aucune',
    fileIds: ['file-1', 'file-2'],
    files: [{ id: 'file-1', fileName: 'compte-rendu.pdf', size: 2048 }],
  },
  demarchesEngagees: {
    demarches: ['CONTACT_RESPONSABLES', 'PLAINTE'],
    dateContactResponsables: '2026-01-10',
    reponseRecueResponsables: true,
    precisionsOrganisme: 'Direction des soins',
    dateDepotPlainte: '2026-01-12',
    lieuDepotPlainte: 'COMMISSARIAT',
    commentaire: 'Médiation en cours',
  },
  traitementDesFaits: {
    entites: [{ entiteId: 'ent-1', entiteName: 'ARS Île-de-France', directionServiceId: 'dir-1' }],
  },
  domainesFonctionnels: 'SANITAIRE',
  estLieAuSignalement: 'OUI',
  numerosSignalement: '098655, 446789',
};

describe('flattenConflictPaths', () => {
  it('turns each nested leaf into a dotted path', () => {
    const flat = flattenConflictPaths(situation);

    expect(flat['lieuDeSurvenue.adresse.ville']).toBe('Paris');
    expect(flat['lieuDeSurvenue.lieuType']).toBe('ETABLISSEMENT_SANTE');
    expect(flat['misEnCause.nom']).toBe('Lovelace');
    expect(flat['demarchesEngagees.reponseRecueResponsables']).toBe(true);
    expect(flat.domainesFonctionnels).toBe('SANITAIRE');
    expect(flat.lieuDeSurvenue).toBeUndefined();
  });

  it('keeps arrays atomic instead of splitting them per index', () => {
    const flat = flattenConflictPaths(situation);

    expect(flat['fait.motifs']).toEqual(situation.fait?.motifs);
    expect(flat['fait.motifs.0']).toBeUndefined();
    expect(flat['traitementDesFaits.entites']).toEqual(situation.traitementDesFaits?.entites);
    expect(flat['traitementDesFaits.entites.0.entiteId']).toBeUndefined();
    expect(flat['fait.files']).toEqual(situation.fait?.files);
  });

  it('treats null and undefined as leaves', () => {
    const flat = flattenConflictPaths({ estLieAuSignalement: null, numerosSignalement: undefined });

    expect(Object.keys(flat).sort()).toEqual(['estLieAuSignalement', 'numerosSignalement']);
    expect(flat.estLieAuSignalement).toBeNull();
    expect(flat.numerosSignalement).toBeUndefined();
  });

  it('keeps an empty object as a leaf so the section does not vanish', () => {
    expect(flattenConflictPaths({ fait: {}, misEnCause: { nom: 'Ada' } })).toEqual({
      fait: {},
      'misEnCause.nom': 'Ada',
    });
  });

  it('returns nothing for a value that is not a plain object', () => {
    expect(flattenConflictPaths(null)).toEqual({});
    expect(flattenConflictPaths(undefined)).toEqual({});
    expect(flattenConflictPaths(['a'])).toEqual({});
    expect(flattenConflictPaths('nope')).toEqual({});
    expect(flattenConflictPaths({})).toEqual({});
  });

  it('keeps a __proto__ key from reaching the prototype', () => {
    const flat = flattenConflictPaths(JSON.parse('{"fait": {"__proto__": {"polluted": true}}}'));

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(flat['fait.__proto__.polluted']).toBe(true);
  });
});

describe('unflattenConflictPaths', () => {
  it('rebuilds the nesting from dotted paths', () => {
    expect(
      unflattenConflictPaths({
        'lieuDeSurvenue.adresse.ville': 'Paris',
        'lieuDeSurvenue.lieuType': 'DOMICILE',
        numerosSignalement: '098655',
      }),
    ).toEqual({
      lieuDeSurvenue: { adresse: { ville: 'Paris' }, lieuType: 'DOMICILE' },
      numerosSignalement: '098655',
    });
  });

  it('lets a deeper path win over an empty-object leaf whatever the order', () => {
    expect(unflattenConflictPaths({ fait: {}, 'fait.commentaire': 'ok' })).toEqual({ fait: { commentaire: 'ok' } });
    expect(unflattenConflictPaths({ 'fait.commentaire': 'ok', fait: {} })).toEqual({ fait: { commentaire: 'ok' } });
  });

  it('keeps a __proto__ segment from reaching the prototype', () => {
    const rebuilt = unflattenConflictPaths(JSON.parse('{"fait.__proto__.polluted": true}')) as {
      fait: Record<string, unknown>;
    };

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(rebuilt.fait)).toBe(Object.prototype);
  });

  it('round-trips a complete situation payload', () => {
    expect(unflattenConflictPaths(flattenConflictPaths(situation))).toEqual(situation);
  });

  it('round-trips the empty and partial shapes a situation takes', () => {
    const shapes: SituationData[] = [
      {},
      { fait: {} },
      { lieuDeSurvenue: { adresse: {} } },
      { estLieAuSignalement: null },
      { fait: { motifs: [], files: [] } },
      { traitementDesFaits: { entites: [] } },
    ];

    for (const shape of shapes) {
      expect(unflattenConflictPaths(flattenConflictPaths(shape))).toEqual(shape);
    }
  });
});

describe('flatten + detectAndMergeConflicts + unflatten', () => {
  const original = flattenConflictPaths(situation);

  it('merges two deep fields edited by two users without asking anything', () => {
    const current = { ...original, 'lieuDeSurvenue.adresse.ville': 'Lyon' };
    const server = { ...original, 'misEnCause.nom': 'Byron' };

    const result = detectAndMergeConflicts(original, current, server);
    const merged = unflattenConflictPaths(result.merged) as SituationData;

    expect(result.canAutoResolve).toBe(true);
    expect(merged.lieuDeSurvenue?.adresse?.ville).toBe('Lyon');
    expect(merged.misEnCause?.nom).toBe('Byron');
    expect(merged.fait?.motifs).toEqual(situation.fait?.motifs);
  });

  it('reports the leaf, not the whole branch, when both users edit the same deep field', () => {
    const current = { ...original, 'lieuDeSurvenue.adresse.ville': 'Lyon' };
    const server = { ...original, 'lieuDeSurvenue.adresse.ville': 'Marseille' };

    const result = detectAndMergeConflicts(original, current, server);

    expect(result.conflicts).toEqual([
      {
        field: 'lieuDeSurvenue.adresse.ville',
        originalValue: 'Paris',
        currentValue: 'Lyon',
        serverValue: 'Marseille',
      },
    ]);
  });

  it('reports an array as a single conflict rather than one per element', () => {
    const current = { ...original, 'fait.motifs': ['MEDICAMENTS/VENTE_MEDICAMENTS_INTERNET'] };
    const server = {
      ...original,
      'fait.motifs': ['MEDICAMENTS/STOCKAGE_MEDICAMENTS', 'MEDICAMENTS/VENTE_MEDICAMENTS_INTERNET'],
    };

    const result = detectAndMergeConflicts(original, current, server);

    const [conflict] = result.conflicts;

    expect(result.conflicts).toHaveLength(1);
    expect(conflict.field).toBe('fait.motifs');
  });
});
