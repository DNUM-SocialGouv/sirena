import { LoggedLayout } from '@/components/layout/logged/logged';
import { Loader } from '@/components/loader.tsx';
import { useUserById } from '@/hooks/queries/useUserById';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import Badge from '@codegouvfr/react-dsfr/Badge';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/_auth/user/$userId')({
  beforeLoad: requireAuthAndAdmin,
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams() as { userId: string };
  const { data: user, isLoading, error } = useUserById(userId);
  const [role, setRole] = useState('');
  useEffect(() => {
    setRole(user?.data?.role);
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
        <Badge noIcon severity="error">
          Erreur lors du chargement de l'utilisateur: {error.message}
        </Badge>
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
                  onChange: (event) => setRole(event.target.value),
                  value: role,
                }}
              >
                <option value="" disabled hidden>
                  Sélectionnez une option
                </option>
                <option value="PENDING" />
                <option value="READER">Agent en lecture</option>
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
