import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public/conditions-generales-utilisation')({
  head: () => ({
    meta: [
      {
        title: 'Conditions générales d’utilisation - SIRENA',
      },
    ],
  }),
  component: ConditionsGeneralesUtilisationPage,
});

export function ConditionsGeneralesUtilisationPage() {
  return (
    <>
      <h1>Conditions générales d’utilisation</h1>
      <p>
        Les conditions générales d’utilisation de SIRENA sont en cours de rédaction. Elles seront publiées sur cette
        page.
      </p>
    </>
  );
}
