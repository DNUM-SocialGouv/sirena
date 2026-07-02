import { useNavigate, useSearch } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from '@/hooks/queries/profile.hook';
import { getActiveFilterTags, SelectedFiltersTags } from './SelectedFiltersTags';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useSearch: vi.fn(),
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: vi.fn(),
}));

const mockedUseNavigate = vi.mocked(useNavigate);
const mockedUseSearch = vi.mocked(useSearch);
const mockedUseProfile = vi.mocked(useProfile);

const DEFAULT_PROFILE = { topEntiteDepartements: [{ code: '14', label: 'Calvados' }] };

const setup = (search: Record<string, unknown>, profile: Record<string, unknown> = DEFAULT_PROFILE) => {
  const navigate = vi.fn();
  mockedUseNavigate.mockReturnValue(navigate as unknown as ReturnType<typeof useNavigate>);
  mockedUseSearch.mockReturnValue(search as unknown as ReturnType<typeof useSearch>);
  mockedUseProfile.mockReturnValue({ data: profile } as unknown as ReturnType<typeof useProfile>);
  return { navigate };
};

const getSearchUpdater = (navigate: ReturnType<typeof vi.fn>) => {
  expect(navigate).toHaveBeenCalledTimes(1);
  return navigate.mock.calls[0][0].search as (prev: Record<string, unknown>) => Record<string, unknown>;
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('getActiveFilterTags', () => {
  it('builds one collapsed tag per active filter with readable labels', () => {
    const tags = getActiveFilterTags(
      {
        search: 'foo',
        entiteId: 'svc',
        prioriteId: 'HAUTE',
        statutIds: 'NOUVEAU,EN_COURS',
        departementCodes: '14,27',
        domaineIds: 'SANITAIRE,SOCIAL',
      },
      {
        departementLabels: { '14': 'Calvados', '27': 'Eure' },
        affectation: { isChecked: true, label: 'Affectées à mon service' },
      },
    );

    expect(tags.map((t) => t.label)).toEqual([
      'Recherche : « foo »',
      'Affectées à mon service',
      'Priorité : Haute',
      'Statut : Nouveau, En cours',
      'Département : Calvados, Eure',
      'Domaine : Sanitaire, Social',
    ]);
  });

  it('returns no tags when nothing is active', () => {
    expect(getActiveFilterTags({}, { departementLabels: {}, affectation: { isChecked: false, label: '' } })).toEqual(
      [],
    );
  });
});

describe('SelectedFiltersTags', () => {
  it('renders no active-filters group when nothing is active', () => {
    setup({});
    render(<SelectedFiltersTags />);
    expect(screen.queryByRole('group', { name: 'Filtres actifs' })).not.toBeInTheDocument();
  });

  it('does not show an affectation tag when entiteId does not match the affectation target', () => {
    const profile = { topEntiteDepartements: [], topEntiteId: 'top', entiteId: 'svc', entiteIdLevel: 3 };
    setup({ entiteId: 'other' }, profile);
    render(<SelectedFiltersTags />);
    expect(screen.queryByRole('group', { name: 'Filtres actifs' })).not.toBeInTheDocument();
  });

  it('moves focus to the next tag when a middle tag is dismissed', async () => {
    let search: Record<string, unknown> = { search: 'foo', prioriteId: 'HAUTE', statutIds: 'NOUVEAU' };
    mockedUseNavigate.mockReturnValue(vi.fn() as unknown as ReturnType<typeof useNavigate>);
    mockedUseSearch.mockImplementation(() => search as unknown as ReturnType<typeof useSearch>);
    mockedUseProfile.mockReturnValue({ data: DEFAULT_PROFILE } as unknown as ReturnType<typeof useProfile>);

    const { rerender } = render(<SelectedFiltersTags />);
    // Tags: [Recherche, Priorité, Statut] — dismiss the middle one.
    await userEvent.click(screen.getByRole('button', { name: /Priorité : Haute, retirer le filtre/ }));
    // Simulate the URL update that navigate() would trigger.
    search = { search: 'foo', statutIds: 'NOUVEAU' };
    rerender(<SelectedFiltersTags />);

    expect(screen.getByRole('button', { name: /Statut : Nouveau, retirer le filtre/ })).toHaveFocus();
  });

  it('collapses a multi-value OR filter (statut) into a single tag that clears the whole filter', async () => {
    const { navigate } = setup({ statutIds: 'NOUVEAU,EN_COURS' });
    render(<SelectedFiltersTags />);

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Statut : Nouveau, En cours, retirer le filtre' }));

    expect(getSearchUpdater(navigate)({ statutIds: 'NOUVEAU,EN_COURS' })).toMatchObject({
      statutIds: undefined,
      offset: undefined,
    });
  });

  it('collapses département and domaine into single tags that clear the whole filter', async () => {
    const { navigate } = setup({ departementCodes: '14', domaineIds: 'SANITAIRE,SOCIAL' });
    render(<SelectedFiltersTags />);

    expect(screen.getByText('Domaine : Sanitaire, Social')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Domaine : Sanitaire, Social, retirer le filtre' }));

    expect(getSearchUpdater(navigate)({ domaineIds: 'SANITAIRE,SOCIAL' })).toMatchObject({
      domaineIds: undefined,
      offset: undefined,
    });
  });

  it('clears the priorité filter when its tag is dismissed', async () => {
    const { navigate } = setup({ prioriteId: 'HAUTE' });
    render(<SelectedFiltersTags />);

    await userEvent.click(screen.getByRole('button', { name: /Priorité : Haute, retirer le filtre/ }));

    expect(getSearchUpdater(navigate)({ prioriteId: 'HAUTE' })).toMatchObject({
      prioriteId: undefined,
      offset: undefined,
    });
  });

  it('shows an affectation tag and clears entiteId when it is dismissed', async () => {
    const profile = { topEntiteDepartements: [], topEntiteId: 'top', entiteId: 'svc', entiteIdLevel: 3 };
    const { navigate } = setup({ entiteId: 'svc' }, profile);
    render(<SelectedFiltersTags />);

    await userEvent.click(screen.getByRole('button', { name: 'Affectées à mon service, retirer le filtre' }));

    expect(getSearchUpdater(navigate)({ entiteId: 'svc' })).toMatchObject({ entiteId: undefined, offset: undefined });
  });

  it('moves focus to the fallback element when the last tag is removed', async () => {
    const fallback = document.createElement('button');
    document.body.appendChild(fallback);
    const fallbackFocusRef = { current: fallback };
    setup({ statutIds: 'NOUVEAU' });
    render(<SelectedFiltersTags fallbackFocusRef={fallbackFocusRef} />);

    await userEvent.click(screen.getByRole('button', { name: /Statut : Nouveau, retirer le filtre/ }));

    expect(fallback).toHaveFocus();
    document.body.removeChild(fallback);
  });

  it('clears every displayed filter via "Effacer les filtres"', async () => {
    const { navigate } = setup({ search: 'foo', statutIds: 'NOUVEAU', prioriteId: 'HAUTE' });
    render(<SelectedFiltersTags />);

    await userEvent.click(screen.getByRole('button', { name: 'Effacer les filtres' }));

    expect(getSearchUpdater(navigate)({ search: 'foo', statutIds: 'NOUVEAU', prioriteId: 'HAUTE' })).toMatchObject({
      search: undefined,
      entiteId: undefined,
      prioriteId: undefined,
      statutIds: undefined,
      departementCodes: undefined,
      domaineIds: undefined,
      offset: undefined,
    });
  });
});
