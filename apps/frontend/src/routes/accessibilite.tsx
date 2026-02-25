import { createFileRoute, Link } from '@tanstack/react-router';
import { AppFooter } from '@/components/layout/footer';
import { HeaderMenu } from '@/components/layout/header';

export const Route = createFileRoute('/accessibilite')({
  component: AccessibilitePage,
});

function AccessibilitePage() {
  return (
    <div>
      <HeaderMenu homeHref="/" />

      <div className="fr-grid-row">
        <div className="fr-col">
          {/* biome-ignore lint/a11y/useSemanticElements: exigé par RGAA */}
          <nav role="navigation" className="fr-container fr-breadcrumb" aria-label="vous êtes ici :">
            <ol className="fr-breadcrumb__list">
              <li className="fr-breadcrumb__item">
                <Link to="/" className="fr-breadcrumb__link">
                  Accueil
                </Link>
              </li>
              <li className="fr-breadcrumb__item">
                <Link to="/accessibilite" className="fr-breadcrumb__link" aria-current="page">
                  Accessibilité
                </Link>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: exigé par RGAA */}
      <main role="main" className="fr-container">
        <h1>Déclaration d’accessibilité</h1>
        <p>
          <strong>Les Ministères Sociaux</strong> s’engagent à rendre leurs sites, applications et services accessibles
          conformément à l’article 47 de la loi n°2005-102 du 11 février 2005.
        </p>
        <p>
          Cette déclaration s’applique au site <strong>https://sirena-sante.social.gouv.fr</strong>.
        </p>

        <h2>État de conformité</h2>
        <p>
          Le site <strong>SIRENA</strong> est{' '}
          <strong>
            <span data-printfilter="lowercase"> non conforme </span>
          </strong>
          avec le <abbr title="Référentiel général d’amélioration de l’accessibilité"> RGAA</abbr>. Le site n’a encore
          pas été audité.
        </p>

        <h3>Non conformité</h3>
        <p>
          Malgré nos efforts, certains contenus sont inaccessibles. Voici une liste non exhaustive des limitations :
        </p>
        <ul className="technical-information accessibility-limitations">
          <li>Certains éléments ne sont pas structurés en liste.</li>
          <li>Certains champs obligatoires ne sont pas signalés.</li>
          <li>Certains messages d’erreur ne sont pas correctement associés aux champs en erreur ou distingués.</li>
          <li>Certains composants interactifs ne sont pas correctement accessibles.</li>
          <li>Le focus clavier se déplace dans un ordre incohérent dans la page de détail d'une requête.</li>
          <li>Certains boutons n'ont pas de nom accessible.</li>
          <li>Absence de texte d'aide pertinent pour certains champs de formulaire.</li>
          <li>Les fichiers PDF ne sont pas accessibles et n'ont pas d'alternative accessible.</li>
        </ul>

        <h2>Établissement de cette déclaration d’accessibilité</h2>
        <p>Cette déclaration a été établie le 25 février 2026.</p>

        <h3>Technologies utilisées</h3>
        <ul className="technical-information technologies-used">
          <li>HTML</li>
          <li>CSS</li>
          <li>JavaScript</li>
          <li>React</li>
        </ul>

        <h2>Retour d’information et contact</h2>
        <p>
          Si vous rencontrez un problème lié à l'accessibilité avec un contenu ou un service, vous pouvez contacter le
          responsable de SIRENA pour être orienté.e vers une alternative accessible ou obtenir le contenu sous une autre
          forme.
        </p>
        <p>
          Pour cela vous pouvez contacter :{' '}
          <a href="mailto:dgcs-sirena@social.gouv.fr" target="_blank" rel="noopener noreferrer">
            dgcs-sirena@social.gouv.fr
            <span className="fr-sr-only">nouvelle fenêtre</span>
          </a>
        </p>

        <h2>Voies de recours</h2>
        <p>
          Si vous constatez un défaut d’accessibilité vous empêchant d’accéder à un contenu ou une fonctionnalité du
          site, vous pouvez faire parvenir vos doléances ou une demande de saisine au Défenseur des droits.
        </p>
        <p>Plusieurs moyens sont à votre disposition :</p>
        <ul>
          <li>
            <a
              href="https://formulaire.defenseurdesdroits.fr/formulaire_saisine"
              target="_blank"
              rel="noopener noreferrer"
            >
              Écrire un message au Défenseur des droits <span className="fr-sr-only">nouvelle fenêtre</span>
            </a>
          </li>
          <li>
            <a href="https://www.defenseurdesdroits.fr/carte-des-delegues" target="_blank" rel="noopener noreferrer">
              Contacter le délégué régional <span className="fr-sr-only">nouvelle fenêtre</span>
            </a>
          </li>
          <li>
            Par téléphone : <a href="tel:0969390000">09 69 39 00 00</a>
          </li>
          <li>
            <p>Par courrier :</p>
            <address>
              <p>Défenseur des droits</p>
              <p>Libre réponse 71120</p>
              <p>75342 Paris CEDEX 07</p>
            </address>
          </li>
        </ul>
      </main>

      <AppFooter />
    </div>
  );
}
