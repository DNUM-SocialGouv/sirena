import { CGU_VERSION, FEATURE_FLAGS } from '@sirena/common/constants';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useUserStore } from '@/stores/userStore';

export const hasAcceptedCurrentCgu = (cguAcceptedVersion: string | null) => cguAcceptedVersion === CGU_VERSION;

// True when the logged user still has to accept the CGU in force before using the application
export const useIsCguAcceptancePending = () => {
  const isLogged = useUserStore((state) => state.isLogged);
  const cguAcceptedVersion = useUserStore((state) => state.cguAcceptedVersion);
  const isEnabled = useFeatureFlagStore((state) => state.flags[FEATURE_FLAGS.CGU_ACCEPTANCE] === true);

  return isLogged && isEnabled && !hasAcceptedCurrentCgu(cguAcceptedVersion);
};
