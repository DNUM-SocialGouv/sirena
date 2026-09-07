import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useReopenRequete } from '@/hooks/mutations/reopenRequete.hook';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';

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
    const reopenMutation = useReopenRequete(requestId);
    const otherEntitiesQuery = useRequeteOtherEntitiesAffected(requestId);

    const recipientNames = (otherEntitiesQuery.data?.otherEntites.map((entite) => entite.nomComplet) ?? []).sort(
      (a, b) => a.localeCompare(b, 'fr'),
    );

    const recipients = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' }).format(recipientNames);

    const visibilityMessage =
      otherEntitiesQuery.isFetching ||
      otherEntitiesQuery.isPaused ||
      otherEntitiesQuery.isPlaceholderData ||
      otherEntitiesQuery.isError ||
      !otherEntitiesQuery.data
        ? 'Cette étape sera visible par les autres entités administratives affectées à la requête.'
        : recipientNames.length > 0
          ? `Cette étape sera visible par ${recipients}.`
          : null;

    const reopenModal = useMemo(
      () =>
        createModal({
          id: `reopen-requete-modal-${requestId}`,
          isOpenedByDefault: false,
        }),
      [requestId],
    );

    const { registerTrigger } = useModalFocusRestore([reopenModal.id]);

    const openModal = () => {
      setIsSubmitting(false);
      setErrorMessage(null);
      wasActionTakenRef.current = false;

      if (triggerButtonRef?.current) {
        registerTrigger(triggerButtonRef.current);
      }

      void otherEntitiesQuery.refetch();

      reopenModal.open();
    };

    useImperativeHandle(ref, () => ({
      openModal,
    }));

    const handleSubmit = async () => {
      setIsSubmitting(true);
      wasActionTakenRef.current = true;

      try {
        await reopenMutation.mutateAsync();
        reopenModal.close();
      } catch {
        setIsSubmitting(false);
        wasActionTakenRef.current = false;
        setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      }
    };

    const handleCancel = () => {
      wasActionTakenRef.current = true;
      reopenModal.close();
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
        {visibilityMessage ? <p>{visibilityMessage}</p> : null}
        {errorMessage ? (
          <p className="fr-text--sm" style={{ color: 'var(--text-default-error)' }}>
            {errorMessage}
          </p>
        ) : null}
      </reopenModal.Component>
    );
  },
);
