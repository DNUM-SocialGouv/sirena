import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import {
  RECEPTION_TYPE,
  REQUETE_PROVENANCE_NEEDS_PRECISION,
  type ReceptionType,
  type RequeteProvenance,
  receptionTypeLabels,
  requeteProvenanceLabels,
} from '@sirena/common/constants';
import { useNavigate } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConflictResolutionDialog } from '@/components/conflictDialog/ConflictResolutionDialog';
import { useCreateRequeteEntite } from '@/hooks/mutations/createRequeteEntite.hook';
import {
  type RequeteDateTypeData,
  type UpdateReceptionType,
  useRequeteDateTypeSave,
} from '@/hooks/mutations/useRequeteDateTypeSave';
import { useCanEdit } from '@/hooks/useCanEdit';
import { requeteDateTypeFieldMetadata } from '@/lib/fieldMetadata';
import style from './OriginalRequestSection.module.css';

type OriginalRequestSectionProps = {
  requestId?: string;
  data?: {
    receptionDate?: string | null;
    dateDemandeDeclarant?: string | null;
    receptionTypeId?: ReceptionType | null;
    dematSocialId?: number | null;
    provenanceId?: string | null;
    provenancePrecision?: string | null;
  };
  updatedAt?: string | null;
  onEdit?: () => void;
};

const RenderExtraInfos = ({
  provenanceId,
  provenancePrecision,
  dateDemandeDeclarant,
}: {
  provenanceId?: RequeteProvenance | null;
  provenancePrecision?: string | null;
  dateDemandeDeclarant?: string | null;
}) => {
  if (!dateDemandeDeclarant && !provenanceId) return null;

  return (
    <dl className={fr.cx('fr-mb-0')}>
      {dateDemandeDeclarant ? (
        <>
          <dt>Date de la demande par le déclarant</dt>
          <dd>{new Date(dateDemandeDeclarant).toLocaleDateString('fr-FR')}</dd>
        </>
      ) : null}
      {provenanceId ? (
        <>
          <dt>Provenance</dt>
          <dd>
            {requeteProvenanceLabels[provenanceId]}
            {REQUETE_PROVENANCE_NEEDS_PRECISION.includes(provenanceId) &&
              provenancePrecision &&
              ` – ${provenancePrecision}`}
          </dd>
        </>
      ) : null}
    </dl>
  );
};

const RenderCompleted = ({
  date,
  receptionType,
  dematSocialId,
  provenanceId,
  provenancePrecision,
  dateDemandeDeclarant,
}: {
  date?: string;
  receptionType?: ReceptionType;
  dematSocialId?: number | null;
  provenanceId?: RequeteProvenance | null;
  provenancePrecision?: string | null;
  dateDemandeDeclarant?: string | null;
}) => {
  const extras = (
    <RenderExtraInfos
      provenanceId={provenanceId}
      provenancePrecision={provenancePrecision}
      dateDemandeDeclarant={dateDemandeDeclarant}
    />
  );

  if (date && receptionType) {
    return (
      <div>
        <p className="text-vertical-align">
          Reçue le {new Date(date).toLocaleDateString('fr-FR')} par {receptionTypeLabels[receptionType]}
          {receptionType === RECEPTION_TYPE.FORMULAIRE && (
            <span className={fr.cx('fr-text--xs')}> Dossier Demat.Social n° {dematSocialId}</span>
          )}
        </p>
        {extras}
      </div>
    );
  }

  if (date) {
    return (
      <div>
        <p className="text-vertical-align">Reçue le {new Date(date).toLocaleDateString('fr-FR')}</p>
        {extras}
      </div>
    );
  }

  if (receptionType) {
    return (
      <div>
        <p className="text-vertical-align">Reçue par {receptionTypeLabels[receptionType]}</p>
        {extras}
      </div>
    );
  }

  if (provenanceId || dateDemandeDeclarant) {
    return <div>{extras}</div>;
  }

  return null;
};

const RenderEmpty = () => {
  return <div>Date et mode de réception</div>;
};

const formatDateForInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const normalizeReceptionType = (value?: ReceptionType | string | null): UpdateReceptionType | null =>
  !value || value === RECEPTION_TYPE.FORMULAIRE ? null : (value as UpdateReceptionType);

/** Same normalisation as the submitted payload, so the merge compares all three versions on identical ground. */
const toComparableFields = (
  source: OriginalRequestSectionProps['data'] | undefined,
  withProvenance: boolean,
): RequeteDateTypeData => ({
  receptionDate: formatDateForInput(source?.receptionDate) || null,
  dateDemandeDeclarant: formatDateForInput(source?.dateDemandeDeclarant) || null,
  receptionTypeId: normalizeReceptionType(source?.receptionTypeId),
  ...(withProvenance && {
    provenanceId: source?.provenanceId || null,
    provenancePrecision: source?.provenancePrecision?.trim() || null,
  }),
});

const provenanceOptions = Object.entries(requeteProvenanceLabels).map(([value, label]) => ({ value, label }));

export const OriginalRequestSection = ({ requestId, data, onEdit, updatedAt }: OriginalRequestSectionProps) => {
  const [dateValue, setDateValue] = useState<string>(formatDateForInput(data?.receptionDate));
  const [dateDemandeDeclarantValue, setDateDemandeDeclarantValue] = useState<string>(
    formatDateForInput(data?.dateDemandeDeclarant),
  );
  const [typeValue, setTypeValue] = useState<ReceptionType | ''>(data?.receptionTypeId ?? '');
  const [provenanceValue, setProvenanceValue] = useState<RequeteProvenance | ''>(
    (data?.provenanceId as RequeteProvenance | null | undefined) ?? '',
  );
  const [provenancePrecisionValue, setProvenancePrecisionValue] = useState<string>(data?.provenancePrecision ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRefocusEditRef = useRef(false);
  const navigate = useNavigate();

  const showProvenance = data?.receptionTypeId !== RECEPTION_TYPE.FORMULAIRE;
  const showProvenancePrecision =
    showProvenance &&
    provenanceValue !== '' &&
    REQUETE_PROVENANCE_NEEDS_PRECISION.includes(provenanceValue as RequeteProvenance);

  useEffect(() => {
    setDateValue(formatDateForInput(data?.receptionDate));
    setDateDemandeDeclarantValue(formatDateForInput(data?.dateDemandeDeclarant));
    setTypeValue(data?.receptionTypeId ?? '');
    setProvenanceValue((data?.provenanceId as RequeteProvenance | null | undefined) ?? '');
    setProvenancePrecisionValue(data?.provenancePrecision ?? '');
  }, [
    data?.receptionDate,
    data?.dateDemandeDeclarant,
    data?.receptionTypeId,
    data?.provenanceId,
    data?.provenancePrecision,
  ]);

  const { canEdit } = useCanEdit({ requeteId: requestId });
  const isNotEditable = data?.receptionTypeId === RECEPTION_TYPE.FORMULAIRE;
  const createRequeteMutation = useCreateRequeteEntite();
  const { handleSave, handleConflictResolve, handleConflictCancel, conflicts, showConflictDialog, beginEditSession } =
    useRequeteDateTypeSave({
      requestId: requestId || '',
      onRefetch: onEdit || (() => {}),
      requeteUpdatedAt: updatedAt,
      formatFromServer: (serverData) =>
        toComparableFields(serverData as OriginalRequestSectionProps['data'], showProvenance),
      onSaved: () => {
        shouldRefocusEditRef.current = true;
        setIsEdit(false);
      },
    });

  // The form that held the focus is unmounted on success: hand it back to the button that opened it.
  useEffect(() => {
    if (isEdit || !shouldRefocusEditRef.current) return;
    shouldRefocusEditRef.current = false;
    editButtonRef.current?.focus();
  }, [isEdit]);

  const receptionOptions = useMemo(
    () =>
      Object.values(RECEPTION_TYPE).flatMap((value) => {
        if (value === RECEPTION_TYPE.FORMULAIRE) return [];
        return [
          {
            value,
            label: receptionTypeLabels[value as ReceptionType],
          },
        ];
      }),
    [],
  );

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const payload = {
      receptionDate: dateValue || null,
      dateDemandeDeclarant: dateDemandeDeclarantValue || null,
      receptionTypeId: normalizeReceptionType(typeValue),
      ...(showProvenance && {
        provenanceId: provenanceValue || null,
        provenancePrecision: provenancePrecisionValue.trim() || null,
      }),
    };

    try {
      if (!requestId) {
        const createdRequete = await createRequeteMutation.mutateAsync(payload);
        navigate({ to: '/request/$requestId', params: { requestId: createdRequete.id } });
        setIsEdit(false);
        onEdit?.();

        return;
      }

      await handleSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleEditClick = useCallback(() => {
    // Freeze the version being edited here, so a background refetch cannot move the lock onto someone else's write.
    beginEditSession(toComparableFields(data, showProvenance));
    setIsEdit(true);
  }, [beginEditSession, data, showProvenance]);

  const hasRequestData = Boolean(dateValue || typeValue || provenanceValue || dateDemandeDeclarantValue);

  return (
    <div>
      <h2 className={fr.cx('fr-text--lg', 'fr-mb-2w', 'fr-text--bold')}>
        <span className="fr-icon-file-line fr-mr-1v" role="img" aria-label="Identité"></span>
        Requête originale
      </h2>

      <div
        className={fr.cx('fr-p-4w', 'fr-mb-4w')}
        style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
      >
        {isEdit ? (
          <form onSubmit={handleFormSubmit}>
            <div className={fr.cx('fr-grid-row')}>
              <div className={fr.cx('fr-col-12', 'fr-mb-2w')}>
                <Input
                  label="Date de réception"
                  hintText="Format attendu : JJ/MM/AAAA"
                  nativeInputProps={{
                    type: 'date',
                    value: dateValue,
                    onChange: (event) => setDateValue(event.target.value),
                  }}
                />
              </div>
              <div className={fr.cx('fr-col-12', 'fr-mb-2w')}>
                <Input
                  label="Date de la demande par le déclarant"
                  hintText="Format attendu : JJ/MM/AAAA"
                  nativeInputProps={{
                    type: 'date',
                    value: dateDemandeDeclarantValue,
                    onChange: (event) => setDateDemandeDeclarantValue(event.target.value),
                  }}
                />
              </div>
              <div className={fr.cx('fr-col-12', 'fr-mb-2w')}>
                <Select
                  label="Mode de réception"
                  nativeSelectProps={{
                    value: typeValue,
                    onChange: (event) => setTypeValue((event.target.value as ReceptionType) || ''),
                  }}
                >
                  <option value="">Sélectionnez une option</option>
                  {receptionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {showProvenance && (
                <>
                  <div className={fr.cx('fr-col-12', 'fr-mb-2w')}>
                    <Select
                      label="Provenance"
                      nativeSelectProps={{
                        value: provenanceValue,
                        onChange: (event) => {
                          const next = (event.target.value as RequeteProvenance) || '';
                          setProvenanceValue(next);
                          if (next && !REQUETE_PROVENANCE_NEEDS_PRECISION.includes(next)) {
                            setProvenancePrecisionValue('');
                          }
                        },
                      }}
                    >
                      <option value="">Sélectionnez une option</option>
                      {provenanceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {showProvenancePrecision ? (
                    <div className={fr.cx('fr-col-12', 'fr-mb-2w')}>
                      <Input
                        label="Précision (optionnel)"
                        nativeInputProps={{
                          type: 'text',
                          value: provenancePrecisionValue,
                          onChange: (event) => setProvenancePrecisionValue(event.target.value),
                        }}
                      />
                    </div>
                  ) : null}
                </>
              )}
              <div className={clsx(fr.cx('fr-col-12'), 'display-end')}>
                {/* aria-disabled rather than disabled: a disabled button loses the focus and announces nothing. */}
                <Button type="submit" nativeButtonProps={{ 'aria-disabled': isSaving }}>
                  Valider
                </Button>
                <p role="status" className="fr-sr-only">
                  {isSaving ? 'Enregistrement en cours' : ''}
                </p>
              </div>
            </div>
          </form>
        ) : (
          <div className={clsx(style.wrapper, hasRequestData && style.wrapperFilled)}>
            {!hasRequestData ? (
              <RenderEmpty />
            ) : (
              <RenderCompleted
                date={dateValue || undefined}
                receptionType={typeValue || undefined}
                dematSocialId={data?.dematSocialId}
                provenanceId={provenanceValue || undefined}
                provenancePrecision={provenancePrecisionValue || undefined}
                dateDemandeDeclarant={dateDemandeDeclarantValue || undefined}
              />
            )}
            {canEdit && !isNotEditable && (
              <Button
                ref={editButtonRef}
                className={style.editButton}
                iconId="fr-icon-pencil-line"
                priority="tertiary no outline"
                title={dateValue && typeValue ? 'Modifier' : 'Compléter'}
                nativeButtonProps={{
                  'aria-label': dateValue && typeValue ? 'Modifier' : 'Compléter',
                }}
                onClick={handleEditClick}
              >
                <span className="fr-sr-only">{dateValue && typeValue ? 'Modifier' : 'Compléter'}</span>
              </Button>
            )}
          </div>
        )}
      </div>
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
        isOpen={showConflictDialog}
        fieldMetadata={requeteDateTypeFieldMetadata}
      />
    </div>
  );
};
