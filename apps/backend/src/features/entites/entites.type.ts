import type { z } from 'zod';
import type {
  CreateDirectionAdminLocalInputSchema,
  CreateDirectionOrServiceAdminInputSchema,
  CreateServiceAdminLocalInputSchema,
  EditEntiteContactInputSchema,
} from './entites.schema.js';

export type CreateDirectionOrServiceAdminInput = z.infer<typeof CreateDirectionOrServiceAdminInputSchema>;
export type CreateDirectionAdminLocalInput = z.infer<typeof CreateDirectionAdminLocalInputSchema>;
export type CreateServiceAdminLocalInput = z.infer<typeof CreateServiceAdminLocalInputSchema>;
export type EditEntiteContactInput = z.infer<typeof EditEntiteContactInputSchema>;

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
