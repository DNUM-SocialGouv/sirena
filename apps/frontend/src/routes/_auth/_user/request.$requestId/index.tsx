import { Button } from '@codegouvfr/react-dsfr/Button';
import { createFileRoute } from '@tanstack/react-router';
import styles from '../request.$requestId.module.css';

export const Route = createFileRoute('/_auth/_user/request/$requestId/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className={styles['request-details-content']}>
      <section className="fr-mb-4w">
        <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
          <div className="fr-col">
            <h2 className="fr-h5 fr-mb-0">Personne concernée</h2>
          </div>
          <div className="fr-col-auto">
            <div className="fr-btns-group fr-btns-group--inline-sm">
              <Button priority="tertiary no outline" size="small" iconId="fr-icon-pencil-line">
                Éditer
              </Button>
              <Button priority="tertiary no outline" size="small" iconId="fr-icon-file-line">
                Annoter
              </Button>
            </div>
          </div>
        </div>
        <p className="fr-text--bold fr-mb-1w">Identité</p>
        <p className="fr-mb-2w">M. John Doe</p>
        <p className="fr-text--sm fr-text--grey fr-mb-1w">Âge : entre 7 et 77 ans</p>

        <p className="fr-text--bold fr-mb-1w fr-mt-3w">Adresse</p>
        <p className="fr-mb-2w">xxx</p>

        <p className="fr-text--bold fr-mb-1w fr-mt-3w">Informations complémentaires</p>
      </section>
    </div>
  );
}
