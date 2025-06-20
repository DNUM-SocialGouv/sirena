import { LoggedLayout } from '@/components/layout/logged/logged';
import { Loader } from '@/components/loader';
import { useProfile } from '@/hooks//queries/useProfile';
import { useUserStore } from '@/stores/userStore';
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: profile, isLoading } = useProfile();
  const { setProfile } = useUserStore();

  useEffect(() => {
    if (profile) {
      setProfile(profile);
    }
  }, [profile, setProfile]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <LoggedLayout>
      <Outlet />
    </LoggedLayout>
  );
}
