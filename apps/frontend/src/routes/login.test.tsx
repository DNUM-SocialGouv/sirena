import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireNotAuth } from '@/lib/auth-guards';
import { clearWarningBannerDismissal } from '@/lib/warningBannerDismissal';
import { Route } from './login';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

vi.mock('@/lib/auth-guards', () => ({
  requireNotAuth: vi.fn(),
}));

vi.mock('@/lib/warningBannerDismissal', () => ({
  clearWarningBannerDismissal: vi.fn(),
}));

const mockedRequireNotAuth = vi.mocked(requireNotAuth);
const mockedClear = vi.mocked(clearWarningBannerDismissal);

const beforeLoad = (Route as unknown as { options: { beforeLoad: (params: unknown) => void } }).options.beforeLoad;
const params = { location: { href: '/login', pathname: '/login', search: {} } };

afterEach(() => {
  vi.clearAllMocks();
});

describe('login route', () => {
  it('forgets a dismissed warning banner when a signed-out user reaches the page', () => {
    beforeLoad(params);

    expect(mockedClear).toHaveBeenCalledOnce();
  });

  it('keeps the dismissal when the guard redirects a signed-in user away', () => {
    mockedRequireNotAuth.mockImplementation(() => {
      throw new Error('redirect');
    });

    expect(() => beforeLoad(params)).toThrow('redirect');
    expect(mockedClear).not.toHaveBeenCalled();
  });
});
