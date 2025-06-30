import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/_user/cases')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="home">
      <h2>Welcome to cases</h2>
      <Link to="/home">Home</Link>
    </div>
  );
}
