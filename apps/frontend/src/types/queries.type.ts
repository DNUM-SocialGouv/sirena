import type { QueryParams } from '@/types/pagination.type.ts';

export type GetUsersQuery = {
  roleId?: string;
  active?: 'true' | 'false';
} & QueryParams;
