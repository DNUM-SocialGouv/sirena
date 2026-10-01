import type { z } from 'zod';
import type { GetRequeteMessagesQuerySchema, PostRequeteMessageBodySchema } from './requeteMessages.schema.js';

export type GetRequeteMessagesQuery = z.infer<typeof GetRequeteMessagesQuerySchema>;
export type PostRequeteMessageDto = z.infer<typeof PostRequeteMessageBodySchema>;
