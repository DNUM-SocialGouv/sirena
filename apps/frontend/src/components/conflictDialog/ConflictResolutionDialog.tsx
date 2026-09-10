import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useIsModalOpen } from '@codegouvfr/react-dsfr/Modal/useIsModalOpen';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ConflictInfo } from '@/lib/conflictResolution';
import type { FieldMetadata } from '@/lib/fieldMetadata';

interface ConflictResolutionDialogProps<T = Record<string, unknown>> {
  conflicts: ConflictInfo<T>[];
  onResolve: (resolutions: Record<string, 'current' | 'server'>) => void;
  onCancel: () => void;
  isOpen: boolean;
  fieldMetadata?: Record<string, FieldMetadata>;
}

const formatValue = (value: unknown, format?: (value: unknown) => string): string => {
  if (value === null || value === undefined || value === '') {
    return '(vide)';
  }
  if (format) {
    return format(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  return String(value);
};

export function ConflictResolutionDialog<T = Record<string, unknown>>({
  conflicts,
  onResolve,
  onCancel,
  isOpen,
  fieldMetadata = {},
}: ConflictResolutionDialogProps<T>) {
  // The DSFR keys a modal on its DOM id: a shared constant would collide between mounted instances,
  // and `useId` contains characters its selectors reject.
  const instanceId = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const conflictModal = useMemo(
    () => createModal({ id: `conflict-resolution-modal-${instanceId}`, isOpenedByDefault: false }),
    [instanceId],
  );

  const [resolutions, setResolutions] = useState<Record<string, 'current' | 'server'>>({});
  const isConcealExpectedRef = useRef(false);
  const isOpenedRef = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const initial: Record<string, 'current' | 'server'> = {};
    conflicts.forEach((conflict) => {
      initial[String(conflict.field)] = 'current';
    });
    setResolutions(initial);
  }, [conflicts]);

  // Escape, backdrop and ✕ are handled by the DSFR vanilla JS: only the conceal event reaches React.
  useIsModalOpen(conflictModal, {
    onConceal: () => {
      if (!isOpenedRef.current) return;
      isOpenedRef.current = false;

      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (trigger?.isConnected) {
        trigger.focus();
      }

      if (isConcealExpectedRef.current) {
        isConcealExpectedRef.current = false;
        return;
      }

      onCancel();
    },
  });

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      isOpenedRef.current = true;
      conflictModal.open();
      return;
    }

    if (!isOpenedRef.current) return;

    // The parent closed the dialog itself, it does not need the conceal to bounce back as a cancel.
    isConcealExpectedRef.current = true;
    conflictModal.close();
  }, [isOpen, conflictModal]);

  const handleResolutionChange = (field: string, choice: 'current' | 'server') => {
    setResolutions((prev) => ({
      ...prev,
      [field]: choice,
    }));
  };

  const handleResolve = () => {
    isConcealExpectedRef.current = true;
    onResolve(resolutions);
  };

  // `onCancel` is left to the conceal handler, so every way out of the dialog goes through a single path.
  const handleCancel = () => {
    conflictModal.close();
  };

  return (
    <conflictModal.Component
      title="Résolution des conflits"
      titleAs="h2"
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
      {conflicts.length > 0 && (
        <>
          <p className="fr-text--lg fr-mb-3w">
            Les données ont été modifiées par un autre utilisateur. Veuillez choisir quelle version conserver pour
            chaque champ en conflit.
          </p>

          <div className="fr-accordions-group">
            {conflicts.map((conflict) => {
              const fieldKey = String(conflict.field);
              const metadata = fieldMetadata[fieldKey];
              return (
                <div key={fieldKey} className="fr-mb-3w fr-p-2w fr-background-alt--blue-france">
                  <RadioButtons
                    legend={metadata?.label || fieldKey}
                    classes={{ legend: 'fr-text--bold' }}
                    name={`conflict-${fieldKey}`}
                    options={[
                      {
                        label: 'Vos modifications',
                        hintText: formatValue(conflict.currentValue, metadata?.format),
                        nativeInputProps: {
                          value: 'current',
                          checked: resolutions[fieldKey] === 'current',
                          onChange: () => handleResolutionChange(fieldKey, 'current'),
                        },
                      },
                      {
                        label: "Modifications de l'autre utilisateur",
                        hintText: formatValue(conflict.serverValue, metadata?.format),
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
                      <p className="fr-mt-2w fr-mb-0 fr-text--sm fr-text-mention--grey">
                        <strong>Valeur originale :</strong> {formatValue(conflict.originalValue, metadata?.format)}
                      </p>
                    )}
                </div>
              );
            })}
          </div>

          <div className="fr-alert fr-alert--info fr-mt-3w">
            <p className="fr-alert__title">Information</p>
            <p>
              Les champs qui n'ont été modifiés que par vous ou que par l'autre utilisateur seront automatiquement
              fusionnés sans conflit.
            </p>
          </div>
        </>
      )}
    </conflictModal.Component>
  );
}
