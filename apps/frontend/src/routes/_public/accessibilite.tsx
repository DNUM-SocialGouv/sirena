import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public/accessibilite')({
  component: AccessibilitePage,
});

export function AccessibilitePage() {
  return (
    <>
      <h1>Déclaration d’accessibilité</h1>
      <p>
        <strong>Les Ministères Sociaux</strong> s’engagent à rendre leurs sites internet, intranet, extranet et leurs
        progiciels accessibles (et leurs applications mobiles et mobilier urbain numérique) conformément à l’article 47
        de la loi n°2005-102 du 11 février 2005.
      </p>
      <p>
        À cette fin, ils mettent en œuvre la stratégie et les actions du schéma pluriannuel 2025-2028 :{' '}
        <a
          href="https://sante.gouv.fr/ministere/article/schema-pluriannuel-d-accessibilite-numerique-2025-2028"
          target="_blank"
          rel="noopener noreferrer"
        >
          consulter le schéma pluriannuel et le plan d’action 2025-2028{' '}
          <span className="fr-sr-only">nouvelle fenêtre</span>
        </a>
      </p>
      <p>Plan d’actions 2025-2027 :</p>
      <ul>
        <li>Audit rapide de conformité du site</li>
        <li>Prise en compte des corrections à la suite de l’audit pour améliorer l’accessibilité du site</li>
        <li>Audit initial du site</li>
        <li>Prise en compte des corrections à la suite de l’audit initial pour améliorer l’accessibilité du site</li>
        <li>Contre-audit</li>
        <li>Prise en compte des corrections à la suite de l’audit initial pour améliorer l’accessibilité du site</li>
      </ul>
      <p>
        Cette déclaration d’accessibilité s’applique à SIRENA : <strong>https://sirena-sante.social.gouv.fr</strong>.
      </p>

      <h2>État de conformité</h2>
      <p>
        <strong>SIRENA</strong> est{' '}
        <strong>
          <span data-printfilter="lowercase">partiellement conforme</span>
        </strong>{' '}
        avec le référentiel général d’amélioration de l’accessibilité (RGAA).
      </p>

      <h3>Résultats des tests</h3>
      <p>
        L’audit de conformité réalisé par <strong>Access Ethics</strong> révèle que <strong>75%</strong> des critères du
        RGAA version 4.1.2 sont respectés.
      </p>

      <h2>Contenus non accessibles</h2>

      <h3>Non-conformités</h3>
      <p>Liste non exhaustive des erreurs remontées lors de l’audit :</p>
      <ul className="technical-information accessibility-limitations">
        <li>Le module d’assistance peut être difficile à utiliser, notamment avec le zoom ou sur petit écran ;</li>
        <li>
          Certaines listes de choix complexes peuvent être difficiles à comprendre ou à utiliser avec un lecteur d’écran
          ;
        </li>
        <li>
          Certaines actions peuvent déplacer le focus au mauvais endroit, ce qui peut faire perdre le fil lors d’une
          navigation au clavier ;
        </li>
        <li>Certains messages ou notifications disparaissent trop vite ou ne sont pas correctement accessibles ;</li>
        <li>
          Certains champs de formulaire ne donnent pas assez d’indications sur le format attendu, par exemple pour les
          dates ;
        </li>
        <li>Certains champs obligatoires ne sont pas suffisamment expliqués ;</li>
        <li>Certaines informations visibles à l’écran ne sont pas toujours restituées aux lecteurs d’écran ;</li>
        <li>
          Certains contenus deviennent difficiles à lire ou à atteindre sur mobile, avec un fort zoom ou selon les
          préférences d’affichage ;
        </li>
        <li>
          Certains liens ou boutons peuvent avoir un intitulé trompeur ou ne pas mener clairement vers la destination
          attendue ;
        </li>
        <li>
          Certains repères de navigation, comme le fil d’Ariane ou les liens de retour, peuvent être incohérents ;
        </li>
        <li>
          Certaines pages ou zones de l’interface peuvent manquer de structure claire pour les personnes qui naviguent
          avec une technologie d’assistance ;
        </li>
        <li>Certains champs affichés en lecture seule peuvent manquer de contraste et être difficiles à lire.</li>
      </ul>

      <h2>Établissement de cette déclaration d’accessibilité</h2>
      <p>Cette déclaration a été établie le 29 mai 2026.</p>

      <h3>Technologies utilisées</h3>
      <ul className="technical-information technologies-used">
        <li>
          <abbr lang="en" title="HyperText Markup Language">
            HTML
          </abbr>
        </li>
        <li>
          <abbr lang="en" title="Cascading Style Sheet">
            CSS
          </abbr>
        </li>
        <li>JavaScript</li>
        <li>React</li>
      </ul>

      <h3>Environnement de test</h3>
      <p>
        Les vérifications de restitution de contenus ont été réalisées sur la base de la combinaison fournie par la base
        de référence du RGAA, avec les versions suivantes :
      </p>
      <ul className="technical-information tested-environment">
        <li>Sur Mobile iOS avec Safari et VoiceOver</li>
        <li>Sur Ordinateur MacOS avec Safari et VoiceOver</li>
        <li>Sur Ordinateur Windows avec Firefox et JAWS</li>
        <li>Sur Ordinateur Windows avec Firefox et NVDA</li>
      </ul>

      <h3>Outils pour évaluer l’accessibilité</h3>
      <ul className="technical-information tools-used">
        <li>Web Developer Toolbar</li>
        <li>Colour Contrast Analyser</li>
        <li>HeadingsMap</li>
        <li>WCAG Contrast checker</li>
        <li>Inspecteur de composants</li>
        <li>Validateur HTML du W3C</li>
      </ul>

      <h3>Pages du site ayant fait l’objet de la vérification de conformité</h3>
      <ul className="technical-information pages-checked">
        <li>Authentification</li>
        <li>Accueil</li>
        <li>Page attente habilitation</li>
        <li>Données personnelles</li>
        <li>Mentions légales</li>
        <li>Accessibilité</li>
        <li>Créer une requête, Déclarant, Personne concernée, Description de la situation</li>
        <li>Gestion des habilitations</li>
        <li>Gestion des utilisateurs</li>
        <li>Gérer un utilisateur</li>
        <li>Gestion des entités</li>
      </ul>

      <h2>Retour d’information et contact</h2>
      <p>
        Si vous n’arrivez pas à accéder à un contenu ou à un service, vous pouvez contacter le responsable de la
        démarche pour être orienté vers une alternative accessible ou obtenir le contenu sous une autre forme.
      </p>
      <p>
        Envoyez un message : <a href="mailto:dgcs-sirena@social.gouv.fr">dgcs-sirena@social.gouv.fr</a>
      </p>

      <h2>Voies de recours</h2>
      <p>
        Si vous constatez un défaut d’accessibilité vous empêchant d’accéder à un contenu ou une fonctionnalité du site,
        que vous nous le signalez et que vous ne parvenez pas à obtenir une réponse de notre part, vous êtes en droit de
        faire parvenir vos doléances ou une demande de saisine au Défenseur des droits.
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
            Contacter le délégué du Défenseur des droits dans votre région{' '}
            <span className="fr-sr-only">nouvelle fenêtre</span>
          </a>
        </li>
        <li>
          Par téléphone : <a href="tel:0969390000">09 69 39 00 00</a>
        </li>
        <li>
          <p>Envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) à :</p>
          <address>
            <p>Défenseur des droits</p>
            <p>Libre réponse 71120</p>
            <p>75342 Paris CEDEX 07</p>
          </address>
        </li>
      </ul>
    </>
  );
}
