import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/directions-services/directions/create')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN]),
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
