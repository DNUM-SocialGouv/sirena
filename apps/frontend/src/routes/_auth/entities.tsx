import { LoggedLayout } from '@/components/layout/logged/logged';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/entities')({
  beforeLoad: ({ location, context }) => {
    if (!context.userStore.isLogged) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
    if (!context.userStore.isAdmin) {
      throw redirect({
        to: '/home',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <LoggedLayout>
      <div className="home">
        <h2>Welcome to entities</h2>
      </div>
    </LoggedLayout>
  );
}
