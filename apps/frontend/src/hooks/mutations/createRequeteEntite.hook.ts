import { useMutation } from '@tanstack/react-query';
import { type CreateRequeteInput, createRequeteEntite } from '@/lib/api/createRequeteEntite';

export function useCreateRequeteEntite() {
  return useMutation({
    mutationFn: (data: CreateRequeteInput) => createRequeteEntite(data),
  });
}
