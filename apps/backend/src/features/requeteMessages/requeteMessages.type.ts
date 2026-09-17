import type { z } from 'zod';
import type { GetRequeteMessagesQuerySchema } from './requeteMessages.schema.js';

export type GetRequeteMessagesQuery = z.infer<typeof GetRequeteMessagesQuerySchema>;
