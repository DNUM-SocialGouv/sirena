import type {
  DsMotif,
  entiteTypes,
  LieuType,
  MisEnCauseType,
  MisEnCauseTypePrecisionUnion,
} from '@sirena/common/constants';

export type EntiteAdminType = keyof typeof entiteTypes;

export type SituationContext = {
  lieuType?: LieuType;
  finessCode?: string | null;
  categCode?: string | null;
  tutelle?: string | null;
  postalCode?: string | null;
  misEnCauseType?: MisEnCauseType | null;
  misEnCauseTypePrecision?: MisEnCauseTypePrecisionUnion | null;
  isMaltraitance?: boolean;
  motifsDeclaratifs?: DsMotif[];
};

export type BaseNode = {
  id: string;
  description?: string;
  required?: (keyof SituationContext)[]; // optional: variables that must be defined to evaluate the node, the decision tree will abort if a required variable is not defined
};

export type DecisionLeaf = BaseNode & {
  kind: 'leaf';
  // What entities to add when we're here
  add:
    | EntiteAdminType[]
    | ((ctx: SituationContext) => EntiteAdminType[])
    | ((ctx: SituationContext) => Promise<EntiteAdminType[]>);
  // Optional: continue to another node
  next?: DecisionNode;
};

export type DecisionBranch = BaseNode & {
  kind: 'branch';
  // Predicate to determine which branch to take
  predicate: (ctx: SituationContext) => boolean;
  // What to do if the predicate is true
  ifTrue: DecisionNode;
  ifFalse: DecisionNode;
  // Some branches add entities already (optional)
  addIfTrue?:
    | EntiteAdminType[]
    | ((ctx: SituationContext) => EntiteAdminType[])
    | ((ctx: SituationContext) => Promise<EntiteAdminType[]>);
  addIfFalse?:
    | EntiteAdminType[]
    | ((ctx: SituationContext) => EntiteAdminType[])
    | ((ctx: SituationContext) => Promise<EntiteAdminType[]>);
};

export type DecisionSwitch = BaseNode & {
  kind: 'switch';
  select: (ctx: SituationContext) => string | null;
  cases: Record<string, DecisionNode>;
  default?: DecisionNode;
};

export type DecisionForEach = BaseNode & {
  kind: 'forEach';
  // Extracts the list to iterate from the context
  iterate: (ctx: SituationContext) => unknown[];
  // Creates a new context for each item (optional, defaults to using the original context)
  mapContext?: (ctx: SituationContext, item: unknown, index: number) => SituationContext;
  // The node to apply for each item
  forEach: DecisionNode;
  // Optional: node to apply after all iterations
  after?: DecisionNode;
};

export type DecisionNode = DecisionLeaf | DecisionBranch | DecisionSwitch | DecisionForEach;
