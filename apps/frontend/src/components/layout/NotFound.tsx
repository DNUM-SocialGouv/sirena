import { fr } from '@codegouvfr/react-dsfr';
import { Link } from '@tanstack/react-router';

export const NotFound = () => (
  <section className={fr.cx('fr-my-6w')}>
    <h1 className={fr.cx('fr-h3')}>Page introuvable</h1>
    <p>La page que vous cherchez n’existe pas ou n’est plus disponible.</p>
    <Link className={fr.cx('fr-link')} to="/">
      Retour à l’accueil
    </Link>
  </section>
);
