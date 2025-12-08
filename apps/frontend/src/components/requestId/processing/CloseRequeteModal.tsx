import Alert from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { requeteClotureReasonLabels } from '@sirena/common/constants';
import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useCloseRequete } from '@/hooks/mutations/closeRequete.hook';
import { useUploadFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import { type FileValidationError, validateFiles } from '@/utils/fileValidation';

export type CloseRequeteModalRef = {
  openModal: (closeButtonRef?: React.RefObject<HTMLButtonElement | null>) => void;
};

export type OtherEntityAffected = {
  entite: {
    id: string;
    nomComplet: string;
    entiteTypeId: string;
  };
};

export type CloseRequeteModalProps = {
  requestId: string;
  misEnCause?: string;
  date?: string;
  initialReasonId?: string;
  otherEntitiesAffected?: OtherEntityAffected[];
  customDescription?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export const CloseRequeteModal = forwardRef<CloseRequeteModalRef, CloseRequeteModalProps>(
  (
    {
      requestId,
      misEnCause,
      date,
      initialReasonId,
      otherEntitiesAffected = [],
      customDescription,
      onCancel,
      onSuccess,
    },
    ref,
  ) => {
    const reasonSelectId = useId();
    const reasonErrorId = useId();
    const [reasonId, setReasonId] = useState<string>(initialReasonId || '');
    const [precision, setPrecision] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    const [fileErrors, setFileErrors] = useState<Record<string, FileValidationError[]>>({});
    const [errors, setErrors] = useState<{ reasonId?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [closeButtonRef, setCloseButtonRef] = useState<React.RefObject<HTMLButtonElement | null> | null>(null);

    const closeRequeteMutation = useCloseRequete(requestId);
    const uploadFileMutation = useUploadFile({ silentToastError: true });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    const closeModal = useMemo(
      () =>
        createModal({
          id: 'close-requete-modal',
          isOpenedByDefault: false,
        }),
      [],
    );

    const openModal = (buttonRef?: React.RefObject<HTMLButtonElement | null>) => {
      setReasonId(initialReasonId || '');
      setPrecision('');
      setFiles([]);
      setFileErrors({});
      setErrors({});
      setIsSubmitting(false);
      setErrorMessage(null);
      setCloseButtonRef(buttonRef || null);
      closeModal.open();
      setTimeout(() => {
        addModalEventListener();
      }, 50);
    };

    useImperativeHandle(ref, () => ({
      openModal,
    }));

    useEffect(() => {
      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      };
    }, []);

    const addModalEventListener = () => {
      const handleModalClose = () => {
        setTimeout(() => {
          closeButtonRef?.current?.focus();
        }, 100);
      };

      const checkForModal = () => {
        const modalElement = document.querySelector(`#${closeModal.id}`);

        if (modalElement) {
          modalElement.addEventListener('dsfr.conceal', handleModalClose);

          cleanupRef.current = () => {
            modalElement.removeEventListener('dsfr.conceal', handleModalClose);
          };

          return true;
        }
        return false;
      };

      if (!checkForModal()) {
        setTimeout(() => {
          checkForModal();
        }, 100);
      }
    };

    const validateForm = (): boolean => {
      const newErrors: { reasonId?: string } = {};

      if (!reasonId) {
        newErrors.reasonId =
          'Vous devez renseigner la raison de la clôture pour clôturer la requête. Veuillez sélectionner une valeur dans la liste.';
      }

      if (precision.length > 5000) {
        setErrorMessage('Maximum 5000 caractères');
        return false;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) {
        return;
      }

      const newFileErrors = validateFiles(files);
      if (Object.keys(newFileErrors).length > 0) {
        setFileErrors(newFileErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        // Upload files first if any
        let fileIds: string[] = [];
        if (files.length > 0) {
          const uploadPromises = files.map(async (file) => {
            const response = await uploadFileMutation.mutateAsync(file);
            return response.id;
          });
          fileIds = await Promise.all(uploadPromises);
        }

        // Close the requête
        await closeRequeteMutation.mutateAsync({
          reasonId,
          precision: precision.trim() || undefined,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        });

        closeModal.close();
        onSuccess?.();
      } catch {
        setIsSubmitting(false);
        setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      }
    };

    const reasonOptions = Object.entries(requeteClotureReasonLabels).map(([id, label]) => ({
      value: id,
      label,
    }));

    const handleCancel = () => {
      closeModal.close();
      onCancel?.();
    };

    const descriptionText =
      customDescription ||
      `Vous allez clôturer la requête ${requestId} prise en charge le ${date} avec pour mise en cause "${misEnCause}".`;

    return (
      <closeModal.Component
        size="large"
        title="Clôturer la requête"
        buttons={[
          {
            doClosesModal: false,
            children: onCancel ? 'Ne pas clôturer la requête' : 'Annuler',
            onClick: handleCancel,
            disabled: isSubmitting,
          },
          {
            doClosesModal: false,
            children: isSubmitting ? 'Clôture en cours...' : 'Clôturer la requête',
            onClick: handleSubmit,
            disabled: isSubmitting,
          },
        ]}
      >
        <div className="fr-mb-4w">
          <div className="fr-text--sm fr-text--grey">
            <Alert small={false} title="" severity="warning" description={descriptionText} />
          </div>
        </div>

        {otherEntitiesAffected.length > 0 && (
          <div className="fr-mb-4w">
            <Alert
              small={false}
              title=""
              severity="info"
              description={
                <div>
                  <p className="fr-mb-2w">
                    Les autres entités administratives affectées ne seront pas impactées par la clôture :
                  </p>
                  <ul className="fr-mb-0">
                    {otherEntitiesAffected.map((entity) => (
                      <li key={entity.entite.id}>{entity.entite.nomComplet}</li>
                    ))}
                  </ul>
                </div>
              }
            />
          </div>
        )}

        <div className="fr-mb-4w">
          <div className="fr-select-group">
            <label className="fr-label" htmlFor={reasonSelectId}>
              Raison de la clôture
            </label>
            <select
              id={reasonSelectId}
              className={`fr-select ${errors.reasonId ? 'fr-select--error' : ''}`}
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value)}
              required
              aria-invalid={errors.reasonId ? 'true' : 'false'}
              aria-describedby={errors.reasonId ? reasonErrorId : undefined}
            >
              <option value="">Sélectionner une raison</option>
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.reasonId && (
              <p className="fr-message fr-message--error" id={reasonErrorId}>
                {errors.reasonId}
              </p>
            )}
          </div>
        </div>

        <div className="fr-mb-4w">
          <Input
            label="Précisions (facultatif)"
            textArea={true}
            hintText={`${precision.length}/5000 caractères`}
            nativeTextAreaProps={{
              value: precision,
              onChange: (e) => setPrecision(e.target.value),
              maxLength: 5000,
              rows: 4,
            }}
          />
        </div>

        {Object.keys(fileErrors).length > 0 && (
          <div className="fr-mb-4w">
            <h4 className="fr-text--sm fr-text--bold" style={{ color: 'var(--text-default-error)' }}>
              Erreurs de validation
            </h4>
            {Object.entries(fileErrors).map(([fileName, errors]) => (
              <div key={fileName} className="fr-mb-1w">
                <p className="fr-text--sm fr-text--bold" style={{ color: 'var(--text-default-error)' }}>
                  {fileName}
                </p>
                {errors.map((error, index) => (
                  <p
                    key={`${fileName}-error-${error.type}-${error.message}-${index}`}
                    className="fr-text--xs"
                    style={{ color: 'var(--text-default-error)' }}
                  >
                    {error.message}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="fr-mb-4w">
          <Upload
            label="Pièces jointes (facultatif)"
            hint="Taille maximale: 10 Mo. Formats supportés: PDF, EML, Word, Excel, PowerPoint, OpenOffice, MSG, CSV, TXT, images (PNG, JPEG, HEIC, WEBP, TIFF)"
            multiple
            disabled={isSubmitting}
            state={errorMessage ? 'error' : undefined}
            stateRelatedMessage={errorMessage ?? undefined}
            nativeInputProps={{
              accept:
                '.pdf,.eml,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.msg,.csv,.txt,.png,.jpeg,.jpg,.heic,.heif,.webp,.tiff',
              onChange: (e) => {
                const files = e.target.files;
                if (files) {
                  const fileArray = Array.from(files);
                  setFiles(fileArray.map((file) => new File([file], file.name, { type: file.type })));
                  setFileErrors({});
                }
              },
            }}
          />
        </div>
      </closeModal.Component>
    );
  },
);
