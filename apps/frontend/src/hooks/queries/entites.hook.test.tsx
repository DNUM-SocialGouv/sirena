import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useEditEntiteAdministrativeAdminLocal, useEntiteAdministrativeAdminLocal } from './entites.hook';

const { editEntiteAdministrativeSpy, fetchEntiteAdministrativeSpy } = vi.hoisted(() => ({
  editEntiteAdministrativeSpy: vi.fn(),
  fetchEntiteAdministrativeSpy: vi.fn(),
}));

vi.mock('@/lib/api/fetchEntites', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/fetchEntites')>()),
  editEntiteAdministrativeAdminLocal: editEntiteAdministrativeSpy,
  fetchEntiteAdministrativeAdminLocal: fetchEntiteAdministrativeSpy,
}));

const oldEntite = {
  id: 'root-ars',
  nomComplet: 'ARS Normandie',
  label: 'ARS NOR',
  email: 'notification@ars.fr',
  emailContactUsager: 'contact@ars.fr',
  telContactUsager: '0102030405',
  adresseContactUsager: '1 rue de la Santé, Paris',
};

const updatedEntite = {
  ...oldEntite,
  nomComplet: 'Agence régionale de santé Normandie',
};

const updateInput = {
  nomComplet: updatedEntite.nomComplet,
  label: updatedEntite.label,
  email: updatedEntite.email,
  emailContactUsager: updatedEntite.emailContactUsager,
  telContactUsager: updatedEntite.telContactUsager,
  adresseContactUsager: updatedEntite.adresseContactUsager,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

it('refreshes assigned-Entité consultation data after a successful local update', async () => {
  fetchEntiteAdministrativeSpy.mockResolvedValueOnce(oldEntite).mockResolvedValueOnce(updatedEntite);
  editEntiteAdministrativeSpy.mockResolvedValueOnce(updatedEntite);

  const { result } = renderHook(
    () => ({
      entiteQuery: useEntiteAdministrativeAdminLocal(),
      editEntite: useEditEntiteAdministrativeAdminLocal(),
    }),
    { wrapper },
  );

  await waitFor(() => expect(result.current.entiteQuery.data).toEqual(oldEntite));

  await act(async () => {
    await result.current.editEntite.mutateAsync(updateInput);
  });

  await waitFor(() => {
    expect(result.current.entiteQuery.data).toEqual(updatedEntite);
    expect(fetchEntiteAdministrativeSpy).toHaveBeenCalledTimes(2);
  });
});
