import { Link, createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/administration')({
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
    <div className="administration">
      <h2>Welcome to administration</h2>
      <p>This is the administration page.</p>
      <Link to="/home">Home</Link>
    </div>
  );
}
