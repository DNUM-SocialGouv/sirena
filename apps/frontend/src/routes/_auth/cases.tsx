import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/cases')({
  beforeLoad: ({ location, context }) => {
    if (!context.userStore.isLogged) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="home">
      <h2>Welcome to cases</h2>
    </div>
  );
}
