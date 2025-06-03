import { LoggedLayout } from '@/components/layout/logged/logged';
import { Loader } from '@/components/loader.tsx';
import { useUserById } from '@/hooks/queries/useUserById';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/_auth/user/$userId')({
  beforeLoad: ({ location, context }) => {
    if (!context.userStore.isLogged) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
    if (!context.userStore.isAdmin) {
      throw redirect({
        to: '/home',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();
  const { data: user, isLoading, error } = useUserById(userId);
  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(user?.data?.role);
  }, [user]);
  if (isLoading) {
    return (
      <LoggedLayout>
        <Loader />
      </LoggedLayout>
    );
  }

  if (error) {
    return (
      <LoggedLayout>
        <div>Erreur lors du chargement de l'utilisateur: {error.message}</div>
      </LoggedLayout>
    );
  }

  if (!user) {
    return (
      <LoggedLayout>
        <div>Utilisateur non trouvé</div>
      </LoggedLayout>
    );
  }

  if (!user.data) {
    return (
      <LoggedLayout>
        <div>Données utilisateur non disponibles</div>
      </LoggedLayout>
    );
  }

  return (
    <LoggedLayout>
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
                  onChange: (event) => setValue(event.target.value),
                  value,
                }}
              >
                <option value="" disabled hidden>
                  Sélectionnez une option
                </option>
                <option value="PENDING" />
                <option value="WRITER">Agent en écriture</option>
                <option value="PILOTING">Pilotage national</option>
                <option value="LOCAL_ADMIN">Admin local</option>
                <option value="GLOBAL_ADMIN">Super admin</option>
              </Select>
            </fieldset>
          </form>
        </div>
      </div>
    </LoggedLayout>
  );
}
