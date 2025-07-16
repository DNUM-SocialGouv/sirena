import { Input } from '@codegouvfr/react-dsfr/Input';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader } from '@/components/loader.tsx';
import { useDematSocialMappings } from '@/hooks/queries/useDematSocialMapping';
import { useDebounce } from '@/hooks/useDebounce';

export function DematSocialMappings() {
  const queries = useSearch({ from: '/_auth/admin/demat-social-mappings' });

  const { data: response, isLoading, error } = useDematSocialMappings(queries);
  const [search, setSearch] = useState(queries.search ?? '');
  const debouncedSearch = useDebounce(search, 300);
  const navigate = useNavigate({ from: '/admin/demat-social-mappings' });

  useEffect(() => {
    if (debouncedSearch !== queries.search) {
      navigate({
        search: (prev) => ({
          ...prev,
          search: debouncedSearch,
        }),
      });
    }
  }, [debouncedSearch, queries.search, navigate]);

  if (error) {
    return (
      <div className="error-state">
        <p>Erreur lors du chargement des mappings dematSocial</p>
      </div>
    );
  }

  type DematSocialMapping = Exclude<typeof response, undefined>['data'][number];

  const columns: Column<DematSocialMapping>[] = [
    { key: 'id', label: 'Sirena id' },
    { key: 'dematSocialId', label: 'DematSocial id' },
    { key: 'label', label: 'Label' },
    { key: 'comment', label: 'Comment' },
    { key: 'createdAt', label: 'Date de création' },
    { key: 'updatedAt', label: 'Date de modification' },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells: Cells<DematSocialMapping> = {
    createdAt: (row) => (
      <div>
        {new Date(row.createdAt).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}
      </div>
    ),
    updatedAt: (row) => (
      <div>
        {new Date(row.updatedAt).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}
      </div>
    ),
    'custom:editionLabel': (row) => (
      <Link to="/admin/demat-social-mapping/$dematSocialMappingId" params={{ dematSocialMappingId: row.id }}>
        Éditer mapping
      </Link>
    ),
  };

  return (
    <>
      <form>
        <fieldset className="fr-fieldset">
          <Input
            className="fr-fieldset__content"
            label="Recherche"
            nativeInputProps={{ value: search, onChange: (e) => setSearch(e.target.value) }}
          />
        </fieldset>
      </form>
      {isLoading ? (
        <Loader />
      ) : (
        <DataTable
          title="Mappings de dematSocial"
          rowId="id"
          data={response?.data ?? []}
          columns={columns}
          cells={cells}
        />
      )}
    </>
  );
}
