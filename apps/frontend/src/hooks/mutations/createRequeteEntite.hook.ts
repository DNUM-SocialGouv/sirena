import { useMutation } from '@tanstack/react-query';
import { createRequeteEntite } from '@/lib/api/createRequeteEntite';
import type { DeclarantData } from '@/lib/declarant';

interface CreateRequeteInput {
  declarant?: DeclarantData;
  receptionTypeId?: string | null;
  receptionDate?: string | null;
}

export function useCreateRequeteEntite() {
  return useMutation({
    mutationFn: (data: CreateRequeteInput) => createRequeteEntite(data),
  });
}
