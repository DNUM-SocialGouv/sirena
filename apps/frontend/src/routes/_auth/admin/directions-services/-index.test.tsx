import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { Route, RouteComponent } from './index';

const { authGuardSpy, redirectSpy } = vi.hoisted(() => ({
  authGuardSpy: vi.fn(),
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({
    children,
    className,
    params,
    to,
  }: {
    children: React.ReactNode;
    className?: string;
    params?: { entiteId?: string };
    to: string;
  }) => (
    <a className={className} href={to.replace('$entiteId', params?.entiteId ?? '')}>
      {children}
    </a>
  ),
  redirect: redirectSpy,
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: vi.fn(),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useDirectionsServicesList: vi.fn(),
}));

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchResolvedFeatureFlags: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => authGuardSpy),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin directions and services route', () => {
  it('restricts the route to entity admins', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.ENTITY_ADMIN]);
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBeTypeOf('function');
  });

  it('redirects to admin users from beforeLoad when the feature flag is disabled', async () => {
    vi.mocked(queryClient.ensureQueryData).mockResolvedValueOnce({
      [FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]: false,
    });

    await expect(
      (Route as unknown as { beforeLoad: (ctx: unknown) => Promise<void> }).beforeLoad({ location: { href: '' } }),
    ).rejects.toEqual({ redirect: { to: '/admin/users' } });
    expect(fetchResolvedFeatureFlags).not.toHaveBeenCalled();
  });

  it('renders an accessible page title with the admin local affectation organization', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [{ id: 'root-ars', nomComplet: 'ARS Normandie' }],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Directions et services (ARS Normandie)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /direction” désigne le premier niveau de votre organisation et “service” désigne le second niveau/,
    );
    expect(document.title).toBe('Directions et services (ARS Normandie) - Espace administrateur - SIRENA');
  });

  it('hides creation controls for a Service-level affectation', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [
          { id: 'root-ars', nomComplet: 'ARS Normandie' },
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
          { id: 'service-pa', nomComplet: 'Service PA' },
        ],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('button', { name: 'Ajouter une direction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('hides add service when backend capabilities disallow it for a Direction-level affectation', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [
          { id: 'root-ars', nomComplet: 'ARS Normandie' },
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
        ],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: false,
          canCreateService: false,
        },
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('button', { name: 'Ajouter une direction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('links to Direction creation when backend capabilities allow Direction creation', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: false,
        },
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('link', { name: 'Ajouter une direction' })).toHaveAttribute(
      'href',
      '/admin/directions-services/directions/create',
    );
    expect(screen.queryByRole('button', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('links to Service creation when a Direction-level affectation can create Services', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [
          { id: 'root-ars', nomComplet: 'ARS Normandie' },
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
        ],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: false,
          canCreateService: true,
        },
        availableDirections: [],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('link', { name: 'Ajouter un service' })).toHaveAttribute(
      'href',
      '/admin/directions-services/services/create',
    );
  });

  it('passes trimmed search to the directions and services list hook', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Rechercher une organisation par nom ou libellé',
    });
    await userEvent.type(searchInput, ' pa ');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(useDirectionsServicesList).toHaveBeenLastCalledWith({ search: 'pa' });
  });

  it('renders rows after submitting a search', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
          },
          {
            id: 'service-enfance',
            directionNom: 'Direction Enfance',
            directionLabel: 'DE',
            serviceNom: 'Service Enfance',
            serviceLabel: 'SE',
            email: 'service-enfance@ars.fr',
            editId: 'service-enfance',
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Rechercher une organisation par nom ou libellé',
    });
    await userEvent.type(searchInput, ' pa ');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(useDirectionsServicesList).toHaveBeenLastCalledWith({ search: 'pa' });
    expect(screen.getByRole('row', { name: /Service PA/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Service Enfance/ })).toBeInTheDocument();
  });

  it('renders local pagination when more than 10 rows are visible', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: Array.from({ length: 11 }, (_, index) => ({
          id: `service-${index + 1}`,
          directionNom: 'Direction Test',
          directionLabel: 'DT',
          serviceNom: `Service ${index + 1}`,
          serviceLabel: `S${index + 1}`,
          email: `service-${index + 1}@ars.fr`,
          editId: `service-${index + 1}`,
        })),
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Service 10/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Service 11/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2' }));

    expect(screen.getByRole('row', { name: /Service 11/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Service 10/ })).not.toBeInTheDocument();
  });

  it('links an editable row to its local edit route', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
            canEdit: true,
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(
      screen.getByRole('link', {
        name: 'Modifier le service Service PA de la direction Direction Autonomie',
      }),
    ).toHaveAttribute('href', '/admin/directions-services/service-pa/edit');
  });

  it('hides row edit action when backend row capability disallows edit', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'dir-test',
            directionNom: 'Direction Test',
            directionLabel: 'DT',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-test@ars.fr',
            editId: 'dir-test',
            canEdit: false,
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('button', { name: 'Modifier la direction Direction Test' })).not.toBeInTheDocument();
  });

  it('renders direction and service rows without global admin columns', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'dir-autonomie',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-autonomie@ars.fr',
            editId: 'dir-autonomie',
          },
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('columnheader', { name: 'Nom de la direction' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Abréviation de la direction' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nom du service' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Abréviation du service' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'E-mail de notification' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Direction Autonomie' })).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'Service PA' })).toBeInTheDocument();
    expect(screen.getByText('service-pa@ars.fr')).toBeInTheDocument();
    expect(screen.queryByText('Contact usager')).not.toBeInTheDocument();
    expect(screen.queryByText('Statut')).not.toBeInTheDocument();
  });
});
