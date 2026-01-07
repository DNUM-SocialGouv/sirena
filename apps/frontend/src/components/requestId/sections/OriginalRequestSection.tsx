import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { RECEPTION_TYPE, type ReceptionType, receptionTypeLabels } from '@sirena/common/constants';
import { useNavigate } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useCreateRequeteEntite } from '@/hooks/mutations/createRequeteEntite.hook';
import { useRequeteDateTypeSave } from '@/hooks/mutations/useRequeteDateTypeSave';
import { useCanEdit } from '@/hooks/useCanEdit';
import style from './OriginalRequestSection.module.css';

type OriginalRequestSectionProps = {
  requestId?: string;
  data?: {
    receptionDate?: string | null;
    receptionTypeId?: ReceptionType | null;
    dematSocialId?: number | null;
  };
  updatedAt?: string | null;
  onEdit?: () => void;
};

const RenderCompleted = ({
  date,
  receptionType,
  dematSocialId,
}: {
  date?: string;
  receptionType?: ReceptionType;
  dematSocialId?: number | null;
}) => {
  if (date && receptionType) {
    return (
      <div className="text-vertical-align">
        Reçue le {new Date(date).toLocaleDateString('fr-FR')} par {receptionTypeLabels[receptionType]}
        {receptionType === RECEPTION_TYPE.FORMULAIRE && (
          <div className={fr.cx('fr-text--xs')}>Dossier Demat.Social n° {dematSocialId}</div>
        )}
      </div>
    );
  }

  if (date) {
    return <div className="text-vertical-align">Reçue le {new Date(date).toLocaleDateString('fr-FR')}</div>;
  }

  if (receptionType) {
    return <div className="text-vertical-align">Reçue par {receptionTypeLabels[receptionType]}</div>;
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

export const OriginalRequestSection = ({ requestId, data, onEdit, updatedAt }: OriginalRequestSectionProps) => {
  const [dateValue, setDateValue] = useState<string>(formatDateForInput(data?.receptionDate));
  const [typeValue, setTypeValue] = useState<ReceptionType | ''>(data?.receptionTypeId ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    setDateValue(formatDateForInput(data?.receptionDate));
    setTypeValue(data?.receptionTypeId ?? '');
  }, [data?.receptionDate, data?.receptionTypeId]);

  const { canEdit } = useCanEdit({ requeteId: requestId });
  const isNotEditable = data?.receptionTypeId === RECEPTION_TYPE.FORMULAIRE;
  const createRequeteMutation = useCreateRequeteEntite();
  const { handleSave } = useRequeteDateTypeSave({
    requestId: requestId || '',
    onRefetch: onEdit || (() => {}),
    requeteUpdatedAt: updatedAt,
  });

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
    setIsSaving(true);

    try {
      if (!requestId) {
        const createdRequete = await createRequeteMutation.mutateAsync({
          receptionDate: dateValue || null,
          receptionTypeId: typeValue || null,
        });
        navigate({ to: '/request/$requestId', params: { requestId: createdRequete.id } });
        setIsEdit(false);
        onEdit?.();

        return;
      }

      await handleSave({
        receptionDate: dateValue || null,
        receptionTypeId: typeValue || null,
      });
      setIsEdit(false);
    } finally {
      setIsSaving(false);
    }
  };

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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <div className={fr.cx('fr-grid-row')}>
              <div className={fr.cx('fr-col-12', 'fr-mb-2w')}>
                <Input
                  label="Date de réception"
                  hintText="Format attendu : JJ-MM-AAAA"
                  nativeInputProps={{
                    type: 'date',
                    value: dateValue,
                    onChange: (event) => setDateValue(event.target.value),
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
              <div className={clsx(fr.cx('fr-col-12'), 'display-end')}>
                <Button disabled={isSaving} type="submit">
                  Valider
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className={style.wrapper}>
            {!dateValue && !typeValue ? (
              <RenderEmpty />
            ) : (
              <RenderCompleted
                date={dateValue || undefined}
                receptionType={typeValue || undefined}
                dematSocialId={data?.dematSocialId}
              />
            )}
            {canEdit && !isNotEditable && (
              <Button
                iconPosition="right"
                iconId="fr-icon-pencil-line"
                priority="tertiary no outline"
                onClick={() => setIsEdit(true)}
              >
                {dateValue && typeValue ? 'Éditer' : 'Compléter'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
