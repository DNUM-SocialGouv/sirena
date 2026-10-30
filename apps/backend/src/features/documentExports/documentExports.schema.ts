import { DOCUMENT_EXPORT_ACCESS_STATUS } from '@sirena/common/constants';
import { z } from 'zod';

export const DocumentExportParamsSchema = z.object({
  id: z.uuid(),
});

export const DocumentExportAccessSchema = z.object({
  status: z.enum(DOCUMENT_EXPORT_ACCESS_STATUS),
  fileName: z.string().nullable(),
  expiresAt: z.iso.datetime().nullable(),
});
