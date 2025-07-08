import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/_user/cases')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="home">
      <h1>Welcome to cases</h1>
      <Link to="/home">Home</Link>
    </div>
  );
}
