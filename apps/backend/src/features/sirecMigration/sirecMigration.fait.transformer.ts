import type { SirecReclamationRow } from './sirecMigration.repository.js';

export interface SirenaFaitData {
  autresPrecisions: string;
}

export function transformSirecFait(row: SirecReclamationRow): SirenaFaitData {
  return {
    autresPrecisions: row.description ?? '',
  };
}
