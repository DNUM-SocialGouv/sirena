import { FEATURE_FLAGS, ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { redirect } from '@tanstack/react-router';
import { resolvedFeatureFlagsQueryOptions } from '@/hooks/queries/featureFlags.hook';
import { hasAcceptedCurrentCgu } from '@/hooks/useCguAcceptance';
import { type BeforeLoad, getFallbackByRole } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { useUserStore } from '@/stores/userStore';

export const CGU_ACCEPTANCE_PATH = '/acceptation-cgu';

export const isCguAcceptanceRequired = async () => {
  const { cguAcceptedVersion, statutId, role } = useUserStore.getState();
  if (hasAcceptedCurrentCgu(cguAcceptedVersion)) return false;
  // Inactive accounts cannot resolve the feature flags: their own guard already sends them to the inactive page
  if (statutId !== STATUT_TYPES.ACTIF && role !== ROLES.SUPER_ADMIN) return false;

  const flags = await queryClient.ensureQueryData(resolvedFeatureFlagsQueryOptions()).catch(() => null);
  return flags?.[FEATURE_FLAGS.CGU_ACCEPTANCE] === true;
};

// Until the CGU in force are accepted, every page of the application leads to the CGU acceptance page
export const requireCguAccepted = async (params: BeforeLoad) => {
  if (params.location.pathname === CGU_ACCEPTANCE_PATH) return;
  if (!(await isCguAcceptanceRequired())) return;

  throw redirect({ to: CGU_ACCEPTANCE_PATH, search: { redirect: params.location.href } });
};

export const requireCguAcceptancePending = async () => {
  if (await isCguAcceptanceRequired()) return;

  throw redirect({ to: getFallbackByRole(useUserStore.getState().role) });
};

// Only a path of the application is followed after the acceptance, never another site
export const getPathAfterCguAcceptance = (requestedPath: string | undefined, role: string | null) =>
  requestedPath?.startsWith('/') && !requestedPath.startsWith('//') && !requestedPath.startsWith(CGU_ACCEPTANCE_PATH)
    ? requestedPath
    : getFallbackByRole(role);
