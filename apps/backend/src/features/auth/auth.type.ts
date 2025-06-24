import type { UserInfoResponse } from 'openid-client';

export type UserInfo = {
  sub: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationUnit: string | null;
  pcData: UserInfoResponse;
};
