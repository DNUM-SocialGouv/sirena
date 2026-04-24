import { z } from 'zod';

const FEATURE_FLAG_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;

export const FeatureFlagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  userEmails: z.array(z.string()),
  entiteIds: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateFeatureFlagSchema = z.object({
  name: z.string().min(1).max(100).regex(FEATURE_FLAG_NAME_REGEX),
  description: z.string().max(500).optional().default(''),
  enabled: z.boolean().optional().default(false),
  userEmails: z.array(z.string().email()).optional().default([]),
  entiteIds: z.array(z.string().uuid()).optional().default([]),
});

export const PatchFeatureFlagSchema = z
  .object({
    description: z.string().max(500),
    enabled: z.boolean(),
    userEmails: z.array(z.string().email()),
    entiteIds: z.array(z.string().uuid()),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field is required' });

export const ResolvedFeatureFlagsSchema = z.record(z.string(), z.boolean());
