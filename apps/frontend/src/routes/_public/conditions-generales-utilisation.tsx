import { createFileRoute } from '@tanstack/react-router';
import { CguContent } from '@/components/cgu/CguContent';

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
      <CguContent />
    </>
  );
}
