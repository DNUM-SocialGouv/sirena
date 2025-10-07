import { InfoSection } from '@sirena/ui';

interface PersonneConcerneeSectionProps {
  id: string;
}

export const PersonneConcerneeSection = ({ id }: PersonneConcerneeSectionProps) => {
  return <InfoSection id={id} title="Personne concernée" emptyLabel="Aucune information sur la personne concernée" />;
};
