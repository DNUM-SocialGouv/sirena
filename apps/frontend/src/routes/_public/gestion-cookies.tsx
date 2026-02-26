import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public/gestion-cookies')({
  component: GestionCookiesPage,
});

export function GestionCookiesPage() {
  return (
    <div>
      <h1>Gestion des cookies</h1>
      <h2>À propos des cookies</h2>
      <p>
        Nous utilisons des cookies afin d'analyser la navigation des utilisateurs, d'optimiser l'ergonomie du site
        internet et son fonctionnement.
      </p>
      <p>
        Aucune donnée à caractère personnel n'est collectée, c'est pourquoi nous sommes exemptés du recueil de votre
        consentement pour ces cookies. 
      </p>

      <h2> Cookies strictement nécessaires au fonctionnement du site</h2>
      <p>Ce site utilise des cookies nécessaires à son bon fonctionnement qui ne peuvent pas être désactivés.</p>
    </div>
  );
}
