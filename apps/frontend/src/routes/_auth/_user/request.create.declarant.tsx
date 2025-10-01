import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DeclarantForm } from '@/components/declarant/DeclarantForm';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';
import { requireAuth } from '@/lib/auth-guards';
import type { DeclarantData } from '@/lib/declarant';

export const Route = createFileRoute('/_auth/_user/request/create/declarant')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Déclarant - Nouvelle requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
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

  return <DeclarantForm mode="create" onSave={handleSave} />;
}
