import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { CguAcceptance } from '@/components/cgu/CguAcceptance';
import { getPathAfterCguAcceptance, requireCguAcceptancePending } from '@/lib/cguGuard';
import { useUserStore } from '@/stores/userStore';

export const Route = createFileRoute('/_auth/acceptation-cgu')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: requireCguAcceptancePending,
  head: () => ({
    meta: [
      {
        title: 'Conditions générales d’utilisation à accepter - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const handleAccepted = useCallback(
    () => navigate({ to: getPathAfterCguAcceptance(redirect, useUserStore.getState().role), replace: true }),
    [navigate, redirect],
  );

  return <CguAcceptance onAccepted={handleAccepted} />;
}
