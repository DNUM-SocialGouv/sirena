import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useEffect, useRef } from 'react';
import { useUnsavedChangesStore } from '@/stores/unsavedChangesStore';

const unsavedChangesModal = createModal({ id: 'unsaved-changes-modal', isOpenedByDefault: false });

export function UnsavedChangesModal() {
  const pendingResolve = useUnsavedChangesStore((state) => state.pendingResolve);
  const answer = useUnsavedChangesStore((state) => state.answer);

  const triggerRef = useRef<HTMLElement | null>(null);

  // Keyed on each request, not on whether one is pending: an answer and a new request can land in one render.
  useEffect(() => {
    if (!pendingResolve) return;

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const isFocusInModal = document.getElementById(unsavedChangesModal.id)?.contains(activeElement) ?? false;
    if (!isFocusInModal) triggerRef.current = activeElement;

    unsavedChangesModal.open();
  }, [pendingResolve]);

  // Escape, backdrop and ✕ are handled by the DSFR vanilla JS: every way out ends with this event.
  useEffect(() => {
    const element = document.getElementById(unsavedChangesModal.id);
    const handleConceal = () => {
      const isStaying = useUnsavedChangesStore.getState().pendingResolve !== null;

      answer(false);

      if (!isStaying) return;

      // Deferred so the DSFR has finished moving the focus itself. A request asked meanwhile keeps it in the modal.
      setTimeout(() => {
        const trigger = triggerRef.current;
        const isAskingAgain = useUnsavedChangesStore.getState().pendingResolve !== null;

        if (!isAskingAgain && trigger?.isConnected) trigger.focus();
      }, 0);
    };

    element?.addEventListener('dsfr.conceal', handleConceal);

    return () => element?.removeEventListener('dsfr.conceal', handleConceal);
  }, [answer]);

  const handleLeave = () => {
    answer(true);
    unsavedChangesModal.close();
  };

  return (
    <unsavedChangesModal.Component
      title="Données non enregistrées"
      titleAs="h2"
      buttons={[
        {
          doClosesModal: false,
          priority: 'secondary',
          children: 'Annuler',
          onClick: () => unsavedChangesModal.close(),
        },
        {
          doClosesModal: false,
          children: 'Quitter sans enregistrer',
          onClick: handleLeave,
        },
      ]}
    >
      <p>Si vous quittez ce formulaire sans enregistrer, les informations saisies seront effacées.</p>
    </unsavedChangesModal.Component>
  );
}
