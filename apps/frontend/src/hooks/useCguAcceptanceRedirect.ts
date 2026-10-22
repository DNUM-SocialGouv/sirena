import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { CGU_ACCEPTANCE_PATH, isCguAcceptanceRequired } from '@/lib/cguGuard';
import { queryClient } from '@/lib/queryClient';
import { useUserStore } from '@/stores/userStore';

/**
 * Unknown addresses render outside the protected routes: a logged user who has not accepted the CGU in force
 * is sent to the CGU page from there too. Returns true while that check runs.
 */
export const useCguAcceptanceRedirect = () => {
  const isLogged = useUserStore((state) => state.isLogged);
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(isLogged);

  useEffect(() => {
    if (!isLogged) {
      setIsChecking(false);
      return;
    }

    let isCancelled = false;
    const redirectIfCguPending = async () => {
      await queryClient.ensureQueryData(profileQueryOptions());
      if (await isCguAcceptanceRequired()) {
        if (!isCancelled) navigate({ to: CGU_ACCEPTANCE_PATH, replace: true });
        return;
      }
      if (!isCancelled) setIsChecking(false);
    };

    redirectIfCguPending().catch(() => {
      if (!isCancelled) setIsChecking(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [isLogged, navigate]);

  return isChecking;
};
