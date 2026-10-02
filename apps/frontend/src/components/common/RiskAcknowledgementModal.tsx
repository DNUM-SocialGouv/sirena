import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';
import styles from './RiskAcknowledgementModal.module.css';

export type RiskAcknowledgementContent = {
  title: string;
  message: string;
  details?: React.ReactNode;
  acknowledgementLabel: string;
  confirmLabel: string;
};

type OpenRiskAcknowledgementOptions = {
  trigger: HTMLElement;
  content: RiskAcknowledgementContent;
  onConfirm: () => void;
};

export type RiskAcknowledgementModalHandle = {
  open: (options: OpenRiskAcknowledgementOptions) => void;
};

export const RiskAcknowledgementModal = forwardRef<RiskAcknowledgementModalHandle>((_, ref) => {
  const modalId = useId();
  const modal = useMemo(
    () => createModal({ id: `risk-acknowledgement-modal-${modalId}`, isOpenedByDefault: false }),
    [modalId],
  );
  const modalIds = useMemo(() => [modal.id], [modal.id]);
  const { registerTrigger } = useModalFocusRestore(modalIds);
  const [content, setContent] = useState<RiskAcknowledgementContent | null>(null);
  const [accepted, setAccepted] = useState(false);
  const acceptedRef = useRef(false);
  const onConfirmRef = useRef<(() => void) | null>(null);

  const resetAcceptance = useCallback(() => {
    acceptedRef.current = false;
    setAccepted(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open: ({ trigger, content: nextContent, onConfirm }) => {
        registerTrigger(trigger);
        setContent(nextContent);
        onConfirmRef.current = onConfirm;
        resetAcceptance();
        modal.open();
      },
    }),
    [modal, registerTrigger, resetAcceptance],
  );

  useEffect(() => {
    const element = document.getElementById(modal.id);
    element?.addEventListener('dsfr.conceal', resetAcceptance);
    return () => element?.removeEventListener('dsfr.conceal', resetAcceptance);
  }, [modal.id, resetAcceptance]);

  const handleAcceptanceChange = (nextAccepted: boolean) => {
    acceptedRef.current = nextAccepted;
    setAccepted(nextAccepted);
  };

  const handleConfirm = () => {
    if (!acceptedRef.current) return;
    resetAcceptance();
    onConfirmRef.current?.();
    modal.close();
  };

  return (
    <modal.Component
      title={content?.title ?? ''}
      iconId="fr-icon-warning-line"
      buttons={[
        {
          doClosesModal: true,
          children: 'Annuler',
          onClick: resetAcceptance,
        },
        {
          doClosesModal: false,
          children: content?.confirmLabel ?? '',
          className: accepted ? undefined : styles.unavailable,
          nativeButtonProps: {
            'aria-disabled': accepted ? undefined : true,
          },
          onClick: handleConfirm,
        },
      ]}
    >
      <p>{content?.message}</p>
      {content?.details}
      <Checkbox
        className="fr-mt-2w"
        options={[
          {
            label: content?.acknowledgementLabel ?? '',
            nativeInputProps: {
              checked: accepted,
              onChange: (event) => handleAcceptanceChange(event.target.checked),
            },
          },
        ]}
      />
    </modal.Component>
  );
});

RiskAcknowledgementModal.displayName = 'RiskAcknowledgementModal';
