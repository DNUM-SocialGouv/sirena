import { Loader } from '@/components/loader.tsx';
import { usePatchUser, useUserById } from '@/hooks/queries/useUser';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { useUserStore } from '@/stores/userStore';
import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import {
  ROLES,
  type Role,
  type RoleOption,
  STATUT_TYPES,
  type StatutType,
  roleRanks,
  roles,
  statutTypes,
} from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import './$userId.css';
import { z } from 'zod';

export const Route = createFileRoute('/_auth/admin/user/$userId')({
  params: {
    parse: (params) => ({
      userId: z.string().parse(params.userId),
    }),
  },
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Gérer un utilisateur - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

const getAssignableRoles = (currentRole: Role): RoleOption[] => {
  return (Object.entries(roleRanks) as [Role, number][])
    .filter(([role]) => roleRanks[role] <= roleRanks[currentRole])
    .map(([role]) => ({ key: role, value: roles[role] }));
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Mise à jour...' : 'Valider les modifications'}
    </Button>
  );
}

function RouteComponent() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const userStore = useUserStore();
  const { data: user, isLoading, error } = useUserById(userId);
  const patchUser = usePatchUser();

  const [role, setRole] = useState<Role>(ROLES.PENDING);
  const [statut, setStatut] = useState<StatutType>(STATUT_TYPES.NON_RENSEIGNE);

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
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await patchUser.mutateAsync({
      id: userId,
      json: { roleId: role, statutId: statut },
    });
  };

  const handleReset = () => {
    if (!user) return;
    setRole(user.roleId as Role);
    setStatut(user.statutId as StatutType);
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
    <div>
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
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Paramètres de profil de l'utilisateur</legend>
            <Select
              className="fr-fieldset__content"
              label="Rôle*"
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
            <Button priority="secondary" onClick={() => handleReset()} type="button">
              Annuler les modifications
            </Button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
