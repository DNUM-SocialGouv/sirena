import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useEffect, useRef } from 'react';
import { useUnsavedChangesStore } from '@/stores/unsavedChangesStore';

const unsavedChangesModal = createModal({ id: 'unsaved-changes-modal', isOpenedByDefault: false });

export function UnsavedChangesModal() {
  const isAsking = useUnsavedChangesStore((state) => state.pendingResolve !== null);
  const answer = useUnsavedChangesStore((state) => state.answer);

  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isAsking) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    unsavedChangesModal.open();
  }, [isAsking]);

  // Escape, backdrop and ✕ are handled by the DSFR vanilla JS: every way out ends with this event.
  useEffect(() => {
    const element = document.getElementById(unsavedChangesModal.id);
    const handleConceal = () => {
      const isStaying = useUnsavedChangesStore.getState().pendingResolve !== null;

      answer(false);

      const trigger = triggerRef.current;
      triggerRef.current = null;

      if (!isStaying) return;

      // Deferred so the DSFR has finished moving the focus itself.
      setTimeout(() => {
        if (trigger?.isConnected) trigger.focus();
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
