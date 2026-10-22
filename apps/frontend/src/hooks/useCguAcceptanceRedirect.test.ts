import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isCguAcceptanceRequired } from '@/lib/cguGuard';
import { queryClient } from '@/lib/queryClient';
import { useUserStore } from '@/stores/userStore';
import { useCguAcceptanceRedirect } from './useCguAcceptanceRedirect';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

vi.mock('@/hooks/queries/profile.hook', () => ({ profileQueryOptions: () => ({ queryKey: ['profile'] }) }));

vi.mock('@/lib/cguGuard', () => ({
  CGU_ACCEPTANCE_PATH: '/acceptation-cgu',
  isCguAcceptanceRequired: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({ queryClient: { ensureQueryData: vi.fn() } }));

describe('useCguAcceptanceRedirect', () => {
  beforeEach(() => {
    useUserStore.setState({ isLogged: true });
    vi.mocked(queryClient.ensureQueryData).mockResolvedValue({});
  });

  it('sends a logged user who has not accepted the CGU in force to the CGU page', async () => {
    vi.mocked(isCguAcceptanceRequired).mockResolvedValue(true);

    const { result } = renderHook(() => useCguAcceptanceRedirect());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/acceptation-cgu', replace: true }));
    expect(queryClient.ensureQueryData).toHaveBeenCalledWith({ queryKey: ['profile'] });
    // The unknown page never shows before the redirect
    expect(result.current).toBe(true);
  });

  it('lets the unknown page show once the CGU in force are accepted', async () => {
    vi.mocked(isCguAcceptanceRequired).mockResolvedValue(false);

    const { result } = renderHook(() => useCguAcceptanceRedirect());

    await waitFor(() => expect(result.current).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('lets the unknown page show when the check fails', async () => {
    vi.mocked(queryClient.ensureQueryData).mockRejectedValue(new Error('HTTP 500'));

    const { result } = renderHook(() => useCguAcceptanceRedirect());

    await waitFor(() => expect(result.current).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the unknown page right away to a visitor who is not logged', () => {
    useUserStore.setState({ isLogged: false });

    const { result } = renderHook(() => useCguAcceptanceRedirect());

    expect(result.current).toBe(false);
    expect(queryClient.ensureQueryData).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
