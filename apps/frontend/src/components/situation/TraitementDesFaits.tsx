import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEntiteDescendants } from '@/hooks/queries/entites.hook';

interface TraitementDesFaitsSectionProps {
  entites: Array<{ id: string; nomComplet: string }>;
  userEntiteId?: string | null;
  initialEntites?: Array<{ entiteId: string; directionServiceId?: string }>;
  onChange: (data: { entites: Array<{ entiteId: string; directionServiceId?: string }> }) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
}

type TraitementDesFaitsRow = {
  id: string;
  entiteId: string;
  directionServiceId?: string;
  existing: boolean;
};

interface TraitementDesFaitsRowProps {
  row: TraitementDesFaitsRow;
  entites: Array<{ id: string; nomComplet: string }>;
  onChange: (id: string, field: 'entiteId' | 'directionServiceId', value: string) => void;
  onRemove?: (id: string) => void;
  isMain: boolean;
  disabled?: boolean;
}

function TraitementDesFaitsRowComponent({
  row,
  entites,
  onChange,
  onRemove,
  isMain,
  disabled,
}: TraitementDesFaitsRowProps) {
  const isReadOnly = row.existing;
  const { data: directionsServices = [] } = useEntiteDescendants(row.entiteId);

  const entiteLabel = entites.find((e) => e.id === row.entiteId)?.nomComplet || '';
  const directionLabel =
    directionsServices.find((d: { id: string }) => d.id === row.directionServiceId)?.nomComplet || '';

  return (
    <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
      {/* Entite */}
      <div className="fr-col-12 fr-col-md-6">
        {isReadOnly ? (
          <Input
            label={isMain ? 'Entité affectée (obligatoire)' : 'Entité'}
            nativeInputProps={{
              value: entiteLabel,
              readOnly: true,
              disabled: true,
            }}
          />
        ) : (
          <Select
            label={isMain ? 'Entité affectée (obligatoire)' : 'Entité'}
            nativeSelectProps={{
              value: row.entiteId || '',
              onChange: (e) => onChange(row.id, 'entiteId', e.target.value),
              disabled,
            }}
          >
            <option value="">Sélectionner une option</option>
            {entites.map((entite) => (
              <option key={entite.id} value={entite.id}>
                {entite.nomComplet}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Direction / service */}
      {row.entiteId && (
        <div className="fr-col-12 fr-col-md-6">
          {isReadOnly ? (
            <Input
              label="Direction ou service"
              nativeInputProps={{
                value: directionLabel,
                readOnly: true,
                disabled: true,
              }}
            />
          ) : (
            <Select
              label="Direction ou service"
              nativeSelectProps={{
                value: row.directionServiceId || '',
                onChange: (e) => onChange(row.id, 'directionServiceId', e.target.value),
                disabled: disabled || !row.entiteId,
              }}
            >
              <option value="">Sélectionner une option</option>
              {directionsServices.map((direction: { id: string; nomComplet: string }) => (
                <option key={direction.id} value={direction.id}>
                  {direction.nomComplet}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      {!isReadOnly && !isMain && onRemove && (
        <div className="fr-col-12">
          <Button iconId="fr-icon-delete-line" priority="tertiary" onClick={() => onRemove(row.id)} disabled={disabled}>
            Supprimer cette entité
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Behavior:
 * - If initialEntites contains valid entities => they are displayed as read-only (existing: true)
 *   + an empty editable row is added to allow adding a new entity.
 * - Otherwise => a single main editable row is shown (pre-filled with the user's entity if available).
 */
function TraitementDesFaitsSection({
  entites,
  userEntiteId,
  initialEntites,
  onChange,
  onValidationChange,
  disabled,
}: TraitementDesFaitsSectionProps) {
  const defaultEntiteUtilisateur = useMemo(
    () => (userEntiteId ? entites.find((e) => e.id === userEntiteId) : undefined),
    [userEntiteId, entites],
  );

  const [rows, setRows] = useState<TraitementDesFaitsRow[]>([]);
  const initDoneRef = useRef(false);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const validInitial = (initialEntites || []).filter((e) => e.entiteId);

    if (validInitial.length > 0) {
      const existingRows: TraitementDesFaitsRow[] = validInitial.map((e, idx) => ({
        id: `existing-${idx}`,
        entiteId: e.entiteId,
        directionServiceId: e.directionServiceId,
        existing: true,
      }));

      setRows(existingRows);
    } else {
      setRows([
        {
          id: 'main',
          entiteId: defaultEntiteUtilisateur?.id ?? '',
          directionServiceId: undefined,
          existing: false,
        },
      ]);
    }
  }, [initialEntites, defaultEntiteUtilisateur?.id]);

  useEffect(() => {
    onChange({
      entites: rows
        .filter((r) => r.entiteId)
        .map((r) => ({
          entiteId: r.entiteId,
          directionServiceId: r.directionServiceId,
        })),
    });
  }, [rows, onChange]);

  useEffect(() => {
    if (rows.length === 0) {
      onValidationChange?.(false);
      return;
    }

    const mainRow = rows[0];
    const isValid = mainRow.existing || Boolean(mainRow.entiteId);
    onValidationChange?.(isValid);
  }, [rows, onValidationChange]);

  const handleRowChange = (id: string, field: 'entiteId' | 'directionServiceId', value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              ...(field === 'entiteId' ? { directionServiceId: undefined } : {}),
            }
          : row,
      ),
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        entiteId: '',
        directionServiceId: undefined,
        existing: false,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) =>
      prev.filter((row, index) => {
        if (index === 0) return true;
        if (row.existing) return true;
        return row.id !== id;
      }),
    );
  };

  if (rows.length === 0) {
    return null;
  }

  const mainRow = rows[0];
  const otherRows = rows.slice(1);

  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{
        border: '2px solid var(--border-action-high-blue-france)',
        borderRadius: '0.25rem',
        background: 'var(--background-alt-blue-france)',
      }}
    >
      <h2 className="fr-h6 fr-mb-3w">Traitement des faits</h2>

      {/* Main row */}
      <TraitementDesFaitsRowComponent
        row={mainRow}
        entites={entites}
        onChange={handleRowChange}
        isMain
        disabled={disabled}
      />

      <hr className="fr-mt-4w" />

      <div>
        {rows.length === 1 && (
          <p className="fr-text--md fr-mb-2w">
            Ajoutez une autre entité si le traitement de la situation concerne plusieurs entités.
          </p>
        )}

        {otherRows.map((row) => (
          <TraitementDesFaitsRowComponent
            key={row.id}
            row={row}
            entites={entites}
            onChange={handleRowChange}
            onRemove={handleRemoveRow}
            isMain={false}
            disabled={disabled}
          />
        ))}

        <Button
          iconId="fr-icon-add-line"
          iconPosition="right"
          priority="secondary"
          onClick={handleAddRow}
          disabled={disabled}
        >
          Ajouter une autre entité
        </Button>
      </div>
    </div>
  );
}

export default TraitementDesFaitsSection;
