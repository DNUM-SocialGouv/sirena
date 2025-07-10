import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { Prisma } from '@/libs/prisma';
import { DematSocialMappingSchema } from '@/libs/zod';

export const PatchUserSchema = DematSocialMappingSchema.pick({
  label: true,
  comment: true,
  dematSocialId: true,
}).partial();

export const GetDematSocialMappings = DematSocialMappingSchema.array();
export const GetDematSocialMapping = DematSocialMappingSchema;

const columns = [
  Prisma.DematSocialMappingScalarFieldEnum.createdAt,
  Prisma.DematSocialMappingScalarFieldEnum.updatedAt,
  Prisma.DematSocialMappingScalarFieldEnum.comment,
  Prisma.DematSocialMappingScalarFieldEnum.dematSocialId,
  Prisma.DematSocialMappingScalarFieldEnum.key,
  Prisma.DematSocialMappingScalarFieldEnum.label,
] as const;

export const GetDematSocialMappingsQuerySchema = paginationQueryParamsSchema(columns);
