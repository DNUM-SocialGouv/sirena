import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/__users/users/')({
  beforeLoad: requireAuthAndAdmin,
  loader: () => {
    throw redirect({ to: '/users/pending' });
  },
});
