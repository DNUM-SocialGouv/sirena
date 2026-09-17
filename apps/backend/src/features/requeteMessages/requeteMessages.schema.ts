import {
  entiteTypes,
  REQUETE_MESSAGE_MAX_LENGTH,
  REQUETE_MESSAGE_MAX_PAGE_SIZE,
  REQUETE_MESSAGE_PAGE_SIZE,
} from '@sirena/common/constants';
import { z } from 'zod';

const MessageUploadedFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  size: z.number(),
  status: z.string(),
  scanStatus: z.string(),
  sanitizeStatus: z.string(),
  createdAt: z.coerce.date(),
});

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
  uploadedFiles: z.array(MessageUploadedFileSchema),
  isReadByCurrentUser: z.boolean(),
});

export const GetRequeteMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(REQUETE_MESSAGE_MAX_PAGE_SIZE).default(REQUETE_MESSAGE_PAGE_SIZE),
    before: z.uuid().optional(),
    after: z.uuid().optional(),
  })
  .refine((query) => !(query.before && query.after), {
    path: ['after'],
    message: 'Les paramètres before et after sont exclusifs.',
  });

const contenuSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().max(REQUETE_MESSAGE_MAX_LENGTH, { message: 'Maximum 10 000 caractères.' }));

const fileIdsSchema = z
  .array(z.string().min(1, 'id vide'))
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Les fichiers ne doivent pas être dupliqués.' });

export const PostRequeteMessageBodySchema = z
  .object({
    contenu: contenuSchema,
    fileIds: fileIdsSchema.default([]),
  })
  .refine((body) => body.contenu.length > 0 || body.fileIds.length > 0, {
    path: ['contenu'],
    message: 'Le message ne peut pas être vide.',
  });

export const UnreadCountSchema = z.object({ unreadCount: z.number().int() });
