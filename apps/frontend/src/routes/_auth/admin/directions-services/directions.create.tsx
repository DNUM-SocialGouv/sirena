import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';

const requireEntityAdmin = requireAuthAndRoles([ROLES.ENTITY_ADMIN]);

export const Route = createFileRoute('/_auth/admin/directions-services/directions/create')({
  beforeLoad: async (ctx) => {
    requireEntityAdmin(ctx);
    const flags = await queryClient.ensureQueryData({
      queryKey: ['featureFlags', 'resolved'],
      queryFn: fetchResolvedFeatureFlags,
    });

    if (!flags[FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]) {
      throw redirect({ to: '/admin/users' });
    }
  },
  component: RouteComponent,
});

export function RouteComponent() {
  useEffect(() => {
    document.title = 'Créer une direction - Directions et services - SIRENA';
  }, []);

  return (
    <section>
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/directions-services">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Directions et services
        </Link>
      </div>

      <h2>Créer une direction</h2>
    </section>
  );
}
