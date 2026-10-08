import { ROLES, ROLES_READ, STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type UserState, useUserStore } from '@/stores/userStore';
import { type BeforeLoad, checkRoles, requireAuthAndRoles, requireNotPendingOrActif } from './auth-guards';

const { redirectSpy } = vi.hoisted(() => ({
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  redirect: redirectSpy,
}));

type ThrownRedirect = { redirect: { to: string } };

const captureRedirect = (run: () => void): ThrownRedirect | null => {
  try {
    run();
    return null;
  } catch (thrown) {
    return thrown as ThrownRedirect;
  }
};

const userState = (state: Pick<UserState, 'isLogged' | 'role' | 'statutId'>) => state as UserState;

const beforeLoadFor = (pathname: string): BeforeLoad => ({
  location: { href: pathname, pathname, search: {} },
});

const guardsByPath: Record<string, (params: BeforeLoad) => void> = {
  '/admin/users': requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  '/home': requireAuthAndRoles([...ROLES_READ]),
  '/inactive': requireNotPendingOrActif,
};

const MAX_HOPS = 6;

const followRedirects = (pathname: string, visited: readonly string[] = []): readonly string[] => {
  const chain = [...visited, pathname];
  if (chain.length > MAX_HOPS) {
    return [...chain, 'MAX_HOPS'];
  }
  const thrown = captureRedirect(() => guardsByPath[pathname](beforeLoadFor(pathname)));
  if (!thrown) {
    return chain;
  }
  return followRedirects(thrown.redirect.to, chain);
};

beforeEach(() => vi.clearAllMocks());

describe('checkRoles', () => {
  it('refuses an unknown role instead of letting it through', () => {
    const thrown = captureRedirect(() =>
      checkRoles(userState({ isLogged: true, role: null, statutId: STATUT_TYPES.ACTIF }), [ROLES.SUPER_ADMIN]),
    );

    expect(thrown).toEqual({ redirect: { to: '/inactive' } });
  });

  it('redirects a role outside the allowed list to its own fallback page', () => {
    const thrown = captureRedirect(() =>
      checkRoles(userState({ isLogged: true, role: ROLES.SUPER_ADMIN, statutId: STATUT_TYPES.ACTIF }), [
        ROLES.ENTITY_ADMIN,
      ]),
    );

    expect(thrown).toEqual({ redirect: { to: '/admin/users' } });
  });

  it('redirects a reader away from an admin-only route to the home page', () => {
    const thrown = captureRedirect(() =>
      checkRoles(userState({ isLogged: true, role: ROLES.READER, statutId: STATUT_TYPES.ACTIF }), [
        ROLES.SUPER_ADMIN,
        ROLES.ENTITY_ADMIN,
      ]),
    );

    expect(thrown).toEqual({ redirect: { to: '/home' } });
  });

  it('lets an allowed role through', () => {
    const thrown = captureRedirect(() =>
      checkRoles(userState({ isLogged: true, role: ROLES.ENTITY_ADMIN, statutId: STATUT_TYPES.ACTIF }), [
        ROLES.SUPER_ADMIN,
        ROLES.ENTITY_ADMIN,
      ]),
    );

    expect(thrown).toBeNull();
  });
});

describe('requireAuthAndRoles', () => {
  it('lets an actif user with an allowed role through', () => {
    useUserStore.setState({ isLogged: true, role: ROLES.ENTITY_ADMIN, statutId: STATUT_TYPES.ACTIF });

    expect(captureRedirect(() => guardsByPath['/admin/users'](beforeLoadFor('/admin/users')))).toBeNull();
  });

  it('redirects to /inactive on the statut check before the role check runs', () => {
    useUserStore.setState({ isLogged: true, role: ROLES.ENTITY_ADMIN, statutId: null });

    expect(captureRedirect(() => guardsByPath['/admin/users'](beforeLoadFor('/admin/users')))).toEqual({
      redirect: { to: '/inactive' },
    });
  });

  it('redirects to /login when the user is not logged in', () => {
    useUserStore.setState({ isLogged: false, role: null, statutId: null });

    expect(captureRedirect(() => guardsByPath['/admin/users'](beforeLoadFor('/admin/users')))).toEqual({
      redirect: { to: '/login', search: { redirect: '/admin/users' } },
    });
  });
});

describe('redirect chain for a null role', () => {
  it('stabilises on /inactive from /admin/users when the profile is not loaded yet', () => {
    useUserStore.setState({ isLogged: true, role: null, statutId: null });

    expect(followRedirects('/admin/users')).toEqual(['/admin/users', '/inactive']);
  });

  it('stabilises on /inactive from /admin/users for an actif user without a role', () => {
    useUserStore.setState({ isLogged: true, role: null, statutId: STATUT_TYPES.ACTIF });

    expect(followRedirects('/admin/users')).toEqual(['/admin/users', '/inactive']);
  });

  it('stabilises on /inactive from /home instead of bouncing back to /home', () => {
    useUserStore.setState({ isLogged: true, role: null, statutId: STATUT_TYPES.ACTIF });

    expect(followRedirects('/home')).toEqual(['/home', '/inactive']);
  });

  it('does not oscillate between /inactive and /home for a pending user', () => {
    useUserStore.setState({ isLogged: true, role: ROLES.PENDING, statutId: STATUT_TYPES.ACTIF });

    expect(followRedirects('/home')).toEqual(['/home', '/inactive']);
  });

  it('keeps a super admin on /admin/users rather than looping through /home', () => {
    useUserStore.setState({ isLogged: true, role: ROLES.SUPER_ADMIN, statutId: null });

    expect(followRedirects('/home')).toEqual(['/home', '/admin/users']);
  });
});
