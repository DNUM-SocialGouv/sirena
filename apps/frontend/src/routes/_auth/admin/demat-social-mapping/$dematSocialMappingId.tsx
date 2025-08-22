import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import { ROLES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { usePatchDematSocialMapping } from '@/hooks/mutations/updateDematSocialMapping.hook';
import { useDematSocialMapping } from '@/hooks/queries/dematSocialMapping.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import './$dematSocialMappingId.css';

export const Route = createFileRoute('/_auth/admin/demat-social-mapping/$dematSocialMappingId')({
  params: {
    parse: (params) => ({
      dematSocialMappingId: z.string().parse(params.dematSocialMappingId),
    }),
  },
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Gérer les mappings dematSocial - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? 'Mise à jour...' : 'Valider les modifications'}
    </Button>
  );
}

function RouteComponent() {
  const { dematSocialMappingId } = Route.useParams();
  const toastManager = Toast.useToastManager();
  const navigate = useNavigate();
  const router = useRouter();
  const dematSocialMappingQuery = useDematSocialMapping(dematSocialMappingId);
  const patchDematSocialMapping = usePatchDematSocialMapping();

  const [label, setLabel] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [dematSocialId, setDematSocialId] = useState<string>('');

  useEffect(() => {
    if (
      dematSocialMappingQuery.error &&
      'status' in dematSocialMappingQuery.error &&
      dematSocialMappingQuery.error.status === 404
    ) {
      navigate({ to: '/admin/demat-social-mappings' });
    }
  }, [dematSocialMappingQuery.error, navigate]);

  useEffect(() => {
    if (dematSocialMappingQuery.data) {
      setLabel(dematSocialMappingQuery.data.label);
      setComment(dematSocialMappingQuery.data.comment);
      setDematSocialId(dematSocialMappingQuery.data.dematSocialId);
    }
  }, [dematSocialMappingQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dematSocialMappingQuery.data) {
      await patchDematSocialMapping.mutateAsync({
        id: dematSocialMappingQuery.data.id,
        json: { label, comment, dematSocialId },
      });
      toastManager.add({
        title: 'Mapping demat social modifié',
        description: 'Les modifications ont été enregistrées avec succès.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
      handleBack();
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: '/admin/demat-social-mappings' });
    }
  };

  return (
    <QueryStateHandler query={dematSocialMappingQuery}>
      {({ data: dematSocialMapping }) => (
        <div className="demat-social-mapping">
          <h1>Modifier un mapping dematSocial</h1>
          <div>
            <form onSubmit={handleSubmit}>
              <fieldset className="fr-fieldset">
                <legend className="fr-fieldset__legend">Informations du mapping</legend>
                <Input
                  className="fr-fieldset__content"
                  label="key"
                  disabled={true}
                  nativeInputProps={{
                    value: dematSocialMapping.key,
                  }}
                />
              </fieldset>
              <fieldset className="fr-fieldset">
                <Input
                  className="fr-fieldset__content"
                  label="Label"
                  nativeInputProps={{
                    value: label,
                    onChange: (e) => setLabel(e.target.value),
                  }}
                />
              </fieldset>
              <fieldset className="fr-fieldset">
                <Input
                  className="fr-fieldset__content"
                  label="Commentaire"
                  nativeInputProps={{
                    value: comment,
                    onChange: (e) => setComment(e.target.value),
                  }}
                />
              </fieldset>
              <fieldset className="fr-fieldset">
                <Input
                  className="fr-fieldset__content"
                  label="ID Demat Social"
                  nativeInputProps={{
                    value: dematSocialId,
                    onChange: (e) => setDematSocialId(e.target.value),
                  }}
                />
              </fieldset>
              <div className="form-actions">
                <Button priority="secondary" onClick={handleBack} type="button">
                  Annuler les modifications
                </Button>
                <SubmitButton isPending={patchDematSocialMapping.isPending} />
              </div>
            </form>
          </div>
        </div>
      )}
    </QueryStateHandler>
  );
}
