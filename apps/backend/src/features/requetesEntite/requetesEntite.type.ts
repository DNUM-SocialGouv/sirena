import type { z } from 'zod';
import type { CreateChangeLogDto } from '../changelog/changelog.type.js';
import type { GetRequetesEntiteQuerySchema } from './requetesEntite.schema.js';

export type GetRequetesEntiteQuery = Omit<z.infer<typeof GetRequetesEntiteQuerySchema>, 'limit'> & {
  limit?: number;
};

export type CreateChangeLogForRequeteEntiteDto = Omit<CreateChangeLogDto, 'entity' | 'entityId'> & {
  requeteId: string;
  entiteId: string;
};
