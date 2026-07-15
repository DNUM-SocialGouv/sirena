import type { z } from 'zod';
import type { CreateChildEntiteAdminInputSchema, CreateDirectionAdminLocalInputSchema } from './entites.schema.js';

export type CreateChildEntiteAdminInput = z.infer<typeof CreateChildEntiteAdminInputSchema>;
export type CreateDirectionAdminLocalInput = z.infer<typeof CreateDirectionAdminLocalInputSchema>;

export type EntiteChain = {
  id: string;
  nomComplet: string;
  entiteMereId: string | null;
  label: string;
  entiteTypeId: string;
};

export type EntiteTraitementInput = {
  id: string;
  nomComplet: string;
  entiteMereId: string | null;
};

export type EntiteTraitement = {
  entiteId: string;
  entiteTypeId: string;
  directionServiceId?: string;
  entiteName: string;
  directionServiceName?: string;
  chain: Array<{ id: string; nomComplet: string; label: string }>;
};
