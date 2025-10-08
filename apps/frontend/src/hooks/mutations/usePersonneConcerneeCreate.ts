import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import type { PersonneConcerneeData } from '@/lib/personneConcernee';
import { formatPersonneConcerneeToServer } from '@/lib/personneConcernee';

export const usePersonneConcerneeCreate = () => {
  const navigate = useNavigate();

  const saveMutation = useMutation({
    mutationFn: async (data: PersonneConcerneeData) => {
      const response = await client['requetes-entite'].$post({
        json: { participant: formatPersonneConcerneeToServer(data) },
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

  const handleSave = async (data: PersonneConcerneeData, shouldCreateRequest: boolean) => {
    if (shouldCreateRequest) {
      await saveMutation.mutateAsync(data);
    } else {
      navigate({ to: '/request/create' });
    }
  };

  return { handleSave };
};
