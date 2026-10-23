import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import conclusionPictogram from '@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/conclusion.svg?no-inline';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useAcceptCgu } from '@/hooks/mutations/acceptCgu.hook';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import type { acceptCgu } from '@/lib/api/acceptCgu';
import type { fetchProfile } from '@/lib/api/fetchProfile';
import { HttpError } from '@/lib/api/tanstackQuery';
import { useUserStore } from '@/stores/userStore';
import styles from './CguAcceptance.module.css';
import { CguContent } from './CguContent';

const cguAcceptanceModal = createModal({ id: 'cgu-acceptance-modal', isOpenedByDefault: false });

type CguAcceptanceData = Awaited<ReturnType<typeof acceptCgu>>;
type Profile = Awaited<ReturnType<typeof fetchProfile>>;

const getErrorMessage = (error: Error) =>
  error instanceof HttpError && error.status === 409
    ? 'Une nouvelle version des conditions générales d’utilisation a été publiée. Rechargez la page pour la consulter.'
    : 'Votre acceptation n’a pas pu être enregistrée. Veuillez réessayer.';

type CguAcceptanceProps = {
  onAccepted: () => void;
};

export function CguAcceptance({ onAccepted }: CguAcceptanceProps) {
  const queryClient = useQueryClient();
  const { mutate, isPending, error, reset } = useAcceptCgu();
  const acceptanceRef = useRef<CguAcceptanceData | null>(null);
  const reopenButtonRef = useRef<HTMLButtonElement>(null);
  const [refusalCount, setRefusalCount] = useState(0);
  // Read at acceptance time: a new callback must not register the listener again, which would reopen the modal
  const onAcceptedRef = useRef(onAccepted);
  onAcceptedRef.current = onAccepted;

  useEffect(() => {
    const modalElement = document.getElementById(cguAcceptanceModal.id);

    const handleConceal = () => {
      const acceptance = acceptanceRef.current;
      if (acceptance) {
        // Recording the acceptance unmounts the modal: it only happens once DSFR has closed it
        queryClient.setQueryData<Profile>(profileQueryOptions().queryKey, (profile) =>
          profile ? { ...profile, ...acceptance } : profile,
        );
        useUserStore.getState().setCguAcceptedVersion(acceptance.cguAcceptedVersion);
        onAcceptedRef.current();
        return;
      }
      reset();
      useUserStore.getState().setHasRefusedCgu(true);
      setRefusalCount((count) => count + 1);
    };

    modalElement?.addEventListener('dsfr.conceal', handleConceal);
    // Presented on its own at login only: after a refusal, the page offers to open it again
    const openFrame = useUserStore.getState().hasRefusedCgu
      ? null
      : window.requestAnimationFrame(() => cguAcceptanceModal.open());

    return () => {
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      modalElement?.removeEventListener('dsfr.conceal', handleConceal);
    };
  }, [queryClient, reset]);

  // An automatic opening has no trigger to return to: the focus goes to the reopening button
  useEffect(() => {
    if (refusalCount > 0) reopenButtonRef.current?.focus();
  }, [refusalCount]);

  const handleAccept = () => {
    if (isPending) return;
    mutate(undefined, {
      onSuccess: (acceptance) => {
        acceptanceRef.current = acceptance;
        cguAcceptanceModal.close();
      },
    });
  };

  return (
    <>
      <div className="fr-grid-row fr-grid-row--center fr-my-10w">
        <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
          {/* DSFR markup rather than <Alert />, which cannot title the page with its h1 */}
          <div className="fr-alert fr-alert--warning">
            <h1 className="fr-alert__title">Attention</h1>
            <p>
              Pour utiliser SIRENA vous devez obligatoirement prendre connaissance des conditions générales
              d’utilisation et les accepter.
            </p>
            <Button ref={reopenButtonRef} className="fr-mt-2w" nativeButtonProps={cguAcceptanceModal.buttonProps}>
              Voir les conditions générales d’utilisation
            </Button>
          </div>
        </div>
      </div>
      <cguAcceptanceModal.Component
        size="large"
        concealingBackdrop={false}
        className={styles.modal}
        titleProps={{ className: styles.title }}
        title={
          <>
            <svg
              className={clsx('fr-artwork', styles.pictogram)}
              aria-hidden="true"
              viewBox="0 0 80 80"
              width="80px"
              height="80px"
            >
              <use className="fr-artwork-decorative" href={`${conclusionPictogram}#artwork-decorative`} />
              <use className="fr-artwork-minor" href={`${conclusionPictogram}#artwork-minor`} />
              <use className="fr-artwork-major" href={`${conclusionPictogram}#artwork-major`} />
            </svg>
            Conditions générales d’utilisation de SIRENA
          </>
        }
        buttons={[{ children: 'Refuser' }, { children: 'Accepter', doClosesModal: false, onClick: handleAccept }]}
      >
        <CguContent />
        {error ? <Alert severity="error" small className="fr-mt-4w" description={getErrorMessage(error)} /> : null}
      </cguAcceptanceModal.Component>
    </>
  );
}
