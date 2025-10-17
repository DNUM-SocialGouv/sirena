import { useMutation } from '@tanstack/react-query';
import { createRequeteEntite } from '@/lib/api/createRequeteEntite';
import type { DeclarantData } from '@/lib/declarant';

interface CreateRequeteInput {
  declarant?: DeclarantData;
}

export function useCreateRequeteEntite() {
  return useMutation({
    mutationFn: (data: CreateRequeteInput) => createRequeteEntite(data),
  });
}
