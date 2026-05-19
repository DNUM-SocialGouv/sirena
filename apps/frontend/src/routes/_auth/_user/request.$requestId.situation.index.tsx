import { ROLES } from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CloseRequeteModal, type CloseRequeteModalRef } from '@/components/requestId/processing/CloseRequeteModal';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationSave } from '@/hooks/mutations/useSituationSave';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/$requestId/situation/')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]),
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: () => ({
    meta: [
      {
        title: 'Description de la situation - Nouvelle situation - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const requestQuery = useRequeteDetails(requestId);
  const closeRequeteModalRef = useRef<CloseRequeteModalRef>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <QueryStateHandler query={requestQuery}>
      {() => {
        const { handleSave } = useSituationSave({
          requestId,
          situationId: undefined,
          onRefetch: () => requestQuery.refetch(),
          onSuccess: (result) => {
            if (result.shouldCloseRequeteStatus?.willUserBeUnassignedAfterSave) {
              closeRequeteModalRef.current?.openModal();
            } else {
              navigate({ to: '/request/$requestId', params: { requestId } });
            }
          },
        });

        const handleCloseModalCancel = async () => {
          navigate({ to: '/request/$requestId', params: { requestId } });
        };

        const handleBeforeClose = async () => {
          navigate({ to: '/request/$requestId', params: { requestId } });
        };

        const handleCloseModalSuccess = () => {
          navigate({ to: '/request/$requestId', params: { requestId } });
        };

        return (
          <>
            <SituationForm
              mode="edit"
              requestId={requestId}
              situationId={undefined}
              onSave={handleSave}
              saveButtonRef={saveButtonRef}
            />
            <CloseRequeteModal
              ref={closeRequeteModalRef}
              requestId={requestId}
              triggerButtonRef={saveButtonRef}
              onBeforeClose={handleBeforeClose}
              onCancel={handleCloseModalCancel}
              onSuccess={handleCloseModalSuccess}
            />
          </>
        );
      }}
    </QueryStateHandler>
  );
}
