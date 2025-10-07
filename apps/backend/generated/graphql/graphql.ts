import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: bigint; output: bigint; }
  Coordinates: { input: any; output: any; }
  ISO8601Date: { input: string; output: string; }
  ISO8601DateTime: { input: string; output: string; }
  URL: { input: string; output: string; }
};

export type Address = {
  __typename?: 'Address';
  /** code INSEE de la commune */
  cityCode: Scalars['String']['output'];
  /** nom de la commune */
  cityName: Scalars['String']['output'];
  /** n° de département */
  departmentCode?: Maybe<Scalars['String']['output']>;
  /** nom de département */
  departmentName?: Maybe<Scalars['String']['output']>;
  /** coordonnées géographique */
  geometry?: Maybe<GeoJson>;
  /** libellé complet de l’adresse */
  label: Scalars['String']['output'];
  /** code postal */
  postalCode: Scalars['String']['output'];
  /** n° de region */
  regionCode?: Maybe<Scalars['String']['output']>;
  /** nom de région */
  regionName?: Maybe<Scalars['String']['output']>;
  /** numéro éventuel et nom de voie ou lieu dit */
  streetAddress?: Maybe<Scalars['String']['output']>;
  /** nom de voie ou lieu dit */
  streetName?: Maybe<Scalars['String']['output']>;
  /** numéro avec indice de répétition éventuel (bis, ter, A, B) */
  streetNumber?: Maybe<Scalars['String']['output']>;
  /** type de résultat trouvé */
  type: AddressType;
};

export type AddressChamp = Champ & {
  __typename?: 'AddressChamp';
  address?: Maybe<Address>;
  commune?: Maybe<Commune>;
  departement?: Maybe<Departement>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type AddressChampDescriptor = ChampDescriptor & {
  __typename?: 'AddressChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export enum AddressType {
  /** numéro « à la plaque » */
  Housenumber = 'housenumber',
  /** lieu-dit */
  Locality = 'locality',
  /** numéro « à la commune » */
  Municipality = 'municipality',
  /** position « à la voie », placé approximativement au centre de celle-ci */
  Street = 'street'
}

export type AnnuaireEducationChampDescriptor = ChampDescriptor & {
  __typename?: 'AnnuaireEducationChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Association = {
  __typename?: 'Association';
  dateCreation?: Maybe<Scalars['ISO8601Date']['output']>;
  dateDeclaration?: Maybe<Scalars['ISO8601Date']['output']>;
  datePublication?: Maybe<Scalars['ISO8601Date']['output']>;
  objet?: Maybe<Scalars['String']['output']>;
  rna: Scalars['String']['output'];
  titre: Scalars['String']['output'];
};

export type Avis = {
  __typename?: 'Avis';
  /** @deprecated Utilisez le champ `attachments` à la place. */
  attachment?: Maybe<File>;
  attachments: Array<File>;
  claimant?: Maybe<Profile>;
  dateQuestion: Scalars['ISO8601DateTime']['output'];
  dateReponse?: Maybe<Scalars['ISO8601DateTime']['output']>;
  expert?: Maybe<Profile>;
  id: Scalars['ID']['output'];
  /** @deprecated Utilisez le champ `claimant` à la place. */
  instructeur: Profile;
  question: Scalars['String']['output'];
  questionAnswer?: Maybe<Scalars['Boolean']['output']>;
  questionLabel?: Maybe<Scalars['String']['output']>;
  reponse?: Maybe<Scalars['String']['output']>;
};

export type CojoChampDescriptor = ChampDescriptor & {
  __typename?: 'COJOChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type CarteChamp = Champ & {
  __typename?: 'CarteChamp';
  geoAreas: Array<GeoArea>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type CarteChampDescriptor = ChampDescriptor & {
  __typename?: 'CarteChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Champ = {
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type ChampDescriptor = {
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type CheckboxChamp = Champ & {
  __typename?: 'CheckboxChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
  value: Scalars['Boolean']['output'];
};

export type CheckboxChampDescriptor = ChampDescriptor & {
  __typename?: 'CheckboxChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type ChorusConfiguration = {
  __typename?: 'ChorusConfiguration';
  /** Le code du centre de cout auquel est rattaché la démarche. */
  centreDeCout?: Maybe<Scalars['String']['output']>;
  /** Le code du domaine fonctionnel auquel est rattaché la démarche. */
  domaineFonctionnel?: Maybe<Scalars['String']['output']>;
  /** Le code du référentiel de programmation auquel est rattaché la démarche.. */
  referentielDeProgrammation?: Maybe<Scalars['String']['output']>;
};

export enum Civilite {
  /** Monsieur */
  M = 'M',
  /** Madame */
  Mme = 'Mme'
}

export type CiviliteChamp = Champ & {
  __typename?: 'CiviliteChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
  value?: Maybe<Civilite>;
};

export type CiviliteChampDescriptor = ChampDescriptor & {
  __typename?: 'CiviliteChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type CnafChampDescriptor = ChampDescriptor & {
  __typename?: 'CnafChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Commune = {
  __typename?: 'Commune';
  /** Le code INSEE */
  code: Scalars['String']['output'];
  /** Le nom de la commune */
  name: Scalars['String']['output'];
  /** Le code postal */
  postalCode?: Maybe<Scalars['String']['output']>;
};

export type CommuneChamp = Champ & {
  __typename?: 'CommuneChamp';
  commune?: Maybe<Commune>;
  departement?: Maybe<Departement>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type CommuneChampDescriptor = ChampDescriptor & {
  __typename?: 'CommuneChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export enum ConnectionUsager {
  /** Compte supprimé */
  Deleted = 'deleted',
  /** Connexion via FranceConnect */
  FranceConnect = 'france_connect',
  /** Connexion via mot de passe */
  Password = 'password'
}

export type Correction = {
  __typename?: 'Correction';
  dateResolution?: Maybe<Scalars['ISO8601DateTime']['output']>;
  reason: CorrectionReason;
};

export enum CorrectionReason {
  /** Le dossier est incomplet et nécessite d’être complété */
  Incomplete = 'incomplete',
  /** Le dossier n’est pas valide et nécessite une correction */
  Incorrect = 'incorrect',
  /** Le dossier doit être mis à jour et revalidé */
  Outdated = 'outdated'
}

/** Autogenerated input type of CreateDirectUpload */
export type CreateDirectUploadInput = {
  /** File size (bytes) */
  byteSize: Scalars['Int']['input'];
  /** MD5 file checksum as base64 */
  checksum: Scalars['String']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** File content type */
  contentType: Scalars['String']['input'];
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Original file name */
  filename: Scalars['String']['input'];
};

/** Autogenerated return type of CreateDirectUpload. */
export type CreateDirectUploadPayload = {
  __typename?: 'CreateDirectUploadPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  directUpload: DirectUpload;
};

export type DateChamp = Champ & {
  __typename?: 'DateChamp';
  /** La valeur du champ formaté en ISO8601 (Date). */
  date?: Maybe<Scalars['ISO8601Date']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
  /**
   * La valeur du champ formaté en ISO8601 (DateTime).
   * @deprecated Utilisez le champ `date` ou le fragment `DatetimeChamp` à la place.
   */
  value?: Maybe<Scalars['ISO8601DateTime']['output']>;
};

export type DateChampDescriptor = ChampDescriptor & {
  __typename?: 'DateChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type DatetimeChamp = Champ & {
  __typename?: 'DatetimeChamp';
  /** La valeur du champ formaté en ISO8601 (DateTime). */
  datetime?: Maybe<Scalars['ISO8601DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type DatetimeChampDescriptor = ChampDescriptor & {
  __typename?: 'DatetimeChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type DecimalNumberChamp = Champ & {
  __typename?: 'DecimalNumberChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
  value?: Maybe<Scalars['Float']['output']>;
};

export type DecimalNumberChampDescriptor = ChampDescriptor & {
  __typename?: 'DecimalNumberChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

/** Un dossier supprimé */
export type DeletedDossier = {
  __typename?: 'DeletedDossier';
  /** Date de suppression. */
  dateSupression: Scalars['ISO8601DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Le numéro du dossier qui a été supprimé. */
  number: Scalars['Int']['output'];
  /** La raison de la suppression du dossier. */
  reason: Scalars['String']['output'];
  /** L’état du dossier supprimé. */
  state: DossierState;
};

/** The connection type for DeletedDossier. */
export type DeletedDossierConnection = {
  __typename?: 'DeletedDossierConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<DeletedDossierEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<DeletedDossier>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type DeletedDossierEdge = {
  __typename?: 'DeletedDossierEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node?: Maybe<DeletedDossier>;
};

export type Demandeur = {
  id: Scalars['ID']['output'];
};

/** Une démarche */
export type Demarche = {
  __typename?: 'Demarche';
  activeRevision: Revision;
  /** @deprecated Utilisez le champ `activeRevision.annotationDescriptors` à la place. */
  annotationDescriptors: Array<ChampDescriptor>;
  /** @deprecated Utilisez le champ `activeRevision.champDescriptors` à la place. */
  champDescriptors: Array<ChampDescriptor>;
  /** Cadre budgétaire Chorus */
  chorusConfiguration?: Maybe<ChorusConfiguration>;
  /** Date de la création. */
  dateCreation: Scalars['ISO8601DateTime']['output'];
  /** Date de la dépublication. */
  dateDepublication?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date de la dernière modification. */
  dateDerniereModification: Scalars['ISO8601DateTime']['output'];
  /** Date de la fermeture. */
  dateFermeture?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date de la publication. */
  datePublication?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Pour une démarche déclarative, état cible des dossiers à valider automatiquement */
  declarative?: Maybe<DossierDeclarativeState>;
  /** Liste de tous les dossiers supprimés d’une démarche. */
  deletedDossiers: DeletedDossierConnection;
  /** Description de la démarche. */
  description: Scalars['String']['output'];
  /** Liste de tous les dossiers d’une démarche. */
  dossiers: DossierConnection;
  draftRevision: Revision;
  groupeInstructeurs: Array<GroupeInstructeur>;
  id: Scalars['ID']['output'];
  /** Numero de la démarche. */
  number: Scalars['Int']['output'];
  /** Liste de tous les dossiers en attente de suppression définitive d’une démarche. */
  pendingDeletedDossiers: DeletedDossierConnection;
  publishedRevision?: Maybe<Revision>;
  revisions: Array<Revision>;
  service?: Maybe<Service>;
  /** État de la démarche. */
  state: DemarcheState;
  /** Titre de la démarche. */
  title: Scalars['String']['output'];
};


/** Une démarche */
export type DemarcheDeletedDossiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  deletedSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Une démarche */
export type DemarcheDossiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  createdSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  maxRevision?: InputMaybe<Scalars['ID']['input']>;
  minRevision?: InputMaybe<Scalars['ID']['input']>;
  revision?: InputMaybe<Scalars['ID']['input']>;
  state?: InputMaybe<DossierState>;
  updatedSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
};


/** Une démarche */
export type DemarcheGroupeInstructeursArgs = {
  closed?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Une démarche */
export type DemarchePendingDeletedDossiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  deletedSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Autogenerated input type of DemarcheCloner */
export type DemarcheClonerInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** La démarche */
  demarche: FindDemarcheInput;
  /** Le titre de la nouvelle démarche. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Autogenerated return type of DemarcheCloner. */
export type DemarcheClonerPayload = {
  __typename?: 'DemarcheClonerPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  demarche?: Maybe<DemarcheDescriptor>;
  errors?: Maybe<Array<ValidationError>>;
};

/**
 * Une démarche (métadonnées)
 * Ceci est une version abrégée du type `Demarche`, qui n’expose que les métadonnées.
 * Cela évite l’accès récursif aux dossiers.
 */
export type DemarcheDescriptor = {
  __typename?: 'DemarcheDescriptor';
  /** URL du cadre juridique qui justifie le droit de collecter les données demandées dans la démarche */
  cadreJuridiqueURL?: Maybe<Scalars['String']['output']>;
  /** @deprecated Utilisez le champ `cadreJuridiqueURL` à la place. */
  cadreJuridiqueUrl?: Maybe<Scalars['String']['output']>;
  /** Date de la création. */
  dateCreation: Scalars['ISO8601DateTime']['output'];
  /** Date de la dépublication. */
  dateDepublication?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date de la dernière modification. */
  dateDerniereModification: Scalars['ISO8601DateTime']['output'];
  /** Date de la fermeture. */
  dateFermeture?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date de la publication. */
  datePublication?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Pour une démarche déclarative, état cible des dossiers à valider automatiquement */
  declarative?: Maybe<DossierDeclarativeState>;
  /** fichier contenant le cadre juridique */
  deliberation?: Maybe<File>;
  /** URL pour commencer la démarche */
  demarcheURL?: Maybe<Scalars['URL']['output']>;
  /** @deprecated Utilisez le champ `demarcheURL` à la place. */
  demarcheUrl?: Maybe<Scalars['URL']['output']>;
  /** Description de la démarche. */
  description: Scalars['String']['output'];
  /** URL ou email pour contacter le Délégué à la Protection des Données (DPO) */
  dpoURL?: Maybe<Scalars['String']['output']>;
  /** @deprecated Utilisez le champ `dpoURL` à la place. */
  dpoUrl?: Maybe<Scalars['String']['output']>;
  /** Durée de conservation des dossiers en mois. */
  dureeConservationDossiers: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  logo?: Maybe<File>;
  /** notice explicative de la démarche */
  notice?: Maybe<File>;
  noticeURL?: Maybe<Scalars['URL']['output']>;
  /** @deprecated Utilisez le champ `noticeURL` à la place. */
  noticeUrl?: Maybe<Scalars['URL']['output']>;
  /** Numero de la démarche. */
  number: Scalars['Int']['output'];
  opendata: Scalars['Boolean']['output'];
  revision: Revision;
  service?: Maybe<Service>;
  /** URL où les usagers trouvent le lien vers la démarche */
  siteWebURL?: Maybe<Scalars['String']['output']>;
  /** @deprecated Utilisez le champ `siteWebURL` à la place. */
  siteWebUrl?: Maybe<Scalars['String']['output']>;
  /** État de la démarche. */
  state: DemarcheState;
  /** mots ou expressions attribués à la démarche pour décrire son contenu et la retrouver */
  tags: Array<Scalars['String']['output']>;
  /** Titre de la démarche. */
  title: Scalars['String']['output'];
  /** ministère(s) ou collectivité(s) qui mettent en oeuvre la démarche */
  zones: Array<Scalars['String']['output']>;
};

export enum DemarcheState {
  /** Brouillon */
  Brouillon = 'brouillon',
  /** Close */
  Close = 'close',
  /** Dépubliée */
  Depubliee = 'depubliee',
  /** Publiée */
  Publiee = 'publiee'
}

export type Departement = {
  __typename?: 'Departement';
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type DepartementChamp = Champ & {
  __typename?: 'DepartementChamp';
  departement?: Maybe<Departement>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type DepartementChampDescriptor = ChampDescriptor & {
  __typename?: 'DepartementChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** List des departements. */
  options?: Maybe<Array<Departement>>;
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type DgfipChampDescriptor = ChampDescriptor & {
  __typename?: 'DgfipChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

/** Represents direct upload credentials */
export type DirectUpload = {
  __typename?: 'DirectUpload';
  /** Created blob record ID */
  blobId: Scalars['ID']['output'];
  /** HTTP request headers (JSON-encoded) */
  headers: Scalars['String']['output'];
  /** Created blob record signed ID */
  signedBlobId: Scalars['ID']['output'];
  /** Upload URL */
  url: Scalars['String']['output'];
};

/** Un dossier */
export type Dossier = {
  __typename?: 'Dossier';
  annotations: Array<Champ>;
  archived: Scalars['Boolean']['output'];
  /** L’URL de l’attestation au format PDF. */
  attestation?: Maybe<File>;
  avis: Array<Avis>;
  champs: Array<Champ>;
  connectionUsager: ConnectionUsager;
  /** Date de dépôt. */
  dateDepot: Scalars['ISO8601DateTime']['output'];
  /** Date de la dernière demande de correction qui n’a pas encore été traitée par l’usager. */
  dateDerniereCorrectionEnAttente?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date de la dernière modification. */
  dateDerniereModification: Scalars['ISO8601DateTime']['output'];
  /** Date d’expiration. */
  dateExpiration?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date du dernier passage en construction. */
  datePassageEnConstruction: Scalars['ISO8601DateTime']['output'];
  /** Date du dernier passage en instruction. */
  datePassageEnInstruction?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date prévisionnelle de décision automatique par le SVA/SVR. */
  datePrevisionnelleDecisionSVASVR?: Maybe<Scalars['ISO8601Date']['output']>;
  /** Date de la suppression par l’administration. */
  dateSuppressionParAdministration?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date de la suppression par l’usager. */
  dateSuppressionParUsager?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date du dernier traitement. */
  dateTraitement?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Date du traitement automatique par le SVA/SVR. */
  dateTraitementSVASVR?: Maybe<Scalars['ISO8601DateTime']['output']>;
  demandeur: Demandeur;
  demarche: DemarcheDescriptor;
  /** L’URL du GeoJSON contenant les données cartographiques du dossier. */
  geojson?: Maybe<File>;
  groupeInstructeur: GroupeInstructeur;
  id: Scalars['ID']['output'];
  instructeurs: Array<Profile>;
  messages: Array<Message>;
  motivation?: Maybe<Scalars['String']['output']>;
  motivationAttachment?: Maybe<File>;
  /** Le numero du dossier. */
  number: Scalars['Int']['output'];
  /** L’URL du dossier au format PDF. */
  pdf?: Maybe<File>;
  prefilled: Scalars['Boolean']['output'];
  /** @deprecated Utilisez le champ `demarche.revision` à la place. */
  revision: Revision;
  /** L’état du dossier. */
  state: DossierState;
  traitements: Array<Traitement>;
  /** Profile de l'usager déposant le dossier */
  usager: Profile;
};


/** Un dossier */
export type DossierAnnotationsArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


/** Un dossier */
export type DossierAvisArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


/** Un dossier */
export type DossierChampsArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


/** Un dossier */
export type DossierMessagesArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

/** Autogenerated input type of DossierAccepter */
export type DossierAccepterInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Désactiver l’envoi de l’email de notification après l’opération */
  disableNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui prend la décision sur le dossier. */
  instructeurId: Scalars['ID']['input'];
  justificatif?: InputMaybe<Scalars['ID']['input']>;
  motivation?: InputMaybe<Scalars['String']['input']>;
};

/** Autogenerated return type of DossierAccepter. */
export type DossierAccepterPayload = {
  __typename?: 'DossierAccepterPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierArchiver */
export type DossierArchiverInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui prend la décision sur le dossier. */
  instructeurId: Scalars['ID']['input'];
};

/** Autogenerated return type of DossierArchiver. */
export type DossierArchiverPayload = {
  __typename?: 'DossierArchiverPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierChangerGroupeInstructeur */
export type DossierChangerGroupeInstructeurInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Group instructeur a affecter */
  groupeInstructeurId: Scalars['ID']['input'];
};

/** Autogenerated return type of DossierChangerGroupeInstructeur. */
export type DossierChangerGroupeInstructeurPayload = {
  __typename?: 'DossierChangerGroupeInstructeurPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierClasserSansSuite */
export type DossierClasserSansSuiteInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Désactiver l’envoi de l’email de notification après l’opération */
  disableNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui prend la décision sur le dossier. */
  instructeurId: Scalars['ID']['input'];
  justificatif?: InputMaybe<Scalars['ID']['input']>;
  motivation: Scalars['String']['input'];
};

/** Autogenerated return type of DossierClasserSansSuite. */
export type DossierClasserSansSuitePayload = {
  __typename?: 'DossierClasserSansSuitePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

/** The connection type for Dossier. */
export type DossierConnection = {
  __typename?: 'DossierConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<DossierEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<Dossier>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export enum DossierDeclarativeState {
  /** Accepté */
  Accepte = 'accepte',
  /** En instruction */
  EnInstruction = 'en_instruction'
}

/** An edge in a connection. */
export type DossierEdge = {
  __typename?: 'DossierEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node?: Maybe<Dossier>;
};

/** Autogenerated input type of DossierEnvoyerMessage */
export type DossierEnvoyerMessageInput = {
  attachment?: InputMaybe<Scalars['ID']['input']>;
  body: Scalars['String']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Préciser qu’il s’agit d’une demande de correction. Le dossier repasssera en construction. */
  correction?: InputMaybe<CorrectionReason>;
  dossierId: Scalars['ID']['input'];
  instructeurId: Scalars['ID']['input'];
};

/** Autogenerated return type of DossierEnvoyerMessage. */
export type DossierEnvoyerMessagePayload = {
  __typename?: 'DossierEnvoyerMessagePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
  message?: Maybe<Message>;
};

export type DossierLinkChamp = Champ & {
  __typename?: 'DossierLinkChamp';
  dossier?: Maybe<Dossier>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type DossierLinkChampDescriptor = ChampDescriptor & {
  __typename?: 'DossierLinkChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

/** Autogenerated input type of DossierModifierAnnotationAjouterLigne */
export type DossierModifierAnnotationAjouterLigneInput = {
  /** Annotation ID */
  annotationId: Scalars['ID']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui demande la modification. */
  instructeurId: Scalars['ID']['input'];
};

/** Autogenerated return type of DossierModifierAnnotationAjouterLigne. */
export type DossierModifierAnnotationAjouterLignePayload = {
  __typename?: 'DossierModifierAnnotationAjouterLignePayload';
  annotation?: Maybe<RepetitionChamp>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierModifierAnnotationCheckbox */
export type DossierModifierAnnotationCheckboxInput = {
  /** Annotation ID */
  annotationId: Scalars['ID']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui demande la modification. */
  instructeurId: Scalars['ID']['input'];
  value: Scalars['Boolean']['input'];
};

/** Autogenerated return type of DossierModifierAnnotationCheckbox. */
export type DossierModifierAnnotationCheckboxPayload = {
  __typename?: 'DossierModifierAnnotationCheckboxPayload';
  annotation?: Maybe<Champ>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierModifierAnnotationDate */
export type DossierModifierAnnotationDateInput = {
  /** Annotation ID */
  annotationId: Scalars['ID']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui demande la modification. */
  instructeurId: Scalars['ID']['input'];
  value: Scalars['ISO8601Date']['input'];
};

/** Autogenerated return type of DossierModifierAnnotationDate. */
export type DossierModifierAnnotationDatePayload = {
  __typename?: 'DossierModifierAnnotationDatePayload';
  annotation?: Maybe<Champ>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierModifierAnnotationDatetime */
export type DossierModifierAnnotationDatetimeInput = {
  /** Annotation ID */
  annotationId: Scalars['ID']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui demande la modification. */
  instructeurId: Scalars['ID']['input'];
  value: Scalars['ISO8601DateTime']['input'];
};

/** Autogenerated return type of DossierModifierAnnotationDatetime. */
export type DossierModifierAnnotationDatetimePayload = {
  __typename?: 'DossierModifierAnnotationDatetimePayload';
  annotation?: Maybe<Champ>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierModifierAnnotationIntegerNumber */
export type DossierModifierAnnotationIntegerNumberInput = {
  /** Annotation ID */
  annotationId: Scalars['ID']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui demande la modification. */
  instructeurId: Scalars['ID']['input'];
  value: Scalars['Int']['input'];
};

/** Autogenerated return type of DossierModifierAnnotationIntegerNumber. */
export type DossierModifierAnnotationIntegerNumberPayload = {
  __typename?: 'DossierModifierAnnotationIntegerNumberPayload';
  annotation?: Maybe<Champ>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierModifierAnnotationText */
export type DossierModifierAnnotationTextInput = {
  /** Annotation ID */
  annotationId: Scalars['ID']['input'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui demande la modification. */
  instructeurId: Scalars['ID']['input'];
  value: Scalars['String']['input'];
};

/** Autogenerated return type of DossierModifierAnnotationText. */
export type DossierModifierAnnotationTextPayload = {
  __typename?: 'DossierModifierAnnotationTextPayload';
  annotation?: Maybe<Champ>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierPasserEnInstruction */
export type DossierPasserEnInstructionInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Désactiver l’envoi de l’email de notification après l’opération */
  disableNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui prend la décision sur le dossier. */
  instructeurId: Scalars['ID']['input'];
};

/** Autogenerated return type of DossierPasserEnInstruction. */
export type DossierPasserEnInstructionPayload = {
  __typename?: 'DossierPasserEnInstructionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierRefuser */
export type DossierRefuserInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Désactiver l’envoi de l’email de notification après l’opération */
  disableNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui prend la décision sur le dossier. */
  instructeurId: Scalars['ID']['input'];
  justificatif?: InputMaybe<Scalars['ID']['input']>;
  motivation: Scalars['String']['input'];
};

/** Autogenerated return type of DossierRefuser. */
export type DossierRefuserPayload = {
  __typename?: 'DossierRefuserPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierRepasserEnConstruction */
export type DossierRepasserEnConstructionInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Désactiver l’envoi de l’email de notification après l’opération */
  disableNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui prend la décision sur le dossier. */
  instructeurId: Scalars['ID']['input'];
};

/** Autogenerated return type of DossierRepasserEnConstruction. */
export type DossierRepasserEnConstructionPayload = {
  __typename?: 'DossierRepasserEnConstructionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

/** Autogenerated input type of DossierRepasserEnInstruction */
export type DossierRepasserEnInstructionInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Désactiver l’envoi de l’email de notification après l’opération */
  disableNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** Dossier ID */
  dossierId: Scalars['ID']['input'];
  /** Instructeur qui prend la décision sur le dossier. */
  instructeurId: Scalars['ID']['input'];
};

/** Autogenerated return type of DossierRepasserEnInstruction. */
export type DossierRepasserEnInstructionPayload = {
  __typename?: 'DossierRepasserEnInstructionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  dossier?: Maybe<Dossier>;
  errors?: Maybe<Array<ValidationError>>;
};

export enum DossierState {
  /** Accepté */
  Accepte = 'accepte',
  /** En construction */
  EnConstruction = 'en_construction',
  /** En instruction */
  EnInstruction = 'en_instruction',
  /** Refusé */
  Refuse = 'refuse',
  /** Classé sans suite */
  SansSuite = 'sans_suite'
}

export type DropDownListChampDescriptor = ChampDescriptor & {
  __typename?: 'DropDownListChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** List des options d’un champ avec selection. */
  options?: Maybe<Array<Scalars['String']['output']>>;
  /** La selection contien l’option "Autre". */
  otherOption?: Maybe<Scalars['Boolean']['output']>;
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Effectif = {
  __typename?: 'Effectif';
  nb: Scalars['Float']['output'];
  periode: Scalars['String']['output'];
};

export type EmailChampDescriptor = ChampDescriptor & {
  __typename?: 'EmailChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type EngagementJuridique = {
  __typename?: 'EngagementJuridique';
  montantEngage?: Maybe<Scalars['String']['output']>;
  montantPaye?: Maybe<Scalars['String']['output']>;
};

export type EngagementJuridiqueChamp = Champ & {
  __typename?: 'EngagementJuridiqueChamp';
  /** Montant engagé et payé de l'EJ. */
  engagementJuridique?: Maybe<EngagementJuridique>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type EngagementJuridiqueChampDescriptor = ChampDescriptor & {
  __typename?: 'EngagementJuridiqueChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Entreprise = {
  __typename?: 'Entreprise';
  attestationFiscaleAttachment?: Maybe<File>;
  attestationSocialeAttachment?: Maybe<File>;
  /** capital social de l’entreprise. -1 si inconnu. */
  capitalSocial?: Maybe<Scalars['BigInt']['output']>;
  codeEffectifEntreprise?: Maybe<Scalars['String']['output']>;
  dateCreation?: Maybe<Scalars['ISO8601Date']['output']>;
  /** effectif moyen d’une année */
  effectifAnnuel?: Maybe<Effectif>;
  /** effectif pour un mois donné */
  effectifMensuel?: Maybe<Effectif>;
  enseigne?: Maybe<Scalars['String']['output']>;
  etatAdministratif?: Maybe<EntrepriseEtatAdministratif>;
  formeJuridique?: Maybe<Scalars['String']['output']>;
  formeJuridiqueCode?: Maybe<Scalars['String']['output']>;
  inlineAdresse: Scalars['String']['output'];
  nom?: Maybe<Scalars['String']['output']>;
  nomCommercial: Scalars['String']['output'];
  numeroTvaIntracommunautaire?: Maybe<Scalars['String']['output']>;
  prenom?: Maybe<Scalars['String']['output']>;
  raisonSociale: Scalars['String']['output'];
  siren: Scalars['String']['output'];
  siretSiegeSocial: Scalars['String']['output'];
};

export enum EntrepriseEtatAdministratif {
  /** L'entreprise est en activité */
  Actif = 'Actif',
  /** L'entreprise a cessé son activité */
  Ferme = 'Ferme'
}

export type Epci = {
  __typename?: 'Epci';
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type EpciChamp = Champ & {
  __typename?: 'EpciChamp';
  departement?: Maybe<Departement>;
  epci?: Maybe<Epci>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type EpciChampDescriptor = ChampDescriptor & {
  __typename?: 'EpciChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type ExplicationChampDescriptor = ChampDescriptor & {
  __typename?: 'ExplicationChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  collapsibleExplanationEnabled?: Maybe<Scalars['Boolean']['output']>;
  collapsibleExplanationText?: Maybe<Scalars['String']['output']>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type ExpressionReguliereChampDescriptor = ChampDescriptor & {
  __typename?: 'ExpressionReguliereChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type File = {
  __typename?: 'File';
  /** @deprecated Utilisez le champ `byteSizeBigInt` à la place. */
  byteSize: Scalars['Int']['output'];
  byteSizeBigInt: Scalars['BigInt']['output'];
  checksum: Scalars['String']['output'];
  contentType: Scalars['String']['output'];
  /** Date de création du fichier. */
  createdAt: Scalars['ISO8601DateTime']['output'];
  filename: Scalars['String']['output'];
  url: Scalars['URL']['output'];
};

export type FindDemarcheInput = {
  /** ID de la démarche. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Numero de la démarche. */
  number?: InputMaybe<Scalars['Int']['input']>;
};

export type GeoArea = {
  description?: Maybe<Scalars['String']['output']>;
  geometry: GeoJson;
  id: Scalars['ID']['output'];
  source: GeoAreaSource;
};

export enum GeoAreaSource {
  /** Parcelle cadastrale */
  Cadastre = 'cadastre',
  /** Sélection utilisateur */
  SelectionUtilisateur = 'selection_utilisateur'
}

export type GeoJson = {
  __typename?: 'GeoJSON';
  coordinates: Scalars['Coordinates']['output'];
  type: Scalars['String']['output'];
};

/** Un groupe instructeur */
export type GroupeInstructeur = {
  __typename?: 'GroupeInstructeur';
  /** L’état du groupe instructeur. */
  closed: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  instructeurs: Array<Profile>;
  /** Libellé du groupe instructeur. */
  label: Scalars['String']['output'];
  /** Le numero du groupe instructeur. */
  number: Scalars['Int']['output'];
};

/** Autogenerated input type of GroupeInstructeurAjouterInstructeurs */
export type GroupeInstructeurAjouterInstructeursInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Groupe instructeur ID. */
  groupeInstructeurId: Scalars['ID']['input'];
  /** Instructeurs à ajouter. */
  instructeurs: Array<ProfileInput>;
};

/** Autogenerated return type of GroupeInstructeurAjouterInstructeurs. */
export type GroupeInstructeurAjouterInstructeursPayload = {
  __typename?: 'GroupeInstructeurAjouterInstructeursPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
  groupeInstructeur?: Maybe<GroupeInstructeur>;
  warnings?: Maybe<Array<WarningMessage>>;
};

/** Attributs pour l’ajout d'un groupe instructeur. */
export type GroupeInstructeurAttributes = {
  /** L’état du groupe instructeur. */
  closed?: InputMaybe<Scalars['Boolean']['input']>;
  /** Instructeurs à ajouter. */
  instructeurs?: InputMaybe<Array<ProfileInput>>;
  /** Libelle du groupe instructeur. */
  label: Scalars['String']['input'];
};

/** Autogenerated input type of GroupeInstructeurCreer */
export type GroupeInstructeurCreerInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Demarche ID ou numéro. */
  demarche: FindDemarcheInput;
  /** Groupes instructeur à ajouter. */
  groupeInstructeur: GroupeInstructeurAttributes;
};

/** Autogenerated return type of GroupeInstructeurCreer. */
export type GroupeInstructeurCreerPayload = {
  __typename?: 'GroupeInstructeurCreerPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
  groupeInstructeur?: Maybe<GroupeInstructeur>;
  warnings?: Maybe<Array<WarningMessage>>;
};

/** Autogenerated input type of GroupeInstructeurModifier */
export type GroupeInstructeurModifierInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** L’état du groupe instructeur. */
  closed?: InputMaybe<Scalars['Boolean']['input']>;
  /** Groupe instructeur ID. */
  groupeInstructeurId: Scalars['ID']['input'];
  /** Libellé du groupe instructeur. */
  label?: InputMaybe<Scalars['String']['input']>;
};

/** Autogenerated return type of GroupeInstructeurModifier. */
export type GroupeInstructeurModifierPayload = {
  __typename?: 'GroupeInstructeurModifierPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
  groupeInstructeur?: Maybe<GroupeInstructeur>;
};

/** Autogenerated input type of GroupeInstructeurSupprimerInstructeurs */
export type GroupeInstructeurSupprimerInstructeursInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Groupe instructeur ID. */
  groupeInstructeurId: Scalars['ID']['input'];
  /** Instructeurs à supprimer. */
  instructeurs: Array<ProfileInput>;
};

/** Autogenerated return type of GroupeInstructeurSupprimerInstructeurs. */
export type GroupeInstructeurSupprimerInstructeursPayload = {
  __typename?: 'GroupeInstructeurSupprimerInstructeursPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  errors?: Maybe<Array<ValidationError>>;
  groupeInstructeur?: Maybe<GroupeInstructeur>;
};

/** Un groupe instructeur avec ses dossiers */
export type GroupeInstructeurWithDossiers = {
  __typename?: 'GroupeInstructeurWithDossiers';
  /** L’état du groupe instructeur. */
  closed: Scalars['Boolean']['output'];
  /** Liste de tous les dossiers supprimés d’un groupe instructeur. */
  deletedDossiers: DeletedDossierConnection;
  /** Liste de tous les dossiers d’un groupe instructeur. */
  dossiers: DossierConnection;
  id: Scalars['ID']['output'];
  instructeurs: Array<Profile>;
  /** Libellé du groupe instructeur. */
  label: Scalars['String']['output'];
  /** Le numero du groupe instructeur. */
  number: Scalars['Int']['output'];
  /** Liste de tous les dossiers en attente de suppression définitive d’un groupe instructeur. */
  pendingDeletedDossiers: DeletedDossierConnection;
};


/** Un groupe instructeur avec ses dossiers */
export type GroupeInstructeurWithDossiersDeletedDossiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  deletedSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Un groupe instructeur avec ses dossiers */
export type GroupeInstructeurWithDossiersDossiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  createdSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  maxRevision?: InputMaybe<Scalars['ID']['input']>;
  minRevision?: InputMaybe<Scalars['ID']['input']>;
  revision?: InputMaybe<Scalars['ID']['input']>;
  state?: InputMaybe<DossierState>;
  updatedSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
};


/** Un groupe instructeur avec ses dossiers */
export type GroupeInstructeurWithDossiersPendingDeletedDossiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  deletedSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type HeaderSectionChampDescriptor = ChampDescriptor & {
  __typename?: 'HeaderSectionChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type IbanChampDescriptor = ChampDescriptor & {
  __typename?: 'IbanChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type IntegerNumberChamp = Champ & {
  __typename?: 'IntegerNumberChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
  value?: Maybe<Scalars['BigInt']['output']>;
};

export type IntegerNumberChampDescriptor = ChampDescriptor & {
  __typename?: 'IntegerNumberChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type LinkedDropDownListChamp = Champ & {
  __typename?: 'LinkedDropDownListChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  primaryValue?: Maybe<Scalars['String']['output']>;
  secondaryValue?: Maybe<Scalars['String']['output']>;
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type LinkedDropDownListChampDescriptor = ChampDescriptor & {
  __typename?: 'LinkedDropDownListChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** List des options d’un champ avec selection. */
  options?: Maybe<Array<Scalars['String']['output']>>;
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type MesriChampDescriptor = ChampDescriptor & {
  __typename?: 'MesriChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Message = {
  __typename?: 'Message';
  /** @deprecated Utilisez le champ `attachments` à la place. */
  attachment?: Maybe<File>;
  attachments: Array<File>;
  body: Scalars['String']['output'];
  correction?: Maybe<Correction>;
  createdAt: Scalars['ISO8601DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type MultipleDropDownListChamp = Champ & {
  __typename?: 'MultipleDropDownListChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
  values: Array<Scalars['String']['output']>;
};

export type MultipleDropDownListChampDescriptor = ChampDescriptor & {
  __typename?: 'MultipleDropDownListChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** List des options d’un champ avec selection. */
  options?: Maybe<Array<Scalars['String']['output']>>;
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** File information required to prepare a direct upload */
  createDirectUpload?: Maybe<CreateDirectUploadPayload>;
  /** Cloner une démarche. */
  demarcheCloner?: Maybe<DemarcheClonerPayload>;
  /** Accepter le dossier. */
  dossierAccepter?: Maybe<DossierAccepterPayload>;
  /** Archiver le dossier. */
  dossierArchiver?: Maybe<DossierArchiverPayload>;
  /** Changer le grope instructeur du dossier. */
  dossierChangerGroupeInstructeur?: Maybe<DossierChangerGroupeInstructeurPayload>;
  /** Classer le dossier sans suite. */
  dossierClasserSansSuite?: Maybe<DossierClasserSansSuitePayload>;
  /** Envoyer un message à l'usager du dossier. */
  dossierEnvoyerMessage?: Maybe<DossierEnvoyerMessagePayload>;
  dossierModifierAnnotationAjouterLigne?: Maybe<DossierModifierAnnotationAjouterLignePayload>;
  /** Modifier l’annotation au format oui/non. */
  dossierModifierAnnotationCheckbox?: Maybe<DossierModifierAnnotationCheckboxPayload>;
  /** Modifier l’annotation au format date. */
  dossierModifierAnnotationDate?: Maybe<DossierModifierAnnotationDatePayload>;
  /** Modifier l’annotation au format date et heure. */
  dossierModifierAnnotationDatetime?: Maybe<DossierModifierAnnotationDatetimePayload>;
  /** Modifier l’annotation au format nombre entier. */
  dossierModifierAnnotationIntegerNumber?: Maybe<DossierModifierAnnotationIntegerNumberPayload>;
  /** Modifier l’annotation au format text. */
  dossierModifierAnnotationText?: Maybe<DossierModifierAnnotationTextPayload>;
  /** Passer le dossier en instruction. */
  dossierPasserEnInstruction?: Maybe<DossierPasserEnInstructionPayload>;
  /** Refuser le dossier. */
  dossierRefuser?: Maybe<DossierRefuserPayload>;
  /** Re-passer le dossier en construction. */
  dossierRepasserEnConstruction?: Maybe<DossierRepasserEnConstructionPayload>;
  /** Re-passer le dossier en instruction. */
  dossierRepasserEnInstruction?: Maybe<DossierRepasserEnInstructionPayload>;
  /** Ajouter des instructeurs à un groupe instructeur. */
  groupeInstructeurAjouterInstructeurs?: Maybe<GroupeInstructeurAjouterInstructeursPayload>;
  /** Crée un groupe instructeur. */
  groupeInstructeurCreer?: Maybe<GroupeInstructeurCreerPayload>;
  /** Modifier un groupe instructeur. */
  groupeInstructeurModifier?: Maybe<GroupeInstructeurModifierPayload>;
  /** Supprimer des instructeurs d’un groupe instructeur. */
  groupeInstructeurSupprimerInstructeurs?: Maybe<GroupeInstructeurSupprimerInstructeursPayload>;
};


export type MutationCreateDirectUploadArgs = {
  input: CreateDirectUploadInput;
};


export type MutationDemarcheClonerArgs = {
  input: DemarcheClonerInput;
};


export type MutationDossierAccepterArgs = {
  input: DossierAccepterInput;
};


export type MutationDossierArchiverArgs = {
  input: DossierArchiverInput;
};


export type MutationDossierChangerGroupeInstructeurArgs = {
  input: DossierChangerGroupeInstructeurInput;
};


export type MutationDossierClasserSansSuiteArgs = {
  input: DossierClasserSansSuiteInput;
};


export type MutationDossierEnvoyerMessageArgs = {
  input: DossierEnvoyerMessageInput;
};


export type MutationDossierModifierAnnotationAjouterLigneArgs = {
  input: DossierModifierAnnotationAjouterLigneInput;
};


export type MutationDossierModifierAnnotationCheckboxArgs = {
  input: DossierModifierAnnotationCheckboxInput;
};


export type MutationDossierModifierAnnotationDateArgs = {
  input: DossierModifierAnnotationDateInput;
};


export type MutationDossierModifierAnnotationDatetimeArgs = {
  input: DossierModifierAnnotationDatetimeInput;
};


export type MutationDossierModifierAnnotationIntegerNumberArgs = {
  input: DossierModifierAnnotationIntegerNumberInput;
};


export type MutationDossierModifierAnnotationTextArgs = {
  input: DossierModifierAnnotationTextInput;
};


export type MutationDossierPasserEnInstructionArgs = {
  input: DossierPasserEnInstructionInput;
};


export type MutationDossierRefuserArgs = {
  input: DossierRefuserInput;
};


export type MutationDossierRepasserEnConstructionArgs = {
  input: DossierRepasserEnConstructionInput;
};


export type MutationDossierRepasserEnInstructionArgs = {
  input: DossierRepasserEnInstructionInput;
};


export type MutationGroupeInstructeurAjouterInstructeursArgs = {
  input: GroupeInstructeurAjouterInstructeursInput;
};


export type MutationGroupeInstructeurCreerArgs = {
  input: GroupeInstructeurCreerInput;
};


export type MutationGroupeInstructeurModifierArgs = {
  input: GroupeInstructeurModifierInput;
};


export type MutationGroupeInstructeurSupprimerInstructeursArgs = {
  input: GroupeInstructeurSupprimerInstructeursInput;
};

export type NumberChampDescriptor = ChampDescriptor & {
  __typename?: 'NumberChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export enum Order {
  /** L’ordre ascendant. */
  Asc = 'ASC',
  /** L’ordre descendant. */
  Desc = 'DESC'
}

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type ParcelleCadastrale = GeoArea & {
  __typename?: 'ParcelleCadastrale';
  /** @deprecated Utilisez le champ `prefixe` à la place. */
  codeArr: Scalars['String']['output'];
  /** @deprecated Utilisez le champ `commune` à la place. */
  codeCom: Scalars['String']['output'];
  /** @deprecated Utilisez le champ `commune` à la place. */
  codeDep: Scalars['String']['output'];
  commune: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** @deprecated L’information n’est plus disponible. */
  feuille: Scalars['Int']['output'];
  geometry: GeoJson;
  id: Scalars['ID']['output'];
  /** @deprecated Utilisez le champ `commune` à la place. */
  nomCom: Scalars['String']['output'];
  numero: Scalars['String']['output'];
  prefixe: Scalars['String']['output'];
  section: Scalars['String']['output'];
  source: GeoAreaSource;
  surface: Scalars['String']['output'];
  /** @deprecated L’information n’est plus disponible. */
  surfaceIntersection: Scalars['Float']['output'];
  /** @deprecated Utilisez le champ `surface` à la place. */
  surfaceParcelle: Scalars['Float']['output'];
};

export type Pays = {
  __typename?: 'Pays';
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type PaysChamp = Champ & {
  __typename?: 'PaysChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  pays?: Maybe<Pays>;
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type PaysChampDescriptor = ChampDescriptor & {
  __typename?: 'PaysChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** List des pays. */
  options?: Maybe<Array<Pays>>;
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type PersonneMorale = Demandeur & {
  __typename?: 'PersonneMorale';
  address: Address;
  /** @deprecated Utilisez le champ `address.label` à la place. */
  adresse: Scalars['String']['output'];
  association?: Maybe<Association>;
  /** @deprecated Utilisez le champ `address.city_code` à la place. */
  codeInseeLocalite: Scalars['String']['output'];
  /** @deprecated Utilisez le champ `address.postal_code` à la place. */
  codePostal: Scalars['String']['output'];
  /** @deprecated Utilisez le champ `address` à la place. */
  complementAdresse?: Maybe<Scalars['String']['output']>;
  entreprise?: Maybe<Entreprise>;
  id: Scalars['ID']['output'];
  libelleNaf: Scalars['String']['output'];
  /** @deprecated Utilisez le champ `address.city_name` à la place. */
  localite: Scalars['String']['output'];
  naf?: Maybe<Scalars['String']['output']>;
  /** @deprecated Utilisez le champ `address.street_name` à la place. */
  nomVoie?: Maybe<Scalars['String']['output']>;
  /** @deprecated Utilisez le champ `address.street_number` à la place. */
  numeroVoie?: Maybe<Scalars['String']['output']>;
  siegeSocial: Scalars['Boolean']['output'];
  siret: Scalars['String']['output'];
  /** @deprecated Utilisez le champ `address.street_address` à la place. */
  typeVoie?: Maybe<Scalars['String']['output']>;
};

export type PersonneMoraleIncomplete = Demandeur & {
  __typename?: 'PersonneMoraleIncomplete';
  id: Scalars['ID']['output'];
  siret: Scalars['String']['output'];
};

export type PersonnePhysique = Demandeur & {
  __typename?: 'PersonnePhysique';
  civilite?: Maybe<Civilite>;
  dateDeNaissance?: Maybe<Scalars['ISO8601Date']['output']>;
  id: Scalars['ID']['output'];
  nom: Scalars['String']['output'];
  prenom: Scalars['String']['output'];
};

export type PhoneChampDescriptor = ChampDescriptor & {
  __typename?: 'PhoneChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type PieceJustificativeChamp = Champ & {
  __typename?: 'PieceJustificativeChamp';
  /** @deprecated Utilisez le champ `files` à la place. */
  file?: Maybe<File>;
  files: Array<File>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type PieceJustificativeChampDescriptor = ChampDescriptor & {
  __typename?: 'PieceJustificativeChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  /** Modèle de la pièce justificative. */
  fileTemplate?: Maybe<File>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type PoleEmploiChampDescriptor = ChampDescriptor & {
  __typename?: 'PoleEmploiChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

/** Profil d'un usager connecté (déposant un dossier, instruisant un dossier...) */
export type Profile = {
  __typename?: 'Profile';
  /** Email de l'usager */
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type ProfileInput = {
  /** Email */
  email?: InputMaybe<Scalars['String']['input']>;
  /** ID */
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Query = {
  __typename?: 'Query';
  /** Informations concernant une démarche. */
  demarche: Demarche;
  demarcheDescriptor?: Maybe<DemarcheDescriptor>;
  /** Informations sur un dossier d’une démarche. */
  dossier: Dossier;
  /** Informations sur un groupe instructeur. */
  groupeInstructeur: GroupeInstructeurWithDossiers;
};


export type QueryDemarcheArgs = {
  number: Scalars['Int']['input'];
};


export type QueryDemarcheDescriptorArgs = {
  demarche: FindDemarcheInput;
};


export type QueryDossierArgs = {
  number: Scalars['Int']['input'];
};


export type QueryGroupeInstructeurArgs = {
  number: Scalars['Int']['input'];
};

export type RnaChampDescriptor = ChampDescriptor & {
  __typename?: 'RNAChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Rnf = {
  __typename?: 'RNF';
  address?: Maybe<Address>;
  id: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
};

export type RnfChamp = Champ & {
  __typename?: 'RNFChamp';
  commune?: Maybe<Commune>;
  departement?: Maybe<Departement>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  rnf?: Maybe<Rnf>;
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type RnfChampDescriptor = ChampDescriptor & {
  __typename?: 'RNFChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Region = {
  __typename?: 'Region';
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type RegionChamp = Champ & {
  __typename?: 'RegionChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  region?: Maybe<Region>;
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type RegionChampDescriptor = ChampDescriptor & {
  __typename?: 'RegionChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** List des regions. */
  options?: Maybe<Array<Region>>;
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type RepetitionChamp = Champ & {
  __typename?: 'RepetitionChamp';
  /** @deprecated Utilisez le champ `rows` à la place. */
  champs: Array<Champ>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  rows: Array<Row>;
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type RepetitionChampDescriptor = ChampDescriptor & {
  __typename?: 'RepetitionChampDescriptor';
  /** Description des champs d’un bloc répétable. */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type Revision = {
  __typename?: 'Revision';
  annotationDescriptors: Array<ChampDescriptor>;
  champDescriptors: Array<ChampDescriptor>;
  /** Date de la création. */
  dateCreation: Scalars['ISO8601DateTime']['output'];
  /** Date de la publication. */
  datePublication?: Maybe<Scalars['ISO8601DateTime']['output']>;
  id: Scalars['ID']['output'];
};

export type Row = {
  __typename?: 'Row';
  champs: Array<Champ>;
  id: Scalars['ID']['output'];
};

export type SelectionUtilisateur = GeoArea & {
  __typename?: 'SelectionUtilisateur';
  description?: Maybe<Scalars['String']['output']>;
  geometry: GeoJson;
  id: Scalars['ID']['output'];
  source: GeoAreaSource;
};

export type Service = {
  __typename?: 'Service';
  id: Scalars['ID']['output'];
  /** nom du service qui met en oeuvre la démarche */
  nom: Scalars['String']['output'];
  /** nom de l'organisme qui met en oeuvre la démarche */
  organisme: Scalars['String']['output'];
  /** n° siret du service qui met en oeuvre la démarche */
  siret?: Maybe<Scalars['String']['output']>;
  /** type d'organisme qui met en oeuvre la démarche */
  typeOrganisme: TypeOrganisme;
};

export type SiretChamp = Champ & {
  __typename?: 'SiretChamp';
  etablissement?: Maybe<PersonneMorale>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type SiretChampDescriptor = ChampDescriptor & {
  __typename?: 'SiretChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type TextChamp = Champ & {
  __typename?: 'TextChamp';
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
  value?: Maybe<Scalars['String']['output']>;
};

export type TextChampDescriptor = ChampDescriptor & {
  __typename?: 'TextChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type TextareaChampDescriptor = ChampDescriptor & {
  __typename?: 'TextareaChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export type TitreIdentiteChamp = Champ & {
  __typename?: 'TitreIdentiteChamp';
  filled: Scalars['Boolean']['output'];
  grantType: TitreIdentiteGrantType;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  prefilled: Scalars['Boolean']['output'];
  /** La valeur du champ sous forme texte. */
  stringValue?: Maybe<Scalars['String']['output']>;
  /** Date de dernière modification du champ. */
  updatedAt: Scalars['ISO8601DateTime']['output'];
};

export type TitreIdentiteChampDescriptor = ChampDescriptor & {
  __typename?: 'TitreIdentiteChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

export enum TitreIdentiteGrantType {
  /** Françe Connect */
  FranceConnect = 'france_connect',
  /** Pièce justificative */
  PieceJustificative = 'piece_justificative'
}

export type Traitement = {
  __typename?: 'Traitement';
  dateTraitement: Scalars['ISO8601DateTime']['output'];
  emailAgentTraitant?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  motivation?: Maybe<Scalars['String']['output']>;
  state: DossierState;
};

export enum TypeDeChamp {
  /** Adresse */
  Address = 'address',
  /** Annuaire de l’éducation */
  AnnuaireEducation = 'annuaire_education',
  /** Carte */
  Carte = 'carte',
  /** Case à cocher seule */
  Checkbox = 'checkbox',
  /** Civilité */
  Civilite = 'civilite',
  /** Données de la Caisse nationale des allocations familiales */
  Cnaf = 'cnaf',
  /** Accréditation Paris 2024 */
  Cojo = 'cojo',
  /** Communes */
  Communes = 'communes',
  /** Date */
  Date = 'date',
  /** Date et Heure */
  Datetime = 'datetime',
  /** Nombre décimal */
  DecimalNumber = 'decimal_number',
  /** Départements */
  Departements = 'departements',
  /** Données de la Direction générale des Finances publiques */
  Dgfip = 'dgfip',
  /** Lien vers un autre dossier */
  DossierLink = 'dossier_link',
  /** Choix simple */
  DropDownList = 'drop_down_list',
  /** Adresse électronique */
  Email = 'email',
  /** Translation missing: fr.activerecord.attributes.type_de_champ.type_champs.engagement_juridique */
  EngagementJuridique = 'engagement_juridique',
  /** EPCI */
  Epci = 'epci',
  /** Explication */
  Explication = 'explication',
  /** Expression régulière */
  ExpressionReguliere = 'expression_reguliere',
  /** Numéro FINESS */
  Finess = 'finess',
  /** Titre de section */
  HeaderSection = 'header_section',
  /** Numéro Iban */
  Iban = 'iban',
  /** Nombre entier */
  IntegerNumber = 'integer_number',
  /** Deux menus déroulants liés */
  LinkedDropDownList = 'linked_drop_down_list',
  /** Données du Ministère de l'Enseignement Supérieur, de la Recherche et de l'Innovation */
  Mesri = 'mesri',
  /** Choix multiple */
  MultipleDropDownList = 'multiple_drop_down_list',
  /** Numéro de sécurité sociale */
  Nir = 'nir',
  /** Nombre */
  Number = 'number',
  /** Pays */
  Pays = 'pays',
  /** Téléphone */
  Phone = 'phone',
  /** Pièce justificative */
  PieceJustificative = 'piece_justificative',
  /** Situation Pôle emploi */
  PoleEmploi = 'pole_emploi',
  /** Régions */
  Regions = 'regions',
  /** Bloc répétable */
  Repetition = 'repetition',
  /** RNA (Répertoire national des associations) */
  Rna = 'rna',
  /** RNF (Répertoire national des fondations) */
  Rnf = 'rnf',
  /** Numéro RPPS */
  Rppsante = 'rppsante',
  /** Numéro Siret */
  Siret = 'siret',
  /** Texte court */
  Text = 'text',
  /** Texte long */
  Textarea = 'textarea',
  /** Titre identité */
  TitreIdentite = 'titre_identite',
  /** Oui/Non */
  YesNo = 'yes_no'
}

export enum TypeOrganisme {
  /** Administration centrale */
  AdministrationCentrale = 'administration_centrale',
  /** Association */
  Association = 'association',
  /** Autre */
  Autre = 'autre',
  /** Collectivité territoriale */
  CollectiviteTerritoriale = 'collectivite_territoriale',
  /** Établissement d’enseignement */
  EtablissementEnseignement = 'etablissement_enseignement',
  /** Opérateur d’État */
  OperateurDEtat = 'operateur_d_etat',
  /** Service déconcentré de l’État */
  ServiceDeconcentreDeLEtat = 'service_deconcentre_de_l_etat'
}

/** Éreur de validation */
export type ValidationError = {
  __typename?: 'ValidationError';
  /** A description of the error */
  message: Scalars['String']['output'];
};

/** Message d’alerte */
export type WarningMessage = {
  __typename?: 'WarningMessage';
  /** La description de l’alerte */
  message: Scalars['String']['output'];
};

export type YesNoChampDescriptor = ChampDescriptor & {
  __typename?: 'YesNoChampDescriptor';
  /**
   * Description des champs d’un bloc répétable.
   * @deprecated Utilisez le champ `RepetitionChampDescriptor.champ_descriptors` à la place.
   */
  champDescriptors?: Maybe<Array<ChampDescriptor>>;
  /** Description du champ. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Libellé du champ. */
  label: Scalars['String']['output'];
  /** Est-ce que le champ est obligatoire ? */
  required: Scalars['Boolean']['output'];
  /**
   * Type de la valeur du champ.
   * @deprecated Utilisez le champ `__typename` à la place.
   */
  type: TypeDeChamp;
};

type RootChampFragment_AddressChamp_Fragment = { __typename?: 'AddressChamp', id: string, label: string, stringValue?: string | null, address?: { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null } | null };

type RootChampFragment_CarteChamp_Fragment = { __typename?: 'CarteChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_CheckboxChamp_Fragment = { __typename?: 'CheckboxChamp', id: string, label: string, stringValue?: string | null, checked: boolean };

type RootChampFragment_CiviliteChamp_Fragment = { __typename?: 'CiviliteChamp', id: string, label: string, stringValue?: string | null, civilite?: Civilite | null };

type RootChampFragment_CommuneChamp_Fragment = { __typename?: 'CommuneChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_DateChamp_Fragment = { __typename?: 'DateChamp', date?: string | null, id: string, label: string, stringValue?: string | null };

type RootChampFragment_DatetimeChamp_Fragment = { __typename?: 'DatetimeChamp', datetime?: string | null, id: string, label: string, stringValue?: string | null };

type RootChampFragment_DecimalNumberChamp_Fragment = { __typename?: 'DecimalNumberChamp', id: string, label: string, stringValue?: string | null, decimalNumber?: number | null };

type RootChampFragment_DepartementChamp_Fragment = { __typename?: 'DepartementChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_DossierLinkChamp_Fragment = { __typename?: 'DossierLinkChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_EngagementJuridiqueChamp_Fragment = { __typename?: 'EngagementJuridiqueChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_EpciChamp_Fragment = { __typename?: 'EpciChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_IntegerNumberChamp_Fragment = { __typename?: 'IntegerNumberChamp', id: string, label: string, stringValue?: string | null, integerNumber?: bigint | null };

type RootChampFragment_LinkedDropDownListChamp_Fragment = { __typename?: 'LinkedDropDownListChamp', primaryValue?: string | null, secondaryValue?: string | null, id: string, label: string, stringValue?: string | null };

type RootChampFragment_MultipleDropDownListChamp_Fragment = { __typename?: 'MultipleDropDownListChamp', values: Array<string>, id: string, label: string, stringValue?: string | null };

type RootChampFragment_PaysChamp_Fragment = { __typename?: 'PaysChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_PieceJustificativeChamp_Fragment = { __typename?: 'PieceJustificativeChamp', id: string, label: string, stringValue?: string | null, files: Array<{ __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint }> };

type RootChampFragment_RnfChamp_Fragment = { __typename?: 'RNFChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_RegionChamp_Fragment = { __typename?: 'RegionChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_RepetitionChamp_Fragment = { __typename?: 'RepetitionChamp', id: string, label: string, stringValue?: string | null, champs: Array<{ __typename?: 'AddressChamp', id: string, label: string, stringValue?: string | null, address?: { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null } | null } | { __typename?: 'CarteChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'CheckboxChamp', id: string, label: string, stringValue?: string | null, checked: boolean } | { __typename?: 'CiviliteChamp', id: string, label: string, stringValue?: string | null, civilite?: Civilite | null } | { __typename?: 'CommuneChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'DateChamp', date?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'DatetimeChamp', datetime?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'DecimalNumberChamp', id: string, label: string, stringValue?: string | null, decimalNumber?: number | null } | { __typename?: 'DepartementChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'DossierLinkChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'EngagementJuridiqueChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'EpciChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'IntegerNumberChamp', id: string, label: string, stringValue?: string | null, integerNumber?: bigint | null } | { __typename?: 'LinkedDropDownListChamp', primaryValue?: string | null, secondaryValue?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'MultipleDropDownListChamp', values: Array<string>, id: string, label: string, stringValue?: string | null } | { __typename?: 'PaysChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'PieceJustificativeChamp', id: string, label: string, stringValue?: string | null, files: Array<{ __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint }> } | { __typename?: 'RNFChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'RegionChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'RepetitionChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'SiretChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'TextChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'TitreIdentiteChamp', id: string, label: string, stringValue?: string | null }> };

type RootChampFragment_SiretChamp_Fragment = { __typename?: 'SiretChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_TextChamp_Fragment = { __typename?: 'TextChamp', id: string, label: string, stringValue?: string | null };

type RootChampFragment_TitreIdentiteChamp_Fragment = { __typename?: 'TitreIdentiteChamp', id: string, label: string, stringValue?: string | null };

export type RootChampFragmentFragment = RootChampFragment_AddressChamp_Fragment | RootChampFragment_CarteChamp_Fragment | RootChampFragment_CheckboxChamp_Fragment | RootChampFragment_CiviliteChamp_Fragment | RootChampFragment_CommuneChamp_Fragment | RootChampFragment_DateChamp_Fragment | RootChampFragment_DatetimeChamp_Fragment | RootChampFragment_DecimalNumberChamp_Fragment | RootChampFragment_DepartementChamp_Fragment | RootChampFragment_DossierLinkChamp_Fragment | RootChampFragment_EngagementJuridiqueChamp_Fragment | RootChampFragment_EpciChamp_Fragment | RootChampFragment_IntegerNumberChamp_Fragment | RootChampFragment_LinkedDropDownListChamp_Fragment | RootChampFragment_MultipleDropDownListChamp_Fragment | RootChampFragment_PaysChamp_Fragment | RootChampFragment_PieceJustificativeChamp_Fragment | RootChampFragment_RnfChamp_Fragment | RootChampFragment_RegionChamp_Fragment | RootChampFragment_RepetitionChamp_Fragment | RootChampFragment_SiretChamp_Fragment | RootChampFragment_TextChamp_Fragment | RootChampFragment_TitreIdentiteChamp_Fragment;

export type AddressFragmentFragment = { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null };

export type FileFragmentFragment = { __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint };

type ChampFragment_AddressChamp_Fragment = { __typename?: 'AddressChamp', id: string, label: string, stringValue?: string | null, address?: { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null } | null };

type ChampFragment_CarteChamp_Fragment = { __typename?: 'CarteChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_CheckboxChamp_Fragment = { __typename?: 'CheckboxChamp', id: string, label: string, stringValue?: string | null, checked: boolean };

type ChampFragment_CiviliteChamp_Fragment = { __typename?: 'CiviliteChamp', id: string, label: string, stringValue?: string | null, civilite?: Civilite | null };

type ChampFragment_CommuneChamp_Fragment = { __typename?: 'CommuneChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_DateChamp_Fragment = { __typename?: 'DateChamp', date?: string | null, id: string, label: string, stringValue?: string | null };

type ChampFragment_DatetimeChamp_Fragment = { __typename?: 'DatetimeChamp', datetime?: string | null, id: string, label: string, stringValue?: string | null };

type ChampFragment_DecimalNumberChamp_Fragment = { __typename?: 'DecimalNumberChamp', id: string, label: string, stringValue?: string | null, decimalNumber?: number | null };

type ChampFragment_DepartementChamp_Fragment = { __typename?: 'DepartementChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_DossierLinkChamp_Fragment = { __typename?: 'DossierLinkChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_EngagementJuridiqueChamp_Fragment = { __typename?: 'EngagementJuridiqueChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_EpciChamp_Fragment = { __typename?: 'EpciChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_IntegerNumberChamp_Fragment = { __typename?: 'IntegerNumberChamp', id: string, label: string, stringValue?: string | null, integerNumber?: bigint | null };

type ChampFragment_LinkedDropDownListChamp_Fragment = { __typename?: 'LinkedDropDownListChamp', primaryValue?: string | null, secondaryValue?: string | null, id: string, label: string, stringValue?: string | null };

type ChampFragment_MultipleDropDownListChamp_Fragment = { __typename?: 'MultipleDropDownListChamp', values: Array<string>, id: string, label: string, stringValue?: string | null };

type ChampFragment_PaysChamp_Fragment = { __typename?: 'PaysChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_PieceJustificativeChamp_Fragment = { __typename?: 'PieceJustificativeChamp', id: string, label: string, stringValue?: string | null, files: Array<{ __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint }> };

type ChampFragment_RnfChamp_Fragment = { __typename?: 'RNFChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_RegionChamp_Fragment = { __typename?: 'RegionChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_RepetitionChamp_Fragment = { __typename?: 'RepetitionChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_SiretChamp_Fragment = { __typename?: 'SiretChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_TextChamp_Fragment = { __typename?: 'TextChamp', id: string, label: string, stringValue?: string | null };

type ChampFragment_TitreIdentiteChamp_Fragment = { __typename?: 'TitreIdentiteChamp', id: string, label: string, stringValue?: string | null };

export type ChampFragmentFragment = ChampFragment_AddressChamp_Fragment | ChampFragment_CarteChamp_Fragment | ChampFragment_CheckboxChamp_Fragment | ChampFragment_CiviliteChamp_Fragment | ChampFragment_CommuneChamp_Fragment | ChampFragment_DateChamp_Fragment | ChampFragment_DatetimeChamp_Fragment | ChampFragment_DecimalNumberChamp_Fragment | ChampFragment_DepartementChamp_Fragment | ChampFragment_DossierLinkChamp_Fragment | ChampFragment_EngagementJuridiqueChamp_Fragment | ChampFragment_EpciChamp_Fragment | ChampFragment_IntegerNumberChamp_Fragment | ChampFragment_LinkedDropDownListChamp_Fragment | ChampFragment_MultipleDropDownListChamp_Fragment | ChampFragment_PaysChamp_Fragment | ChampFragment_PieceJustificativeChamp_Fragment | ChampFragment_RnfChamp_Fragment | ChampFragment_RegionChamp_Fragment | ChampFragment_RepetitionChamp_Fragment | ChampFragment_SiretChamp_Fragment | ChampFragment_TextChamp_Fragment | ChampFragment_TitreIdentiteChamp_Fragment;

export type GetDossiersMetadataQueryVariables = Exact<{
  demarcheNumber: Scalars['Int']['input'];
}>;


export type GetDossiersMetadataQuery = { __typename?: 'Query', demarche: { __typename?: 'Demarche', dossiers: { __typename?: 'DossierConnection', edges?: Array<{ __typename?: 'DossierEdge', node?: { __typename?: 'Dossier', id: string, number: number, dateDerniereModification: string, dateDepot: string, champs: Array<{ __typename: 'AddressChamp', id: string, label: string, stringValue?: string | null, address?: { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null } | null } | { __typename: 'CarteChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'CheckboxChamp', id: string, label: string, stringValue?: string | null, checked: boolean } | { __typename: 'CiviliteChamp', id: string, label: string, stringValue?: string | null, civilite?: Civilite | null } | { __typename: 'CommuneChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'DateChamp', date?: string | null, id: string, label: string, stringValue?: string | null } | { __typename: 'DatetimeChamp', datetime?: string | null, id: string, label: string, stringValue?: string | null } | { __typename: 'DecimalNumberChamp', id: string, label: string, stringValue?: string | null, decimalNumber?: number | null } | { __typename: 'DepartementChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'DossierLinkChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'EngagementJuridiqueChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'EpciChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'IntegerNumberChamp', id: string, label: string, stringValue?: string | null, integerNumber?: bigint | null } | { __typename: 'LinkedDropDownListChamp', primaryValue?: string | null, secondaryValue?: string | null, id: string, label: string, stringValue?: string | null } | { __typename: 'MultipleDropDownListChamp', values: Array<string>, id: string, label: string, stringValue?: string | null } | { __typename: 'PaysChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'PieceJustificativeChamp', id: string, label: string, stringValue?: string | null, files: Array<{ __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint }> } | { __typename: 'RNFChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'RegionChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'RepetitionChamp', id: string, label: string, stringValue?: string | null, champs: Array<{ __typename?: 'AddressChamp', id: string, label: string, stringValue?: string | null, address?: { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null } | null } | { __typename?: 'CarteChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'CheckboxChamp', id: string, label: string, stringValue?: string | null, checked: boolean } | { __typename?: 'CiviliteChamp', id: string, label: string, stringValue?: string | null, civilite?: Civilite | null } | { __typename?: 'CommuneChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'DateChamp', date?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'DatetimeChamp', datetime?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'DecimalNumberChamp', id: string, label: string, stringValue?: string | null, decimalNumber?: number | null } | { __typename?: 'DepartementChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'DossierLinkChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'EngagementJuridiqueChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'EpciChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'IntegerNumberChamp', id: string, label: string, stringValue?: string | null, integerNumber?: bigint | null } | { __typename?: 'LinkedDropDownListChamp', primaryValue?: string | null, secondaryValue?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'MultipleDropDownListChamp', values: Array<string>, id: string, label: string, stringValue?: string | null } | { __typename?: 'PaysChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'PieceJustificativeChamp', id: string, label: string, stringValue?: string | null, files: Array<{ __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint }> } | { __typename?: 'RNFChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'RegionChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'RepetitionChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'SiretChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'TextChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'TitreIdentiteChamp', id: string, label: string, stringValue?: string | null }> } | { __typename: 'SiretChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'TextChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'TitreIdentiteChamp', id: string, label: string, stringValue?: string | null }> } | null } | null> | null } } };

export type GetDossiersByDateQueryVariables = Exact<{
  demarcheNumber: Scalars['Int']['input'];
  createdSince?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
}>;


export type GetDossiersByDateQuery = { __typename?: 'Query', demarche: { __typename?: 'Demarche', dossiers: { __typename?: 'DossierConnection', nodes?: Array<{ __typename?: 'Dossier', id: string, number: number, dateDepot: string, dateDerniereModification: string, state: DossierState } | null> | null } } };

export type GetDossierQueryVariables = Exact<{
  dossierNumber: Scalars['Int']['input'];
}>;


export type GetDossierQuery = { __typename?: 'Query', dossier: { __typename?: 'Dossier', id: string, number: number, state: DossierState, dateDerniereModification: string, dateDepot: string, usager: { __typename?: 'Profile', email: string }, demandeur: { __typename: 'PersonneMorale' } | { __typename: 'PersonneMoraleIncomplete' } | { __typename: 'PersonnePhysique', nom: string, prenom: string, civilite?: Civilite | null }, champs: Array<{ __typename: 'AddressChamp', id: string, label: string, stringValue?: string | null, address?: { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null } | null } | { __typename: 'CarteChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'CheckboxChamp', id: string, label: string, stringValue?: string | null, checked: boolean } | { __typename: 'CiviliteChamp', id: string, label: string, stringValue?: string | null, civilite?: Civilite | null } | { __typename: 'CommuneChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'DateChamp', date?: string | null, id: string, label: string, stringValue?: string | null } | { __typename: 'DatetimeChamp', datetime?: string | null, id: string, label: string, stringValue?: string | null } | { __typename: 'DecimalNumberChamp', id: string, label: string, stringValue?: string | null, decimalNumber?: number | null } | { __typename: 'DepartementChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'DossierLinkChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'EngagementJuridiqueChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'EpciChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'IntegerNumberChamp', id: string, label: string, stringValue?: string | null, integerNumber?: bigint | null } | { __typename: 'LinkedDropDownListChamp', primaryValue?: string | null, secondaryValue?: string | null, id: string, label: string, stringValue?: string | null } | { __typename: 'MultipleDropDownListChamp', values: Array<string>, id: string, label: string, stringValue?: string | null } | { __typename: 'PaysChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'PieceJustificativeChamp', id: string, label: string, stringValue?: string | null, files: Array<{ __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint }> } | { __typename: 'RNFChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'RegionChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'RepetitionChamp', id: string, label: string, stringValue?: string | null, champs: Array<{ __typename?: 'AddressChamp', id: string, label: string, stringValue?: string | null, address?: { __typename?: 'Address', label: string, type: AddressType, streetAddress?: string | null, streetNumber?: string | null, streetName?: string | null, postalCode: string, cityName: string, cityCode: string, departmentName?: string | null, departmentCode?: string | null, regionName?: string | null, regionCode?: string | null } | null } | { __typename?: 'CarteChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'CheckboxChamp', id: string, label: string, stringValue?: string | null, checked: boolean } | { __typename?: 'CiviliteChamp', id: string, label: string, stringValue?: string | null, civilite?: Civilite | null } | { __typename?: 'CommuneChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'DateChamp', date?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'DatetimeChamp', datetime?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'DecimalNumberChamp', id: string, label: string, stringValue?: string | null, decimalNumber?: number | null } | { __typename?: 'DepartementChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'DossierLinkChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'EngagementJuridiqueChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'EpciChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'IntegerNumberChamp', id: string, label: string, stringValue?: string | null, integerNumber?: bigint | null } | { __typename?: 'LinkedDropDownListChamp', primaryValue?: string | null, secondaryValue?: string | null, id: string, label: string, stringValue?: string | null } | { __typename?: 'MultipleDropDownListChamp', values: Array<string>, id: string, label: string, stringValue?: string | null } | { __typename?: 'PaysChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'PieceJustificativeChamp', id: string, label: string, stringValue?: string | null, files: Array<{ __typename: 'File', filename: string, contentType: string, checksum: string, url: string, createdAt: string, byteSize: bigint }> } | { __typename?: 'RNFChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'RegionChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'RepetitionChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'SiretChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'TextChamp', id: string, label: string, stringValue?: string | null } | { __typename?: 'TitreIdentiteChamp', id: string, label: string, stringValue?: string | null }> } | { __typename: 'SiretChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'TextChamp', id: string, label: string, stringValue?: string | null } | { __typename: 'TitreIdentiteChamp', id: string, label: string, stringValue?: string | null }> } };

export const FileFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FileFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"File"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"checksum"}},{"kind":"Field","alias":{"kind":"Name","value":"byteSize"},"name":{"kind":"Name","value":"byteSizeBigInt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<FileFragmentFragment, unknown>;
export const AddressFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AddressFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Address"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"streetAddress"}},{"kind":"Field","name":{"kind":"Name","value":"streetNumber"}},{"kind":"Field","name":{"kind":"Name","value":"streetName"}},{"kind":"Field","name":{"kind":"Name","value":"postalCode"}},{"kind":"Field","name":{"kind":"Name","value":"cityName"}},{"kind":"Field","name":{"kind":"Name","value":"cityCode"}},{"kind":"Field","name":{"kind":"Name","value":"departmentName"}},{"kind":"Field","name":{"kind":"Name","value":"departmentCode"}},{"kind":"Field","name":{"kind":"Name","value":"regionName"}},{"kind":"Field","name":{"kind":"Name","value":"regionCode"}}]}}]} as unknown as DocumentNode<AddressFragmentFragment, unknown>;
export const ChampFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChampFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Champ"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"stringValue"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DateChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DatetimeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"datetime"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CheckboxChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"checked"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DecimalNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"decimalNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntegerNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"integerNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CiviliteChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"civilite"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LinkedDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"primaryValue"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MultipleDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"values"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PieceJustificativeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FileFragment"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddressChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AddressFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FileFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"File"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"checksum"}},{"kind":"Field","alias":{"kind":"Name","value":"byteSize"},"name":{"kind":"Name","value":"byteSizeBigInt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AddressFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Address"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"streetAddress"}},{"kind":"Field","name":{"kind":"Name","value":"streetNumber"}},{"kind":"Field","name":{"kind":"Name","value":"streetName"}},{"kind":"Field","name":{"kind":"Name","value":"postalCode"}},{"kind":"Field","name":{"kind":"Name","value":"cityName"}},{"kind":"Field","name":{"kind":"Name","value":"cityCode"}},{"kind":"Field","name":{"kind":"Name","value":"departmentName"}},{"kind":"Field","name":{"kind":"Name","value":"departmentCode"}},{"kind":"Field","name":{"kind":"Name","value":"regionName"}},{"kind":"Field","name":{"kind":"Name","value":"regionCode"}}]}}]} as unknown as DocumentNode<ChampFragmentFragment, unknown>;
export const RootChampFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RootChampFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Champ"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChampFragment"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RepetitionChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"champs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChampFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FileFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"File"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"checksum"}},{"kind":"Field","alias":{"kind":"Name","value":"byteSize"},"name":{"kind":"Name","value":"byteSizeBigInt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AddressFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Address"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"streetAddress"}},{"kind":"Field","name":{"kind":"Name","value":"streetNumber"}},{"kind":"Field","name":{"kind":"Name","value":"streetName"}},{"kind":"Field","name":{"kind":"Name","value":"postalCode"}},{"kind":"Field","name":{"kind":"Name","value":"cityName"}},{"kind":"Field","name":{"kind":"Name","value":"cityCode"}},{"kind":"Field","name":{"kind":"Name","value":"departmentName"}},{"kind":"Field","name":{"kind":"Name","value":"departmentCode"}},{"kind":"Field","name":{"kind":"Name","value":"regionName"}},{"kind":"Field","name":{"kind":"Name","value":"regionCode"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChampFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Champ"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"stringValue"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DateChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DatetimeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"datetime"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CheckboxChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"checked"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DecimalNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"decimalNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntegerNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"integerNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CiviliteChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"civilite"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LinkedDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"primaryValue"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MultipleDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"values"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PieceJustificativeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FileFragment"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddressChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AddressFragment"}}]}}]}}]}}]} as unknown as DocumentNode<RootChampFragmentFragment, unknown>;
export const GetDossiersMetadataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getDossiersMetadata"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"demarcheNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"demarche"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"demarcheNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dossiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"dateDerniereModification"}},{"kind":"Field","name":{"kind":"Name","value":"dateDepot"}},{"kind":"Field","name":{"kind":"Name","value":"champs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RootChampFragment"}}]}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FileFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"File"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"checksum"}},{"kind":"Field","alias":{"kind":"Name","value":"byteSize"},"name":{"kind":"Name","value":"byteSizeBigInt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AddressFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Address"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"streetAddress"}},{"kind":"Field","name":{"kind":"Name","value":"streetNumber"}},{"kind":"Field","name":{"kind":"Name","value":"streetName"}},{"kind":"Field","name":{"kind":"Name","value":"postalCode"}},{"kind":"Field","name":{"kind":"Name","value":"cityName"}},{"kind":"Field","name":{"kind":"Name","value":"cityCode"}},{"kind":"Field","name":{"kind":"Name","value":"departmentName"}},{"kind":"Field","name":{"kind":"Name","value":"departmentCode"}},{"kind":"Field","name":{"kind":"Name","value":"regionName"}},{"kind":"Field","name":{"kind":"Name","value":"regionCode"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChampFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Champ"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"stringValue"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DateChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DatetimeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"datetime"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CheckboxChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"checked"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DecimalNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"decimalNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntegerNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"integerNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CiviliteChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"civilite"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LinkedDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"primaryValue"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MultipleDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"values"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PieceJustificativeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FileFragment"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddressChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AddressFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RootChampFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Champ"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChampFragment"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RepetitionChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"champs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChampFragment"}}]}}]}}]}}]} as unknown as DocumentNode<GetDossiersMetadataQuery, GetDossiersMetadataQueryVariables>;
export const GetDossiersByDateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getDossiersByDate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"demarcheNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"createdSince"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ISO8601DateTime"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"demarche"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"demarcheNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dossiers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"createdSince"},"value":{"kind":"Variable","name":{"kind":"Name","value":"createdSince"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"dateDepot"}},{"kind":"Field","name":{"kind":"Name","value":"dateDerniereModification"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetDossiersByDateQuery, GetDossiersByDateQueryVariables>;
export const GetDossierDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getDossier"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dossierNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dossier"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dossierNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"dateDerniereModification"}},{"kind":"Field","name":{"kind":"Name","value":"dateDepot"}},{"kind":"Field","name":{"kind":"Name","value":"usager"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"demandeur"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonnePhysique"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nom"}},{"kind":"Field","name":{"kind":"Name","value":"prenom"}},{"kind":"Field","name":{"kind":"Name","value":"civilite"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"champs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RootChampFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FileFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"File"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"checksum"}},{"kind":"Field","alias":{"kind":"Name","value":"byteSize"},"name":{"kind":"Name","value":"byteSizeBigInt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AddressFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Address"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"streetAddress"}},{"kind":"Field","name":{"kind":"Name","value":"streetNumber"}},{"kind":"Field","name":{"kind":"Name","value":"streetName"}},{"kind":"Field","name":{"kind":"Name","value":"postalCode"}},{"kind":"Field","name":{"kind":"Name","value":"cityName"}},{"kind":"Field","name":{"kind":"Name","value":"cityCode"}},{"kind":"Field","name":{"kind":"Name","value":"departmentName"}},{"kind":"Field","name":{"kind":"Name","value":"departmentCode"}},{"kind":"Field","name":{"kind":"Name","value":"regionName"}},{"kind":"Field","name":{"kind":"Name","value":"regionCode"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChampFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Champ"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"stringValue"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DateChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DatetimeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"datetime"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CheckboxChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"checked"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DecimalNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"decimalNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntegerNumberChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"integerNumber"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CiviliteChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"civilite"},"name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LinkedDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"primaryValue"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MultipleDropDownListChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"values"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PieceJustificativeChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FileFragment"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AddressChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AddressFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RootChampFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Champ"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChampFragment"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RepetitionChamp"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"champs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChampFragment"}}]}}]}}]}}]} as unknown as DocumentNode<GetDossierQuery, GetDossierQueryVariables>;