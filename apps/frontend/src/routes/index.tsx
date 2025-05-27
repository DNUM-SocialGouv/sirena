import { NotLoggedLayout } from '@/components/layout/notLogged';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <NotLoggedLayout>
      <div className="p-2">
        <h3>Welcome to Sirena!</h3>
        <Link to="/login">Login</Link>
      </div>
    </NotLoggedLayout>
  );
}
