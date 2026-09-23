import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppError } from '@/components/layout/AppError';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { requireAuth } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async (params) => {
    requireAuth(params);
    await queryClient.ensureQueryData(profileQueryOptions());
  },
  component: RouteComponent,
  errorComponent: (props) => (
    <AppError
      {...props}
      title="Votre espace n’a pas pu être chargé"
      description="Vos informations de profil n’ont pas pu être récupérées. Réessayez ; si le problème persiste, reconnectez-vous."
    />
  ),
});

function RouteComponent() {
  useResolvedFeatureFlags();
  return <Outlet />;
}
