import { fr } from '@codegouvfr/react-dsfr';
import TechnicalError from '@codegouvfr/react-dsfr/picto/TechnicalError';
import { Link } from '@tanstack/react-router';

export const NotFound = () => (
  <div
    className={fr.cx(
      'fr-my-7w',
      'fr-mt-md-12w',
      'fr-mb-md-10w',
      'fr-grid-row',
      'fr-grid-row--gutters',
      'fr-grid-row--middle',
      'fr-grid-row--center',
    )}
  >
    <div className={fr.cx('fr-py-0', 'fr-col-12', 'fr-col-md-6')}>
      <h1>Page non trouvée</h1>
      <p className={fr.cx('fr-text--sm', 'fr-mb-3w')}>Erreur 404</p>
      <p className={fr.cx('fr-text--lead', 'fr-mb-3w')}>
        La page que vous cherchez est introuvable. Excusez-nous pour la gêne occasionnée.
      </p>
      <p className={fr.cx('fr-text--sm', 'fr-mb-5w')}>
        Si vous avez tapé l’adresse web dans le navigateur, vérifiez qu’elle est correcte. La page n’est peut-être plus
        disponible.
        <br />
        Dans ce cas, pour continuer votre visite vous pouvez revenir à l’accueil.
      </p>
      <ul className={fr.cx('fr-btns-group', 'fr-btns-group--inline-md')}>
        <li>
          <Link className={fr.cx('fr-btn')} to="/">
            Page d’accueil
          </Link>
        </li>
      </ul>
    </div>
    <div className={fr.cx('fr-col-12', 'fr-col-md-3', 'fr-col-offset-md-1', 'fr-px-6w', 'fr-px-md-0', 'fr-py-0')}>
      <TechnicalError fontSize="10rem" />
    </div>
  </div>
);
