import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import {
  DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES,
  EXPORT_REQUETES_ERROR_MESSAGES,
  type ExportRequetesErrorCode,
} from '@sirena/common/constants';
import {
  type ExportPeriodField,
  getDateTodayInParis,
  getDefaultExportPeriod,
  validateExportPeriod,
} from '@sirena/common/utils';
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useCreateRequetesExport } from '@/hooks/mutations/createRequetesExport.hook';
import { useRequetesExportStatus } from '@/hooks/queries/statistics.hook';
import { hasFocusLeftMenu, useDisclosureMenu } from '@/hooks/useDisclosureMenu';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';
import { HttpError } from '@/lib/api/tanstackQuery';
import styles from './ExportRequetesMenu.module.css';

const confirmationModal = createModal({
  id: 'requetes-export-confirmation-modal',
  isOpenedByDefault: false,
});
const CONFIRMATION_MODAL_IDS = [confirmationModal.id];

const FIELD_LEGENDS: Record<ExportPeriodField, string> = {
  startDate: "Début de l'export",
  endDate: "Fin de l'export",
};

const DATE_HINT = 'Date au format jj/mm/aaaa';
const CREATION_DATE_NOTE = 'Les dates prises en compte sont les dates de création des requêtes dans SIRENA.';
const EMAIL_INFO = "Vous recevrez un lien par e-mail pour télécharger l'export au format CSV.";
const UNEXPECTED_ERROR_MESSAGE = "Le lancement de l'export a échoué. Veuillez réessayer.";

const getInvalidDateMessage = (field: ExportPeriodField) =>
  `Le champ “${FIELD_LEGENDS[field]}” n’est pas valide. Format attendu : JJ/MM/AAAA`;

// `badInput`: a partially typed date leaves an empty `value` but text in the field.
const hasBadInput = (input: HTMLInputElement | null) => input?.validity?.badInput ?? false;

type FieldErrors = Partial<Record<ExportPeriodField, string>>;

const isExportPeriodField = (value: unknown): value is ExportPeriodField =>
  value === 'startDate' || value === 'endDate';

const isExportErrorCode = (value: unknown): value is ExportRequetesErrorCode =>
  typeof value === 'string' && value in EXPORT_REQUETES_ERROR_MESSAGES;

export function ExportRequetesMenu() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = { startDate: startInputRef, endDate: endInputRef };
  const menuId = useId();
  const infoId = useId();
  const formErrorId = useId();

  const createExport = useCreateRequetesExport();
  const { registerTrigger } = useModalFocusRestore(CONFIRMATION_MODAL_IDS);

  const resetForm = useCallback(() => {
    const defaults = getDefaultExportPeriod(getDateTodayInParis());
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const { isOpen, toggle, close, triggerRef, panelRef } = useDisclosureMenu({ onOpen: resetForm });
  const exportStatus = useRequetesExportStatus(isOpen);

  const isExportInProgress = exportStatus.data?.inProgress === true;
  const isBlocked = createExport.isPending || isExportInProgress;

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;

    const onFocusOut = (e: FocusEvent) => {
      if (hasFocusLeftMenu(e.relatedTarget as Node | null, panel, triggerRef.current)) close();
    };
    panel?.addEventListener('focusout', onFocusOut);

    requestAnimationFrame(() => startInputRef.current?.focus());

    return () => panel?.removeEventListener('focusout', onFocusOut);
  }, [isOpen, panelRef, triggerRef, close]);

  const showFieldError = (field: ExportPeriodField, message: string) => {
    setFieldErrors({ [field]: message });
    inputRefs[field].current?.focus();
  };

  const handleDateChange = (field: ExportPeriodField) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    if (field === 'startDate') setStartDate(value);
    else setEndDate(value);
    setFormError(null);
    if (!hasBadInput(e.currentTarget)) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const openConfirmation = (email: string) => {
    setRecipientEmail(email);
    if (triggerRef.current) registerTrigger(triggerRef.current);
    close({ restoreFocus: false });
    confirmationModal.open();
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`#${confirmationModal.id} .fr-btn--close`)?.focus();
    });
  };

  const handleCreateError = (error: unknown) => {
    const code = error instanceof HttpError ? error.data?.code : undefined;
    const field = error instanceof HttpError ? error.data?.field : undefined;

    if (isExportErrorCode(code) && isExportPeriodField(field)) {
      showFieldError(field, EXPORT_REQUETES_ERROR_MESSAGES[code]);
      return;
    }
    setFormError(isExportErrorCode(code) ? EXPORT_REQUETES_ERROR_MESSAGES[code] : UNEXPECTED_ERROR_MESSAGE);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    setFormError(null);

    for (const field of ['startDate', 'endDate'] as const) {
      if (hasBadInput(inputRefs[field].current)) {
        showFieldError(field, getInvalidDateMessage(field));
        return;
      }
    }

    const periodError = validateExportPeriod({ startDate, endDate }, getDateTodayInParis());
    if (periodError) {
      showFieldError(periodError.field, EXPORT_REQUETES_ERROR_MESSAGES[periodError.code]);
      return;
    }

    setFieldErrors({});
    createExport.mutate(
      { startDate, endDate },
      {
        onSuccess: ({ email }) => openConfirmation(email),
        onError: handleCreateError,
      },
    );
  };

  const describedBy = [infoId, isExportInProgress ? formErrorId : null].filter(Boolean).join(' ');
  const statusMessage = isExportInProgress ? EXPORT_REQUETES_ERROR_MESSAGES.EXPORT_IN_PROGRESS : formError;

  const renderDateSection = (field: ExportPeriodField, value: string) => (
    <fieldset className={styles.export__section}>
      <legend className={fr.cx('fr-fieldset__legend', 'fr-text--bold')}>{FIELD_LEGENDS[field]}</legend>
      <Input
        label={<span className={fr.cx('fr-hint-text', 'fr-mt-0')}>{DATE_HINT}</span>}
        state={fieldErrors[field] ? 'error' : 'default'}
        stateRelatedMessage={fieldErrors[field]}
        nativeInputProps={{
          ref: inputRefs[field],
          type: 'date',
          value,
          onChange: handleDateChange(field),
        }}
      />
    </fieldset>
  );

  return (
    <div className={styles.export__bar}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.export__trigger} fr-btn fr-btn--secondary fr-btn--icon-right ${isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={toggle}
      >
        Exporter les requêtes
      </button>

      {isOpen ? (
        <div id={menuId} ref={panelRef} className={`${styles.export__panel} fr-card fr-px-3w fr-py-2w`}>
          {/* `noValidate`: the browser would otherwise cancel the submit on an unparsable date, before the DSFR messages. */}
          <form onSubmit={submit} noValidate>
            <p className={styles.export__note}>{CREATION_DATE_NOTE}</p>
            {renderDateSection('startDate', startDate)}
            {renderDateSection('endDate', endDate)}
            <p id={infoId} className={styles.export__info}>
              <span className={fr.cx('fr-icon-info-fill', 'fr-icon--sm')} aria-hidden="true" />
              {EMAIL_INFO}
            </p>
            <div role="alert">
              {statusMessage ? (
                <p
                  id={formErrorId}
                  className={fr.cx(isExportInProgress ? 'fr-info-text' : 'fr-error-text', 'fr-mb-2w')}
                >
                  {statusMessage}
                </p>
              ) : null}
            </div>
            <div className={styles.export__actions}>
              <Button type="button" priority="secondary" onClick={() => close()}>
                Annuler
              </Button>
              <Button
                type="submit"
                className={styles.export__submit}
                nativeButtonProps={{ 'aria-describedby': describedBy, 'aria-disabled': isBlocked }}
              >
                {createExport.isPending ? 'Génération en cours…' : "Générer l'export"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <confirmationModal.Component
        title="L'export a été envoyé"
        buttons={[{ children: "J'ai compris", type: 'button', doClosesModal: true }]}
      >
        <p>
          L'export a été envoyé à l'adresse <strong>{recipientEmail}</strong>. Le lien est valable{' '}
          {DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES} minutes.
        </p>
        <p className="fr-mb-0">
          Si vous ne recevez pas l'e-mail d'ici quelques minutes, vérifiez vos courriers indésirables ou contactez
          l'assistance.
        </p>
      </confirmationModal.Component>
    </div>
  );
}
