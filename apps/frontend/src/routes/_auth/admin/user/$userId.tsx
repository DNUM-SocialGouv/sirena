import { Loader } from '@/components/loader.tsx';
import { useUserById } from '@/hooks/queries/useUserById';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import Badge from '@codegouvfr/react-dsfr/Badge';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { ROLES, roles } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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

function RouteComponent() {
  const { userId } = Route.useParams();
  const { data: user, isLoading, error } = useUserById(userId);
  const [role, setRole] = useState('');

  useEffect(() => {
    setRole(user?.data?.roleId || '');
  }, [user]);
  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <Badge noIcon severity="error">
        Erreur lors du chargement de l'utilisateur: {error.message}
      </Badge>
    );
  }

  if (!user) {
    return <div>Utilisateur non trouvé</div>;
  }

  if (!user.data) {
    return <div>Données utilisateur non disponibles</div>;
  }

  return (
    <div>
      <h1>Modifier un utilisateur</h1>
      <div>
        <form>
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Identifiant de l'utilisateur</legend>
            <Input
              className="fr-fieldset__content"
              label="Nom"
              disabled={true}
              nativeInputProps={{ value: user.data.lastName }}
            />
            <Input
              className="fr-fieldset__content"
              label="Prénom"
              disabled={true}
              nativeInputProps={{ value: user.data.firstName }}
            />
          </fieldset>
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Coordonnées de l'utilisateur</legend>
            <Input
              className="fr-fieldset__content"
              label="Email"
              disabled={true}
              nativeInputProps={{ value: user.data.email }}
            />
          </fieldset>
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Paramètres de profil de l'utilisateur</legend>
            <Select
              className="fr-fieldset__content"
              label="Rôle*"
              nativeSelectProps={{
                onChange: (event) => setRole(event.target.value),
                value: role,
              }}
            >
              <option value="" disabled hidden>
                Sélectionnez une option
              </option>
              <option value={ROLES.PENDING} disabled>
                Attente d'affectation{' '}
              </option>
              {Object.entries(roles).map(([key, value]) => {
                if (key === ROLES.PENDING) return null;
                return (
                  <option key={key} value={value}>
                    {value}
                  </option>
                );
              })}
            </Select>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
