import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { SelectWithChildren } from '@sirena/ui';
import { useEffect, useRef, useState } from 'react';
import { useEntiteDescendants } from '@/hooks/queries/entites.hook';
import styles from './TraitementDesFaits.module.css';

const alignSelectStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
};

interface TraitementDesFaitsSectionProps {
  entites: Array<{ id: string; nomComplet: string }>;
  userEntiteId?: string | null;
  topEntiteId?: string | null;
  initialEntites?: Array<{ entiteId: string; directionServiceId?: string }>;
  onChange: (data: { entites: Array<{ entiteId: string; directionServiceId?: string }> }) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  hasAttemptedSave?: boolean;
}

type TraitementDesFaitsRow = {
  id: string;
  entiteId: string;
  directionServiceIds?: string[];
  existing: boolean;
  canEdit: boolean;
};

interface TraitementDesFaitsRowProps {
  row: TraitementDesFaitsRow;
  entites: Array<{ id: string; nomComplet: string }>;
  onChange: (id: string, field: 'entiteId' | 'directionServiceIds', value: string | string[]) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
  selectedEntiteIds?: string[];
  isEntiteReadOnly?: boolean;
  onEntiteEditClick?: () => void;
}

function TraitementDesFaitsRowComponent({
  row,
  entites,
  onChange,
  onRemove,
  disabled,
  selectedEntiteIds = [],
  isEntiteReadOnly = false,
  onEntiteEditClick,
}: TraitementDesFaitsRowProps) {
  const { data: directionsServices = [] } = useEntiteDescendants(row.entiteId);

  const entiteLabel = entites.find((e) => e.id === row.entiteId)?.nomComplet || '';

  const availableEntites = entites.filter(
    (entite) => !selectedEntiteIds.includes(entite.id) || entite.id === row.entiteId,
  );

  const showModifyButton = isEntiteReadOnly && onEntiteEditClick;

  return (
    <div className={`fr-grid-row fr-grid-row--gutters fr-mb-2w ${styles.row}`}>
      {/* Entite */}
      <div className={`fr-col-12 fr-col-md-6 ${styles.entiteContainer}`}>
        <div className={styles.entiteWrapper}>
          <div className={styles.entiteField}>
            {isEntiteReadOnly ? (
              <Input
                label={'Entité administrative (obligatoire) '}
                nativeInputProps={{
                  value: entiteLabel,
                  readOnly: true,
                  'aria-readonly': true,
                }}
              />
            ) : (
              <Select
                label={'Entité administrative (obligatoire) '}
                nativeSelectProps={{
                  value: row.entiteId || '',
                  onChange: (e) => onChange(row.id, 'entiteId', e.target.value),
                  disabled,
                  required: true,
                }}
              >
                <option value="">Sélectionner une option</option>
                {availableEntites.map((entite) => (
                  <option key={entite.id} value={entite.id}>
                    {entite.nomComplet}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {showModifyButton && (
            <div className={styles.modifyButtonWrapper}>
              <Button iconId="fr-icon-edit-line" priority="secondary" onClick={onEntiteEditClick} disabled={disabled}>
                Modifier <span className="fr-sr-only">l’entité administrative</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Direction / service */}
      {row.entiteId && (
        <div className="fr-col-12 fr-col-md-6" style={alignSelectStyle}>
          {disabled ? (
            <Input
              label="Direction ou Service"
              nativeInputProps={{
                value:
                  row.directionServiceIds
                    ?.map((id) => directionsServices.find((ds) => ds.id === id)?.nomComplet)
                    .filter(Boolean)
                    .join(', ') || '',
                readOnly: true,
                'aria-readonly': true,
              }}
            />
          ) : (
            <SelectWithChildren
              value={row.directionServiceIds || []}
              onChange={(newValues) => onChange(row.id, 'directionServiceIds', newValues)}
              options={directionsServices.map((entite) => ({
                label: entite.nomComplet,
                value: entite.id,
              }))}
              label="Direction ou Service"
            />
          )}
        </div>
      )}

      {onRemove && (
        <div className="fr-col-12">
          <Button iconId="fr-icon-delete-line" priority="tertiary" onClick={() => onRemove(row.id)} disabled={disabled}>
            Supprimer cette entité
          </Button>
        </div>
      )}
    </div>
  );
}

function TraitementDesFaitsSection({
  entites,
  userEntiteId,
  topEntiteId,
  initialEntites,
  onChange,
  onValidationChange,
  disabled,
  hasAttemptedSave = false,
}: TraitementDesFaitsSectionProps) {
  const [rows, setRows] = useState<{ editableRows: TraitementDesFaitsRow[]; readOnlyRows: TraitementDesFaitsRow[] }>({
    editableRows: [],
    readOnlyRows: [],
  });
  const [isFirstRowEditable, setIsFirstRowEditable] = useState(false);
  const [globalError, setGlobalError] = useState<string | undefined>();
  const initDoneRef = useRef(false);
  const { data: topEntiteDescendants = [], isLoading: isLoadingDescendants } = useEntiteDescendants(
    topEntiteId ?? undefined,
  );

  useEffect(() => {
    if (initialEntites && initialEntites.length > 0) {
      if (initDoneRef.current) return;
      initDoneRef.current = true;

      const entitesMap = new Map<string, string[]>();
      initialEntites.forEach((e) => {
        if (!entitesMap.has(e.entiteId)) {
          entitesMap.set(e.entiteId, []);
        }

        if (e.directionServiceId) {
          const existing = entitesMap.get(e.entiteId);
          if (existing && !existing.includes(e.directionServiceId)) {
            existing.push(e.directionServiceId);
          }
        }
      });

      const initialEntitesRows = Array.from(entitesMap.entries()).map(([entiteId, directionServiceIds]) => ({
        id: `${entiteId}-${Date.now()}`,
        entiteId,
        directionServiceIds: directionServiceIds.length > 0 ? directionServiceIds : undefined,
        existing: true,
        canEdit: entiteId === topEntiteId,
      }));
      const editableRows = initialEntitesRows.filter((e) => e.canEdit);
      setRows({
        editableRows,
        readOnlyRows: initialEntitesRows.filter((e) => !e.canEdit),
      });
      setIsFirstRowEditable(editableRows.length === 0);
      return;
    }

    if (topEntiteId && !initDoneRef.current) {
      if (isLoadingDescendants && userEntiteId) {
        return;
      }

      initDoneRef.current = true;
      const isUserEntiteDirectionService =
        userEntiteId &&
        topEntiteId &&
        topEntiteDescendants.some((descendant: { id: string }) => descendant.id === userEntiteId);

      setRows({
        editableRows: [
          {
            id: 'main',
            entiteId: topEntiteId ?? '',
            directionServiceIds: isUserEntiteDirectionService ? [userEntiteId] : undefined,
            existing: false,
            canEdit: true,
          },
        ],
        readOnlyRows: [],
      });
      setIsFirstRowEditable(true);
    }
  }, [userEntiteId, topEntiteId, initialEntites, topEntiteDescendants, isLoadingDescendants]);

  useEffect(() => {
    const entitesArray: Array<{ entiteId: string; directionServiceId?: string }> = [];
    [...rows.editableRows, ...rows.readOnlyRows]
      .filter((r) => r.entiteId)
      .forEach((r) => {
        if (r.directionServiceIds && r.directionServiceIds.length > 0) {
          r.directionServiceIds.forEach((directionServiceId) => {
            entitesArray.push({
              entiteId: r.entiteId,
              directionServiceId,
            });
          });
        } else {
          entitesArray.push({
            entiteId: r.entiteId,
          });
        }
      });
    onChange({
      entites: entitesArray,
    });
  }, [rows, onChange]);

  useEffect(() => {
    const hasReadOnlyRows = rows.readOnlyRows.length > 0;
    const hasValidEditableRow = rows.editableRows.some((row) => Boolean(row.entiteId));
    const isValid = hasReadOnlyRows || hasValidEditableRow;
    onValidationChange?.(isValid);
  }, [rows, onValidationChange]);

  useEffect(() => {
    if (hasAttemptedSave) {
      const hasReadOnlyRows = rows.readOnlyRows.length > 0;
      const hasValidEditableRow = rows.editableRows.some((row) => Boolean(row.entiteId));
      const hasAtLeastOneEntite = hasReadOnlyRows || hasValidEditableRow;

      if (!hasAtLeastOneEntite) {
        setGlobalError('Au moins une entité administrative doit être renseignée.');
      } else {
        setGlobalError(undefined);
      }
    } else {
      setGlobalError(undefined);
    }
  }, [hasAttemptedSave, rows]);

  const handleAddRow = () => {
    setRows((prev) => ({
      editableRows: [
        ...prev.editableRows,
        {
          id: `new-${Date.now()}`,
          entiteId: '',
          directionServiceIds: undefined,
          existing: false,
          canEdit: true,
        },
      ],
      readOnlyRows: prev.readOnlyRows,
    }));
    if (globalError) {
      setGlobalError(undefined);
    }
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => ({
      editableRows: prev.editableRows.filter((row) => row.id !== id),
      readOnlyRows: prev.readOnlyRows.filter((row) => row.id !== id),
    }));
    if (globalError) {
      setGlobalError(undefined);
    }
  };

  const handleRowChange = (id: string, field: 'entiteId' | 'directionServiceIds', value: string | string[]) => {
    setRows((prev) => ({
      readOnlyRows: prev.readOnlyRows,
      editableRows: prev.editableRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              ...(field === 'entiteId' ? { directionServiceIds: undefined } : {}),
            }
          : row,
      ),
    }));

    if (globalError) {
      setGlobalError(undefined);
    }
  };

  return (
    <div className={`fr-p-4w fr-mb-4w ${styles.container}`}>
      <h2 className="fr-h6 fr-mb-3w">Traitement des faits</h2>
      {globalError && (
        <p className="fr-message fr-message--error fr-text--md fr-mb-3w" role="alert">
          {globalError}
        </p>
      )}

      {rows.editableRows.length > 0 && <hr className="fr-mt-4w" />}

      <div>
        {rows.editableRows.map((row, idx) => {
          const selectedEntiteIds = rows.editableRows
            .filter((r) => r.id !== row.id && r.entiteId)
            .map((r) => r.entiteId);

          const isFirstRow = idx === 0;
          const shouldShowAsReadOnly = isFirstRow && !isFirstRowEditable && row.existing;
          const totalEntitesCount = rows.editableRows.length + rows.readOnlyRows.length;
          const canRemove = totalEntitesCount > 1;

          return (
            <div key={row.id}>
              <TraitementDesFaitsRowComponent
                row={row}
                onChange={handleRowChange}
                entites={entites}
                onRemove={canRemove ? handleRemoveRow : undefined}
                selectedEntiteIds={selectedEntiteIds}
                isEntiteReadOnly={shouldShowAsReadOnly}
                onEntiteEditClick={shouldShowAsReadOnly ? () => setIsFirstRowEditable(true) : undefined}
              />
            </div>
          );
        })}
        <p className="fr-text--md fr-mb-2w">
          Ajoutez une autre entité si le traitement de la situation concerne plusieurs entités.
        </p>

        <Button
          iconId="fr-icon-add-line"
          iconPosition="right"
          priority="secondary"
          onClick={handleAddRow}
          disabled={disabled}
        >
          Ajouter une autre entité
        </Button>
        <hr className="fr-mt-4w" />
        {rows.readOnlyRows.length > 0 && (
          <p className="fr-text--md fr-mb-2w fr-text--bold">Autres entités affectées au traitement</p>
        )}
        {rows.readOnlyRows.map((row) => (
          <TraitementDesFaitsRowComponent
            key={row.id}
            row={row}
            entites={entites}
            onChange={handleRowChange}
            isEntiteReadOnly
            disabled
          />
        ))}
      </div>
    </div>
  );
}

export default TraitementDesFaitsSection;
