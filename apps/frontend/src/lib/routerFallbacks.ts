import { AppError } from '@/components/layout/AppError';
import { NotFound } from '@/components/layout/NotFound';

export const routerFallbackComponents = {
  defaultErrorComponent: AppError,
  defaultNotFoundComponent: NotFound,
} as const;
