import { capitalizeFirst } from '@/components/requestId/sections/helpers';

export const formatDate = (dateStr: string | Date) =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatAgent = (agent: { prenom: string; nom: string }): React.ReactNode => (
  <>
    {capitalizeFirst(agent.prenom)} <span className="lastname">{capitalizeFirst(agent.nom)}</span>
  </>
);
