import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDirectionsServicesRows } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { Route, RouteComponent } from './index';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: vi.fn(),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useDirectionsServicesRows: vi.fn(),
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => 'mocked-entity-admin-guard'),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin directions and services route', () => {
  it('restricts the route to entity admins', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.ENTITY_ADMIN]);
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBe('mocked-entity-admin-guard');
  });

  it('renders an accessible page title with the admin local affectation organization', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [{ id: 'root-ars', nomComplet: 'ARS Normandie' }],
      },
    } as never);
    vi.mocked(useDirectionsServicesRows).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Directions et services (ARS Normandie)' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Directions et services (ARS Normandie)');
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
    vi.mocked(useDirectionsServicesRows).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('button', { name: 'Ajouter une direction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('shows only the disabled add service control for a Direction-level affectation', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [
          { id: 'root-ars', nomComplet: 'ARS Normandie' },
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
        ],
      },
    } as never);
    vi.mocked(useDirectionsServicesRows).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('button', { name: 'Ajouter une direction' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter un service' })).toBeDisabled();
  });

  it('shows disabled add direction and add service controls', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesRows).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('button', { name: 'Ajouter une direction' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ajouter un service' })).toBeDisabled();
  });

  it('passes trimmed search to the directions and services rows hook', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesRows).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Rechercher une organisation par nom ou libellé',
    });
    await userEvent.type(searchInput, ' pa ');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(useDirectionsServicesRows).toHaveBeenLastCalledWith({ search: 'pa' });
  });

  it('filters visible rows by Service abbreviation search', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesRows).mockReturnValue({
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

    expect(screen.getByRole('row', { name: /Service PA/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Service Enfance/ })).not.toBeInTheDocument();
  });

  it('renders disabled row edit actions with unique accessible labels', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesRows).mockReturnValue({
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
          },
          {
            id: 'service-test',
            directionNom: 'Direction Test',
            directionLabel: 'DT',
            serviceNom: 'Service Test',
            serviceLabel: 'ST',
            email: 'service-test@ars.fr',
            editId: 'service-test',
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('button', { name: 'Modifier Direction Test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Modifier Service Test' })).toBeDisabled();
  });

  it('renders direction and service rows without global admin columns', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesRows).mockReturnValue({
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
    expect(screen.getByRole('columnheader', { name: 'Abréviation direction' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nom du service' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Abréviation service' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'E-mail de notification' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Direction Autonomie' })).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'Service PA' })).toBeInTheDocument();
    expect(screen.getByText('service-pa@ars.fr')).toBeInTheDocument();
    expect(screen.queryByText('Contact usager')).not.toBeInTheDocument();
    expect(screen.queryByText('Statut')).not.toBeInTheDocument();
  });
});
