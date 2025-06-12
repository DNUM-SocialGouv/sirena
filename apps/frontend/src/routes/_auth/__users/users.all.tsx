import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/__users/users/all')({
  beforeLoad: requireAuthAndAdmin,
  component: RouteComponent,
});

export function RouteComponent() {
  return (
    <div>
      <h3>Tous les utilisateurs</h3>
      <p>Fonctionnalité à venir : affichage de tous les utilisateurs</p>
    </div>
  );
}
