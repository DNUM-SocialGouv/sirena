import type { Civilite } from '@sirena/common/constants';
import type { RootChampFragmentFragment } from '@/libs/graffle';
import type mapping from './dematSocial.mapper';

export type DematSocialCivilite = Extract<Civilite, 'M' | 'MME'>;

export type Demandeur = {
  nom: string;
  prenom: string;
  civiliteId: DematSocialCivilite | null;
  email: string;
};

export type Mandataire = {
  nom: string;
  prenom: string;
  email: string;
};

export type MappedChamp = Record<string, RootChampFragmentFragment>;

export type RepetitionChamp = Extract<RootChampFragmentFragment, { __typename?: 'RepetitionChamp' }>['champs'][number];
export type MappedRepetitionChamp = Record<string, RepetitionChamp>;

export type Mapping = typeof mapping;
export type AutreFaitsMapping = Mapping['autreFaits']['champs'];
