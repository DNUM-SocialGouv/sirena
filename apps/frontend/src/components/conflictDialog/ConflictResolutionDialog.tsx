import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { useEffect, useState } from 'react';
import type { ConflictInfo } from '@/lib/conflictResolution';
import type { FieldMetadata } from '@/lib/fieldMetadata';

interface ConflictResolutionDialogProps<T = Record<string, unknown>> {
  conflicts: ConflictInfo<T>[];
  onResolve: (resolutions: Record<string, 'current' | 'server'>) => void;
  onCancel: () => void;
  isOpen: boolean;
  fieldMetadata?: Record<string, FieldMetadata>;
}

const conflictModal = createModal({
  id: 'conflict-resolution-modal',
  isOpenedByDefault: false,
});

export function ConflictResolutionDialog<T = Record<string, unknown>>({
  conflicts,
  onResolve,
  onCancel,
  isOpen,
  fieldMetadata = {},
}: ConflictResolutionDialogProps<T>) {
  const [resolutions, setResolutions] = useState<Record<string, 'current' | 'server'>>(() => {
    const initial: Record<string, 'current' | 'server'> = {};
    conflicts.forEach((conflict) => {
      initial[String(conflict.field)] = 'current';
    });
    return initial;
  });

  useEffect(() => {
    const initial: Record<string, 'current' | 'server'> = {};
    conflicts.forEach((conflict) => {
      initial[String(conflict.field)] = 'current';
    });
    setResolutions(initial);
  }, [conflicts]);

  useEffect(() => {
    if (isOpen) {
      conflictModal.open();
    }
  }, [isOpen]);

  const handleResolutionChange = (field: string, choice: 'current' | 'server') => {
    setResolutions((prev) => ({
      ...prev,
      [field]: choice,
    }));
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') {
      return '(vide)';
    }
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }
    return String(value);
  };

  const handleCancel = () => {
    conflictModal.close();
    onCancel();
  };

  const handleResolve = () => {
    conflictModal.close();
    onResolve(resolutions);
  };

  return (
    <conflictModal.Component
      title="Résolution des conflits"
      buttons={[
        {
          children: 'Annuler',
          priority: 'secondary',
          onClick: handleCancel,
        },
        {
          children: 'Résoudre et sauvegarder',
          onClick: handleResolve,
        },
      ]}
    >
      <p className="fr-text--lg fr-mb-3w">
        Les données ont été modifiées par un autre utilisateur. Veuillez choisir quelle version conserver pour chaque
        champ en conflit.
      </p>

      <div className="fr-accordions-group">
        {conflicts.map((conflict) => {
          const fieldKey = String(conflict.field);
          return (
            <div key={fieldKey} className="fr-mb-3w fr-p-2w" style={{ backgroundColor: '#f5f5fe' }}>
              <h3 className="fr-h6 fr-mb-2w">{fieldMetadata[fieldKey]?.label || fieldKey}</h3>

              <RadioButtons
                legend=""
                name={`conflict-${fieldKey}`}
                options={[
                  {
                    label: (
                      <div>
                        <strong>Vos modifications</strong>
                        <div className="fr-text--sm fr-mt-1v">{formatValue(conflict.currentValue)}</div>
                      </div>
                    ),
                    nativeInputProps: {
                      value: 'current',
                      checked: resolutions[fieldKey] === 'current',
                      onChange: () => handleResolutionChange(fieldKey, 'current'),
                    },
                  },
                  {
                    label: (
                      <div>
                        <strong>Modifications de l'autre utilisateur</strong>
                        <div className="fr-text--sm fr-mt-1v">{formatValue(conflict.serverValue)}</div>
                      </div>
                    ),
                    nativeInputProps: {
                      value: 'server',
                      checked: resolutions[fieldKey] === 'server',
                      onChange: () => handleResolutionChange(fieldKey, 'server'),
                    },
                  },
                ]}
              />

              {conflict.originalValue !== undefined &&
                conflict.originalValue !== null &&
                conflict.originalValue !== '' && (
                  <div className="fr-mt-2w fr-text--sm" style={{ color: '#666' }}>
                    <strong>Valeur originale :</strong> {formatValue(conflict.originalValue)}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      <div className="fr-alert fr-alert--info fr-mt-3w">
        <p className="fr-alert__title">Information</p>
        <p>
          Les champs qui n'ont été modifiés que par vous ou que par l'autre utilisateur seront automatiquement fusionnés
          sans conflit.
        </p>
      </div>
    </conflictModal.Component>
  );
}
