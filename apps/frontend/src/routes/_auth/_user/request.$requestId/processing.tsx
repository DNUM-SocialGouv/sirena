import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { createFileRoute } from '@tanstack/react-router';
import styles from '../request.$requestId.module.css';

export const Route = createFileRoute('/_auth/_user/request/$requestId/processing')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className={styles['request-processing-tab']}>
      <div className="fr-container--fluid">
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col">
            <div className="fr-mb-4w">
              <div className="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div className="fr-col">
                  <h2 className="fr-mb-0">Étapes du traitement</h2>
                </div>
                <div className="fr-col-auto">
                  <Button priority="secondary" size="small">
                    Ajouter une étape
                  </Button>
                </div>
              </div>

              <div className={styles['timeline-container']}>
                <div className={styles['timeline-line']} />

                <div className={`fr-mb-4w ${styles['timeline-step']}`}>
                  <div className={styles['timeline-dot']} />

                  <div className={styles.step}>
                    <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
                      <div className="fr-col">
                        <h3 className="fr-h6 fr-mb-0">Envoyer un accusé de réception au déclarant</h3>
                      </div>
                      <div className="fr-col-auto">
                        <Badge severity="success" small>
                          À FAIRE
                        </Badge>
                      </div>
                      <div className="fr-col-auto">
                        <Button
                          priority="tertiary no outline"
                          size="small"
                          iconId="fr-icon-arrow-down-s-line"
                          iconPosition="right"
                          title="Afficher/Masquer"
                        >
                          <span className="fr-sr-only">Afficher/Masquer</span>
                        </Button>
                      </div>
                      <div className="fr-col-auto">
                        <Button priority="tertiary no outline" size="small" iconId="fr-icon-edit-line" title="Éditer">
                          <span className="fr-sr-only">Éditer</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`fr-mb-4w ${styles['timeline-step']}`}>
                  <div className={styles['timeline-dot']} />

                  <div className={styles.step}>
                    <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
                      <div className="fr-col">
                        <h3 className="fr-h6 fr-mb-0">Création de la requête le x/x/x</h3>
                      </div>
                      <div className="fr-col-auto">
                        <Badge severity="warning" small>
                          FAIT
                        </Badge>
                      </div>
                      <div className="fr-col-auto">
                        <Button
                          priority="tertiary no outline"
                          size="small"
                          iconId="fr-icon-arrow-down-s-line"
                          iconPosition="right"
                          title="Afficher/Masquer"
                        >
                          <span className="fr-sr-only">Afficher/Masquer</span>
                        </Button>
                      </div>
                      <div className="fr-col-auto">
                        <Button priority="tertiary no outline" size="small" iconId="fr-icon-edit-line" title="Éditer">
                          <span className="fr-sr-only">Éditer</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
