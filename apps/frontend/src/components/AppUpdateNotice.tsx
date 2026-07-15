import Button from '@codegouvfr/react-dsfr/Button';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { useAppUpdateStore } from '@/stores/appUpdateStore';

const reloadPage = () => window.location.reload();

export function AppUpdateNotice() {
  const isUpdateAvailable = useAppUpdateStore((state) => state.isUpdateAvailable);
  const dismiss = useAppUpdateStore((state) => state.dismiss);

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <Notice
      severity="info"
      isClosable
      onClose={dismiss}
      title={
        <>
          Votre version de Sirena chargée sur votre navigateur diffère de celle en ligne actuellement. Pour éviter tout
          problème, nous vous conseillons de recharger la page.
          <Button priority="secondary" size="small" className="fr-ml-2w" onClick={reloadPage}>
            Rafraîchir la page
          </Button>
        </>
      }
    />
  );
}
