import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useReopenRequete } from '@/hooks/mutations/reopenRequete.hook';

export type ReopenRequeteModalRef = {
  openModal: () => void;
};

export type ReopenRequeteModalProps = {
  requestId: string;
  triggerButtonRef?: React.RefObject<HTMLButtonElement | null>;
};

export const ReopenRequeteModal = forwardRef<ReopenRequeteModalRef, ReopenRequeteModalProps>(
  ({ requestId, triggerButtonRef }, ref) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const wasActionTakenRef = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);
    const reopenMutation = useReopenRequete(requestId);

    const reopenModal = useMemo(
      () =>
        createModal({
          id: 'reopen-requete-modal',
          isOpenedByDefault: false,
        }),
      [],
    );

    const focusTriggerButton = () =>
      setTimeout(() => {
        triggerButtonRef?.current?.focus();
      }, 0);

    const openModal = () => {
      setIsSubmitting(false);
      setErrorMessage(null);
      wasActionTakenRef.current = false;
      reopenModal.open();
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
        focusTriggerButton();
      };

      const checkForModal = () => {
        const modalElement = document.querySelector(`#${reopenModal.id}`);

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

    const handleSubmit = async () => {
      setIsSubmitting(true);
      wasActionTakenRef.current = true;

      try {
        await reopenMutation.mutateAsync();
        reopenModal.close();
        focusTriggerButton();
      } catch {
        setIsSubmitting(false);
        wasActionTakenRef.current = false;
        setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      }
    };

    const handleCancel = () => {
      wasActionTakenRef.current = true;
      reopenModal.close();
      focusTriggerButton();
    };

    return (
      <reopenModal.Component
        title="Rouvrir la requête"
        buttons={[
          {
            doClosesModal: false,
            children: 'Annuler',
            onClick: handleCancel,
            disabled: isSubmitting,
          },
          {
            doClosesModal: false,
            children: isSubmitting ? 'Réouverture en cours...' : 'Rouvrir la requête',
            onClick: handleSubmit,
            disabled: isSubmitting,
          },
        ]}
      >
        <p>
          Êtes-vous sûr de vouloir rouvrir cette requête ? La requête repassera au statut « En cours » et sera de
          nouveau modifiable.
        </p>
        {errorMessage && (
          <p className="fr-text--sm" style={{ color: 'var(--text-default-error)' }}>
            {errorMessage}
          </p>
        )}
      </reopenModal.Component>
    );
  },
);
