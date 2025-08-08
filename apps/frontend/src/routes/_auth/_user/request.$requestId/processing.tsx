import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/_user/request/$requestId/processing')({
  component: () => null,
});
