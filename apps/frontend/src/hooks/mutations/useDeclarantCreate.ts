import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import type { DeclarantData } from '@/lib/declarant';

export const useDeclarantCreate = () => {
  const navigate = useNavigate();

  const saveMutation = useMutation({
    mutationFn: async (data: DeclarantData) => {
      const response = await client['requetes-entite'].$post({
        json: { declarant: data },
      });

      await handleRequestErrors(response);
      const result = await response.json();
      return result.data;
    },
    onSuccess: (result) => {
      if (result?.id) {
        navigate({ to: '/request/$requestId', params: { requestId: result.id } });
      }
    },
  });

  const handleSave = async (data: DeclarantData, shouldCreateRequest: boolean) => {
    if (shouldCreateRequest) {
      await saveMutation.mutateAsync(data);
    } else {
      navigate({ to: '/request/create' });
    }
  };

  return { handleSave };
};
