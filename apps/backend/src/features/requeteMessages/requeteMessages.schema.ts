import { entiteTypes, REQUETE_MESSAGE_MAX_PAGE_SIZE, REQUETE_MESSAGE_PAGE_SIZE } from '@sirena/common/constants';
import { z } from 'zod';

export const RequeteMessageSchema = z.object({
  id: z.uuid(),
  requeteId: z.string(),
  contenu: z.string(),
  createdAt: z.coerce.date(),
  entite: z.object({
    id: z.string(),
    nomComplet: z.string(),
    entiteTypeId: z.enum(entiteTypes),
  }),
  author: z.object({ prenom: z.string(), nom: z.string() }).nullable(),
  isReadByCurrentUser: z.boolean(),
});

export const GetRequeteMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(REQUETE_MESSAGE_MAX_PAGE_SIZE).default(REQUETE_MESSAGE_PAGE_SIZE),
  before: z.uuid().optional(),
});

export const UnreadCountSchema = z.object({ unreadCount: z.number().int() });
