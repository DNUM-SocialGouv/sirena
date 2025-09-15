import type { UserInfoResponse } from 'openid-client';

export type UserInfo = {
  sub: string;
  uid: string;
  email: string;
  prenom: string;
  nom: string;
  organizationUnit: string | null;
  pcData: UserInfoResponse;
};
