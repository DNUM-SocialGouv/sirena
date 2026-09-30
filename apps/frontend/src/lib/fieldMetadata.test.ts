import { describe, expect, it } from 'vitest';
import { situationFieldMetadata } from './fieldMetadata';

const realisticValues: Record<string, unknown> = {
  'lieuDeSurvenue.lieuType': 'ETABLISSEMENT_SANTE',
  'lieuDeSurvenue.lieuPrecision': 'CHU',
  'lieuDeSurvenue.transportType': 'AMBULANCE',
  'misEnCause.misEnCauseType': 'PROFESSIONNEL_SANTE',
  'misEnCause.misEnCauseTypePrecision': 'AUTRE',
  'misEnCause.civilite': 'MME',
  'fait.motifs': ['MEDICAMENTS/STOCKAGE_MEDICAMENTS'],
  'fait.motifsDeclaratifs': ['MALTRAITANCE'],
  'fait.maltraitanceTypes': ['NEGLIGENCES'],
  'fait.consequences': ['SANTE'],
  'fait.dateDebut': '2026-01-05',
  'fait.dateFin': '2026-01-09',
  'fait.fileIds': ['file-1', 'file-2', 'file-3'],
  'fait.files': [{ id: 'file-1', fileName: 'compte-rendu.pdf', size: 2048 }],
  'demarchesEngagees.demarches': ['CONTACT_RESPONSABLES'],
  'demarchesEngagees.dateContactResponsables': '2026-01-10',
  'demarchesEngagees.reponseRecueResponsables': true,
  'demarchesEngagees.dateDepotPlainte': '2026-01-12',
  'demarchesEngagees.lieuDepotPlainte': 'COMMISSARIAT',
  'traitementDesFaits.entites': [
    { entiteId: 'ent-1', entiteName: 'ARS Île-de-France', directionServiceName: 'Direction de la santé publique' },
  ],
  domainesFonctionnels: 'SANITAIRE',
  estLieAuSignalement: 'OUI',
};

const formattedPaths = Object.entries(situationFieldMetadata).filter(([, metadata]) => metadata.format);

describe('situationFieldMetadata', () => {
  it('gives every path a label that stands on its own', () => {
    for (const [path, metadata] of Object.entries(situationFieldMetadata)) {
      expect(metadata.label.length, path).toBeGreaterThan(3);
      expect(metadata.label, path).not.toBe(path);
    }
  });

  it.each(formattedPaths)('renders a readable value for %s', (path, metadata) => {
    const format = metadata.format as (value: unknown) => string;
    const formatted = format(realisticValues[path]);

    expect(formatted).not.toBe('');
    expect(formatted).not.toContain('[object Object]');
    expect(formatted).not.toContain('undefined');
    expect(formatted).not.toBe(String(realisticValues[path]));
  });

  it.each(formattedPaths)('does not throw on a missing value for %s', (_path, metadata) => {
    const format = metadata.format as (value: unknown) => string;

    expect(format(undefined)).not.toBe('');
    expect(format(null)).not.toBe('');
  });

  it('renders an empty list readably instead of an empty string', () => {
    const emptyListPaths = [
      'fait.motifs',
      'fait.motifsDeclaratifs',
      'fait.maltraitanceTypes',
      'fait.consequences',
      'fait.fileIds',
      'fait.files',
      'demarchesEngagees.demarches',
      'traitementDesFaits.entites',
    ];

    for (const path of emptyListPaths) {
      const format = situationFieldMetadata[path].format as (value: unknown) => string;
      expect(format([]), path).toMatch(/^(Aucun|Aucune)/);
    }
  });

  it('names the entities of traitementDesFaits instead of dumping their identifiers', () => {
    const format = situationFieldMetadata['traitementDesFaits.entites'].format as (value: unknown) => string;

    expect(format(realisticValues['traitementDesFaits.entites'])).toBe(
      'ARS Île-de-France — Direction de la santé publique',
    );
    expect(format([{ entiteId: 'ent-2' }])).toBe('ent-2');
  });

  it('counts attached files rather than dumping them', () => {
    const format = situationFieldMetadata['fait.fileIds'].format as (value: unknown) => string;

    expect(format(['a'])).toBe('1 fichier');
    expect(format(['a', 'b', 'c'])).toBe('3 fichiers');
  });

  it('formats dates in fr-FR', () => {
    const format = situationFieldMetadata['fait.dateDebut'].format as (value: unknown) => string;

    expect(format('2026-01-05')).toBe('05/01/2026');
    expect(format('pas une date')).toBe('pas une date');
  });
});
