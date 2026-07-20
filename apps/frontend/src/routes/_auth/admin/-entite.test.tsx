import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntiteAdministrativeAdminLocal } from '@/hooks/queries/entites.hook';
import { requireAdminLocalEntite } from './directions-services/-route-guard';
import { Route, RouteComponent } from './entite';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteAdministrativeAdminLocal: vi.fn(),
}));

vi.mock('./directions-services/-route-guard', () => ({
  requireAdminLocalEntite: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Entité route', () => {
  it('uses the protected local Entité guard', () => {
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBe(requireAdminLocalEntite);
  });

  it('displays the assigned Entité information in two semantic sections', () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: {
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        email: 'notification@ars.fr',
        emailContactUsager: 'contact@ars.fr',
        telContactUsager: '01 02 03 04 05',
        adresseContactUsager: 'Espace Claude Monet, 14000 Caen',
      },
      isPending: false,
      isError: false,
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Informations de l’entité' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Informations utilisées dans SIRENA' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Informations de contact pour l’usager' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nom').nextElementSibling).toHaveTextContent('ARS Normandie');
    expect(screen.getByText('Abréviation').nextElementSibling).toHaveTextContent('ARS NOR');
    expect(screen.getByText('Adresse e-mail de notification').nextElementSibling).toHaveTextContent(
      'notification@ars.fr',
    );
    expect(screen.getByText('Adresse e-mail de contact').nextElementSibling).toHaveTextContent('contact@ars.fr');
    expect(screen.getByText('Numéro de téléphone').nextElementSibling).toHaveTextContent('01 02 03 04 05');
    expect(screen.getByText('Adresse postale').nextElementSibling).toHaveTextContent('Espace Claude Monet, 14000 Caen');
    expect(document.title).toBe('Informations de l’entité - Espace administrateur - SIRENA');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('displays Non renseigné for every absent optional value', () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: {
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        email: '',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
      },
      isPending: false,
      isError: false,
    } as never);

    render(<RouteComponent />);

    expect(screen.getAllByText('Non renseigné')).toHaveLength(4);
  });

  it('announces loading at the consultation seam', () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('progressbar')).toHaveTextContent('Chargement en cours...');
  });

  it('displays an explicit error when consultation fails', () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as never);

    render(<RouteComponent />);

    expect(screen.getByText('Erreur lors du chargement de l’entité.')).toBeInTheDocument();
  });
});
