import { describe, expect, it, vi } from 'vitest';
import { transformSirecFait } from './sirecMigration.fait.transformer.js';

vi.mock('../transco/motifsDeclaratifs.transco.js', () => ({
  transcodeMotifsDeclaratifs: vi.fn((ids: number[]) => ids.map(String)),
}));

vi.mock('../transco/dest.transco.js', () => ({
  transcodeDest: vi.fn((id: number | null) => (id === null ? null : 'Courriel')),
}));

vi.mock('../transco/courrierSignal.transco.js', () => ({
  transcodeCourrierSignal: vi.fn((id: number | null) => (id === null ? null : 'Courrier')),
}));

describe('sirecMigration.fait.transformer.ts', () => {
  const sirecData = {
    reclamation: {
      id_data: 42,
      r_recept_date: new Date('2024-01-15'),
      description: 'Ma réclamation',
      prioritaire_precisez: 'Précision prioritaire',
      dest: null as number | null,
      dest_primaire: null as string | null,
      dest_secondaire: null as string | null,
      courrier_signal: null as number | null,
      accuser_reception: null as number | null,
      date_envoi_ar: null as Date | null,
      accuser_reception_precision: null as string | null,
    },
    motifsDeclaresIdDicos: [809, 811],
    groupIds: [],
    provenances: [],
    misEnCauses: [],
  };

  it('should map prioritaire_precisez to commentaire when dest is null', () => {
    const result = transformSirecFait(sirecData);

    expect(result.commentaire).toBe('Précision prioritaire');
  });

  it('should default commentaire to empty string when both prioritaire_precisez and dest are null', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire_precisez: null, dest: null },
    });

    expect(result.commentaire).toBe('');
  });

  it('should append dest label to commentaire when dest is set', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, dest: 12 },
    });

    expect(result.commentaire).toBe('Précision prioritaire\nDestinataire(s) de la réclamation : Courriel');
  });

  it('should use only dest label when prioritaire_precisez is null', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire_precisez: null, dest: 12 },
    });

    expect(result.commentaire).toBe('Destinataire(s) de la réclamation : Courriel');
  });

  it('should delegate dest transcoding to transcodeDest', async () => {
    const { transcodeDest } = await import('../transco/dest.transco.js');

    transformSirecFait({ ...sirecData, reclamation: { ...sirecData.reclamation, dest: 12 } });

    expect(transcodeDest).toHaveBeenCalledWith(12);
  });

  it('should map description to autresPrecisions', () => {
    const result = transformSirecFait(sirecData);

    expect(result.autresPrecisions).toBe('Ma réclamation');
  });

  it('should default autresPrecisions to empty string when description is null', () => {
    const result = transformSirecFait({ ...sirecData, reclamation: { ...sirecData.reclamation, description: null } });

    expect(result.autresPrecisions).toBe('');
  });

  it('should delegate motif transcoding to transcodeMotifsDeclaratifs', async () => {
    const { transcodeMotifsDeclaratifs } = await import('../transco/motifsDeclaratifs.transco.js');

    transformSirecFait(sirecData);

    expect(transcodeMotifsDeclaratifs).toHaveBeenCalledWith([809, 811]);
  });

  it('should append dest_primaire label to commentaire when set', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, dest_primaire: 'Service X' },
    });

    expect(result.commentaire).toBe('Précision prioritaire\nDestinataire primaire : Service X');
  });

  it('should append dest_secondaire label to commentaire when set', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, dest_secondaire: 'Service Y' },
    });

    expect(result.commentaire).toBe('Précision prioritaire\nDestinataire secondaire : Service Y');
  });

  it('should append both dest_primaire and dest_secondaire when both are set', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, dest_primaire: 'Service X', dest_secondaire: 'Service Y' },
    });

    expect(result.commentaire).toBe(
      'Précision prioritaire\nDestinataire primaire : Service X\nDestinataire secondaire : Service Y',
    );
  });

  it('should not include dest_primaire or dest_secondaire when both are null', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire_precisez: null, dest_primaire: null, dest_secondaire: null },
    });

    expect(result.commentaire).toBe('');
  });

  it('should not include dest_primaire when it is an empty string', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire_precisez: null, dest_primaire: '' },
    });

    expect(result.commentaire).toBe('');
  });

  it('should append courrier_signal label to commentaire when set', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire_precisez: null, courrier_signal: 10 },
    });

    expect(result.commentaire).toBe('Courrier signalé : Courrier');
  });

  it('should not include courrier_signal line when courrier_signal is null', () => {
    const result = transformSirecFait({
      ...sirecData,
      reclamation: { ...sirecData.reclamation, prioritaire_precisez: null, courrier_signal: null },
    });

    expect(result.commentaire).toBe('');
  });

  it('should delegate courrier_signal transcoding to transcodeCourrierSignal', async () => {
    const { transcodeCourrierSignal } = await import('../transco/courrierSignal.transco.js');

    transformSirecFait({ ...sirecData, reclamation: { ...sirecData.reclamation, courrier_signal: 10 } });

    expect(transcodeCourrierSignal).toHaveBeenCalledWith(10);
  });
});
