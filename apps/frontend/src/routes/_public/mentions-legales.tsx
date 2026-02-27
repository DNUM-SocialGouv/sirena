import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public/mentions-legales')({
  component: MentionsLegalesPage,
});

export function MentionsLegalesPage() {
  return (
    <>
      <h1>Mentions légales</h1>
      <h2>Éditeur</h2>

      <p>Le suivi éditorial, graphique et technique est assuré par :</p>
      <address>
        <p>Direction Générale de la Cohésion Sociale</p>
        <p>Ministère des solidarités et de la santé</p>
        <p>78-84 rue Olivier de Serres</p>
        <p>75015 PARIS </p>
        <p>Téléphone du standard : 01 40 56 60 00</p>
      </address>

      <h2>Directeur de la publication</h2>
      <p>Monsieur Jean-Benoît DUJOL - Directeur général de la cohésion sociale</p>

      <h2>Prestataires</h2>

      <h3>Hébergement</h3>
      <address>
        <p>OVH SAS</p>
        <p>2 rue Kellermann</p>
        <p>59100 Roubaix</p>
        <p>France</p>
      </address>

      <h3>Développement et maintenance</h3>
      <p>Le développement et la maintenance sont assurés par la Direction du Numérique des ministères sociaux.</p>

      <h3>Prestataire Statistiques</h3>

      <p>
        Les statistiques de consultation du site sont assurées par la société{' '}
        <a href="https://matomo.org/" target="_blank" rel="noopener noreferrer">
          MATOMO<span className="fr-sr-only">nouvelle fenêtre</span>
        </a>
        .
      </p>

      <h3>Création de liens vers le site</h3>

      <p>
        La mise en place de lien vers{' '}
        <a href="https://sirena-sante.social.gouv.fr/" target="_blank" rel="noopener noreferrer">
          SIRENA<span className="fr-sr-only">nouvelle fenêtre</span>
        </a>{' '}
        n’est conditionnée à aucun accord préalable.
      </p>

      <p>
        En revanche les pages des sites{' '}
        <a href="https://sirena-sante.social.gouv.fr/" target="_blank" rel="noopener noreferrer">
          SIRENA<span className="fr-sr-only">nouvelle fenêtre</span>
        </a>{' '}
        ne doivent pas être imbriquées à l’intérieur des pages d’un autre site.
      </p>
    </>
  );
}
