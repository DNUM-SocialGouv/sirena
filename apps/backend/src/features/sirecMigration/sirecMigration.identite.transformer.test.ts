import { describe, expect, it } from 'vitest';
import { transformSirecIdentite } from './sirecMigration.identite.transformer.js';

describe('sirecMigration.identite.transformer.ts', () => {
  const reclamation = {
    plaignant_nom: null as string | null,
    plaignant_prenom: null as string | null,
    plaignant_mail: null as string | null,
    plaignant_tel: null as string | null,
  };

  it('should return null when all 4 fields are null', () => {
    expect(transformSirecIdentite(reclamation as never)).toBeNull();
  });

  it('should map plaignant_nom to nom', () => {
    expect(transformSirecIdentite({ ...reclamation, plaignant_nom: 'Dupont' } as never)?.nom).toBe('Dupont');
  });

  it('should map plaignant_prenom to prenom', () => {
    expect(transformSirecIdentite({ ...reclamation, plaignant_prenom: 'Jean' } as never)?.prenom).toBe('Jean');
  });

  it('should map plaignant_mail to email', () => {
    expect(transformSirecIdentite({ ...reclamation, plaignant_mail: 'jean@example.com' } as never)?.email).toBe(
      'jean@example.com',
    );
  });

  it('should map plaignant_tel to telephone', () => {
    expect(transformSirecIdentite({ ...reclamation, plaignant_tel: '0612345678' } as never)?.telephone).toBe(
      '0612345678',
    );
  });

  it('should keep null for absent fields when at least one field is set', () => {
    expect(transformSirecIdentite({ ...reclamation, plaignant_nom: 'Dupont' } as never)).toEqual({
      nom: 'Dupont',
      prenom: null,
      email: null,
      telephone: null,
    });
  });

  it('should map all 4 fields when all are set', () => {
    expect(
      transformSirecIdentite({
        ...reclamation,
        plaignant_nom: 'Dupont',
        plaignant_prenom: 'Jean',
        plaignant_mail: 'jean@example.com',
        plaignant_tel: '0612345678',
      } as never),
    ).toEqual({ nom: 'Dupont', prenom: 'Jean', email: 'jean@example.com', telephone: '0612345678' });
  });
});
