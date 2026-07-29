import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { redirect } from '@tanstack/react-router';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { type BeforeLoad, requireAuthAndRoles } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';

const requireEntityAdmin = requireAuthAndRoles([ROLES.ENTITY_ADMIN]);

export const requireAdminLocalAccess = async (ctx: BeforeLoad) => {
  requireEntityAdmin(ctx);
  const flags = await queryClient.ensureQueryData({
    queryKey: ['featureFlags', 'resolved'],
    queryFn: fetchResolvedFeatureFlags,
  });

  if (!flags[FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]) {
    throw redirect({ to: '/admin/users' });
  }
};

export const requireAdminLocalEntiteAccess = async (ctx: BeforeLoad) => {
  await requireAdminLocalAccess(ctx);
  const profile = await queryClient.ensureQueryData(profileQueryOptions());

  if (profile.affectationChain.length !== 1) {
    throw redirect({ to: '/admin/directions-services' });
  }
};
