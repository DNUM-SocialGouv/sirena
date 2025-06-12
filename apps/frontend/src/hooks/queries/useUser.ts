import { fetchUsers } from '@/lib/api/fetchUsers';
import { useQuery } from '@tanstack/react-query';

export const useUser = (query?: { roleId?: string; active?: 'true' | 'false' }, enabled = true) =>
  useQuery({
    queryKey: ['user', query],
    queryFn: () => fetchUsers(query || {}),
    enabled,
  });
