import { redirect } from '@tanstack/react-router';
import { fetchDirectionsServicesList } from '@/lib/api/fetchEntites';
import type { BeforeLoad } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { requireAdminLocalDirectionsServices } from './-route-guard';

const requireCreationCapability =
  (capability: 'canCreateDirection' | 'canCreateService') => async (ctx: BeforeLoad) => {
    await requireAdminLocalDirectionsServices(ctx);

    const { capabilities } = await queryClient.fetchQuery({
      queryKey: ['entites', 'admin', 'directions-services', {}],
      queryFn: () => fetchDirectionsServicesList(),
    });

    if (!capabilities[capability]) {
      throw redirect({ to: '/admin/directions-services' });
    }
  };

export const requireAdminLocalDirectionCreation = requireCreationCapability('canCreateDirection');
export const requireAdminLocalServiceCreation = requireCreationCapability('canCreateService');
