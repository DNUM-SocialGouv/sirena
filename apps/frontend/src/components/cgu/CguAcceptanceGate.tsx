import type { ReactNode } from 'react';
import { hasAcceptedCurrentCgu } from '@/hooks/useCguAcceptance';
import { useUserStore } from '@/stores/userStore';
import { CguAcceptance } from './CguAcceptance';

type CguAcceptanceGateProps = {
  // Undefined while the feature flags load
  isEnabled: boolean | undefined;
  children: ReactNode;
};

export function CguAcceptanceGate({ isEnabled, children }: CguAcceptanceGateProps) {
  const cguAcceptedVersion = useUserStore((state) => state.cguAcceptedVersion);

  if (hasAcceptedCurrentCgu(cguAcceptedVersion)) return children;
  // Nothing from the application renders before knowing whether the CGU must be accepted
  if (isEnabled === undefined) return null;
  if (!isEnabled) return children;

  return <CguAcceptance />;
}
