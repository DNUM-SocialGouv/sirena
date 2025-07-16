import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { ROLES, type Role, STATUT_TYPES, type StatutType, statutTypes } from '@sirena/common/constants';
import { getAssignableRoles } from '@sirena/common/utils';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader } from '@/components/loader.tsx';
import { usePatchUser } from '@/hooks/mutations/useUpdateUser';
import { useUserById } from '@/hooks/queries/useUsers';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { useUserStore } from '@/stores/userStore';
import './$userId.css';
import { Toast } from '@sirena/ui';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { EntityHierarchySelector } from '@/components/userId/entityHierarchySelector';
import { profileQueryOptions } from '@/hooks/queries/useProfile.ts';

export const Route = createFileRoute('/_auth/admin/user/$userId')({
  params: {
    parse: (params) => ({
      userId: z.string().parse(params.userId),
    }),
  },
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Gérer un utilisateur - SIRENA',
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
  const { userId } = Route.useParams();
  const toastManager = Toast.useToastManager();
  const navigate = useNavigate();
  const router = useRouter();
  const userStore = useUserStore();
  const { data: user, isLoading, error } = useUserById(userId);
  const patchUser = usePatchUser();
  const { data: profile } = useQuery({ ...profileQueryOptions(), enabled: false });

  const [role, setRole] = useState<Role>(ROLES.PENDING);
  const [statut, setStatut] = useState<StatutType>(STATUT_TYPES.NON_RENSEIGNE);
  const [entite, setEntite] = useState('');

  // userStore.role should always be defined, but we provide a fallback to avoid TypeScript errors
  const userRole: Role = userStore.role || ROLES.PENDING;

  useEffect(() => {
    if (error && 'status' in error && error.status === 404) {
      navigate({ to: '/admin/users' });
    }
  }, [error, navigate]);

  useEffect(() => {
    if (user) {
      setRole(user.roleId as Role);
      setStatut(user.statutId as StatutType);
      setEntite(user.entiteId || '');
    }
  }, [user]);

  const handleSetEntite = useCallback((id: string) => setEntite(id), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await patchUser.mutateAsync({
      id: userId,
      json: { roleId: role, statutId: statut, entiteId: entite || null },
    });
    toastManager.add({
      title: 'Utilisateur modifié',
      description: 'Les modifications ont été enregistrées avec succès.',
      timeout: 5000,
      data: { icon: 'fr-alert--success' },
    });
    handleBack();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: '/admin/users' });
    }
  };

  const filteredRoles = useMemo(() => getAssignableRoles(userRole), [userRole]);

  if (isLoading) {
    return <Loader />;
  }

  if (!user) {
    // shouldn't happen
    return <div>Données utilisateur non disponibles</div>;
  }

  return (
    <div className="user">
      <h1>Modifier un utilisateur</h1>
      <div>
        <form onSubmit={handleSubmit}>
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Identifiant de l'utilisateur</legend>
            <Input
              className="fr-fieldset__content"
              label="Nom"
              disabled={true}
              nativeInputProps={{ defaultValue: user.lastName }}
            />
            <Input
              className="fr-fieldset__content"
              label="Prénom"
              disabled={true}
              nativeInputProps={{ defaultValue: user.firstName }}
            />
          </fieldset>
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Coordonnées de l'utilisateur</legend>
            <Input
              className="fr-fieldset__content"
              label="Email"
              disabled={true}
              nativeInputProps={{ defaultValue: user.email }}
            />
          </fieldset>
          <EntityHierarchySelector id={user.entiteId} setLevel={handleSetEntite} />
          <fieldset className="fr-fieldset">
            <Select
              className="fr-fieldset__content"
              label="Rôle*"
              disabled={profile?.id === userId}
              nativeSelectProps={{
                name: 'role',
                value: role,
                onChange: (e) => setRole(e.target.value as Role),
                required: true,
              }}
            >
              <option value="" disabled hidden>
                Sélectionnez une option
              </option>
              {filteredRoles.map(({ key, value }) => {
                return (
                  <option key={key} value={key}>
                    {value}
                  </option>
                );
              })}
            </Select>
          </fieldset>
          <fieldset className="fr-fieldset">
            <Select
              className="fr-fieldset__content"
              label="Statut*"
              nativeSelectProps={{
                name: 'statut',
                value: statut,
                onChange: (e) => setStatut(e.target.value as StatutType),
                required: true,
              }}
            >
              <option value="" disabled hidden>
                Sélectionnez une option
              </option>
              {Object.entries(statutTypes).map(([key, value]) => {
                return (
                  <option key={key} value={key}>
                    {value}
                  </option>
                );
              })}
            </Select>
          </fieldset>
          <div className="form-actions">
            <Button priority="secondary" onClick={handleBack} type="button">
              Annuler les modifications
            </Button>
            <SubmitButton isPending={patchUser.isPending} />
          </div>
        </form>
      </div>
    </div>
  );
}
