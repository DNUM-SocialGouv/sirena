export type CreateRequeteFromDematSocialMinimalDto = {
  dematSocialId: number;
  createdAt: Date;
  entiteIds?: string[];
  receptionTypeId?: string;
  receptionDate?: Date;
  commentaire?: string;
};

export type CreateRequeteFromDematSocialDto = {
  dematSocialId: number;
  createdAt: Date;
  entiteIds: string[];
  receptionTypeId: string;
  receptionDate: Date;
  commentaire: string;
};
