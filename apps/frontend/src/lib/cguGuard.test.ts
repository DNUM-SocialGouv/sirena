import { CGU_VERSION, FEATURE_FLAGS, ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useUserStore } from '@/stores/userStore';
import type { BeforeLoad } from './auth-guards';
import {
  CGU_ACCEPTANCE_PATH,
  getPathAfterCguAcceptance,
  requireCguAcceptancePending,
  requireCguAccepted,
} from './cguGuard';

const { redirectSpy } = vi.hoisted(() => ({
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  redirect: redirectSpy,
}));

vi.mock('@/hooks/queries/featureFlags.hook', () => ({
  resolvedFeatureFlagsQueryOptions: () => ({ queryKey: ['featureFlags', 'resolved'] }),
}));

vi.mock('@/lib/queryClient', () => ({ queryClient: { ensureQueryData: vi.fn() } }));

const ensureQueryData = vi.mocked(queryClient.ensureQueryData);

const beforeLoadFor = (href: string): BeforeLoad => ({
  location: { href, pathname: href.split('?')[0], search: {} },
});

const captureRedirect = async (run: () => Promise<void>) => {
  try {
    await run();
    return null;
  } catch (thrown) {
    return thrown;
  }
};

const enableCguAcceptance = (enabled: boolean) =>
  ensureQueryData.mockResolvedValue({ [FEATURE_FLAGS.CGU_ACCEPTANCE]: enabled });

describe('requireCguAccepted', () => {
  beforeEach(() => {
    useUserStore.setState({ role: ROLES.READER, statutId: STATUT_TYPES.ACTIF, cguAcceptedVersion: null });
    enableCguAcceptance(true);
  });

  it('sends a user who has not accepted the CGU in force to the CGU page, keeping the requested page', async () => {
    const thrown = await captureRedirect(() => requireCguAccepted(beforeLoadFor('/request/42?tab=details')));

    expect(thrown).toEqual({
      redirect: { to: CGU_ACCEPTANCE_PATH, search: { redirect: '/request/42?tab=details' } },
    });
  });

  it('also blocks a user who accepted a previous version only', async () => {
    useUserStore.setState({ cguAcceptedVersion: 'previous-version' });

    const thrown = await captureRedirect(() => requireCguAccepted(beforeLoadFor('/home')));

    expect(thrown).toEqual({ redirect: { to: CGU_ACCEPTANCE_PATH, search: { redirect: '/home' } } });
  });

  it('lets through a user who accepted the CGU in force without loading the feature flags', async () => {
    useUserStore.setState({ cguAcceptedVersion: CGU_VERSION });

    await expect(requireCguAccepted(beforeLoadFor('/home'))).resolves.toBeUndefined();
    expect(ensureQueryData).not.toHaveBeenCalled();
  });

  it('never redirects the CGU page to itself', async () => {
    await expect(requireCguAccepted(beforeLoadFor(CGU_ACCEPTANCE_PATH))).resolves.toBeUndefined();
  });

  it('lets everyone through while the CGU acceptance is not enabled', async () => {
    enableCguAcceptance(false);

    await expect(requireCguAccepted(beforeLoadFor('/home'))).resolves.toBeUndefined();
  });

  it('lets through when the feature flags cannot be loaded', async () => {
    ensureQueryData.mockRejectedValue(new Error('HTTP 500'));

    await expect(requireCguAccepted(beforeLoadFor('/home'))).resolves.toBeUndefined();
  });

  it('leaves an inactive account to its own guard', async () => {
    useUserStore.setState({ statutId: STATUT_TYPES.INACTIF });

    await expect(requireCguAccepted(beforeLoadFor('/inactive'))).resolves.toBeUndefined();
    expect(ensureQueryData).not.toHaveBeenCalled();
  });

  it('applies to the super admin whatever their status', async () => {
    useUserStore.setState({ role: ROLES.SUPER_ADMIN, statutId: STATUT_TYPES.NON_RENSEIGNE });

    const thrown = await captureRedirect(() => requireCguAccepted(beforeLoadFor('/admin/users')));

    expect(thrown).toEqual({ redirect: { to: CGU_ACCEPTANCE_PATH, search: { redirect: '/admin/users' } } });
  });
});

describe('requireCguAcceptancePending', () => {
  beforeEach(() => {
    useUserStore.setState({ role: ROLES.READER, statutId: STATUT_TYPES.ACTIF, cguAcceptedVersion: null });
    enableCguAcceptance(true);
  });

  it('shows the CGU page while the CGU in force are not accepted', async () => {
    await expect(requireCguAcceptancePending()).resolves.toBeUndefined();
  });

  it('sends a user who already accepted the CGU in force to their home page', async () => {
    useUserStore.setState({ role: ROLES.SUPER_ADMIN, cguAcceptedVersion: CGU_VERSION });

    expect(await captureRedirect(() => requireCguAcceptancePending())).toEqual({ redirect: { to: '/admin/users' } });
  });

  it('sends the user to their home page while the CGU acceptance is not enabled', async () => {
    enableCguAcceptance(false);

    expect(await captureRedirect(() => requireCguAcceptancePending())).toEqual({ redirect: { to: '/home' } });
  });
});

describe('getPathAfterCguAcceptance', () => {
  it('returns to the page requested before the CGU page', () => {
    expect(getPathAfterCguAcceptance('/request/42?tab=details', ROLES.READER)).toBe('/request/42?tab=details');
  });

  it.each([
    ['no requested page', undefined],
    ['another site', 'https://example.com'],
    ['a protocol-relative address', '//example.com'],
    ['the CGU page itself', `${CGU_ACCEPTANCE_PATH}?redirect=/home`],
  ])('falls back to the home page of the role for %s', (_, requestedPath) => {
    expect(getPathAfterCguAcceptance(requestedPath, ROLES.READER)).toBe('/home');
    expect(getPathAfterCguAcceptance(requestedPath, ROLES.SUPER_ADMIN)).toBe('/admin/users');
  });
});
