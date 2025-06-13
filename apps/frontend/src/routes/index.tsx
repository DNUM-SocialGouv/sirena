import { NotLoggedLayout } from '@/components/layout/notLogged';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      {
        title: 'Accueil - SIRENA',
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <NotLoggedLayout>
      <div className="p-2">
        <h2>Welcome to Sirena!</h2>
        <Link to="/login">Login</Link>
      </div>
    </NotLoggedLayout>
  );
}
