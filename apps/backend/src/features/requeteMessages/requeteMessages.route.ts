import { openApiProtectedRoute, openApiRawResponse, openApiResponse } from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { RequeteMessageSchema, UnreadCountSchema } from './requeteMessages.schema.js';

const RequeteMessagesPageSchema = z.object({
  data: z.array(RequeteMessageSchema),
  meta: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const getRequeteMessagesRoute = openApiProtectedRoute({
  description: 'List discussion messages of a requete (cursor paginated, newest first)',
  responses: {
    ...openApiRawResponse(RequeteMessagesPageSchema),
  },
});

export const postRequeteMessageRoute = openApiProtectedRoute({
  description: 'Post a discussion message on a requete',
  responses: {
    ...openApiResponse(RequeteMessageSchema, 201, 'Message created'),
  },
});

export const markMessagesReadRoute = openApiProtectedRoute({
  description: 'Mark every discussion message of the requete as read by the current user',
  responses: {
    ...openApiResponse(UnreadCountSchema),
  },
});
