import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';

export type MaltraitanceWarningModalRef = {
  openModal: () => void;
};

export type MaltraitanceWarningModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  triggerButtonRef?: React.RefObject<HTMLButtonElement | null>;
};

const MALTRAITANCE_MOTIF_LABEL = 'Maltraitance professionnels ou entourage';

export const MaltraitanceWarningModal = forwardRef<MaltraitanceWarningModalRef, MaltraitanceWarningModalProps>(
  ({ onCancel, onConfirm, triggerButtonRef }, ref) => {
    const wasActionTakenRef = useRef(false);

    const modal = useMemo(
      () =>
        createModal({
          id: 'maltraitance-warning-modal',
          isOpenedByDefault: false,
        }),
      [],
    );

    const focusTriggerButton = () =>
      setTimeout(() => {
        triggerButtonRef?.current?.focus();
      }, 0);

    const openModal = () => {
      wasActionTakenRef.current = false;
      modal.open();
    };

    useImperativeHandle(ref, () => ({
      openModal,
    }));

    const handleCancel = () => {
      wasActionTakenRef.current = true;
      modal.close();
      focusTriggerButton();
      onCancel();
    };

    const handleConfirm = () => {
      wasActionTakenRef.current = true;
      modal.close();
      focusTriggerButton();
      onConfirm();
    };

    return (
      <modal.Component
        size="medium"
        title="La situation ne sera plus considérée comme un cas de maltraitance"
        buttons={[
          {
            doClosesModal: false,
            children: 'Annuler et modifier le motif',
            onClick: handleCancel,
          },
          {
            doClosesModal: false,
            children: 'Confirmer et enregistrer',
            onClick: handleConfirm,
          },
        ]}
      >
        <div className="fr-mb-4w">
          <p className="fr-mb-2w">
            L&apos;usager a qualifié cette situation comme relevant de la maltraitance, mais votre qualification est
            différente.
          </p>
          <p className="fr-mb-0">
            Pour conserver une qualification en maltraitance, sélectionnez un motif dans{' '}
            <strong>« {MALTRAITANCE_MOTIF_LABEL} ».</strong> À défaut, cette situation ne sera plus considérée comme un
            cas de maltraitance.
          </p>
        </div>
      </modal.Component>
    );
  },
);

MaltraitanceWarningModal.displayName = 'MaltraitanceWarningModal';
