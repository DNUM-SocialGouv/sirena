import * as client from 'openid-client';
import { envVars } from '@/config/env';
import { authorizationParams } from '@/config/openID';
import { getEntiteForUser } from '@/features/entites/entites.service';
import { createUser, getUserBySub } from '@/features/users/users.service';
import type { UserInfo } from './auth.type';

export const configOptions =
  process.env.IS_HTTP_PROTOCOL_FORBIDDEN === 'True' ? undefined : { execute: [client.allowInsecureRequests] };

let providerConfig: client.Configuration | null;

export const getProviderConfig = async () => {
  if (providerConfig) return providerConfig;
  providerConfig = await client.discovery(
    new URL(envVars.PC_DOMAIN),
    envVars.PC_CLIENT_ID,
    {
      id_token_signed_response_alg: envVars.PC_ID_TOKEN_SIGNED_RESPONSE_ALG,
      userinfo_signed_response_alg: envVars.PC_USERINFO_SIGNED_RESPONSE_ALG,
    },
    client.ClientSecretPost(process.env.PC_CLIENT_SECRET),
    configOptions,
  );
  return providerConfig;
};

export const objectToQueryParams = (obj: Record<string, unknown>) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || !value) continue;

    const val = typeof value === 'object' ? JSON.stringify(value) : String(value);

    params.append(key, val);
  }
  return params;
};

export const getTokens = async (currentUrl: URL, nonce: string, state: string) => {
  const config = await getProviderConfig();

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    expectedNonce: nonce,
    expectedState: state,
  });

  return tokens;
};

export const fetchUserInfo = async (access_token: string, claims: client.IDToken) => {
  const config = await getProviderConfig();

  const userInfo = await client.fetchUserInfo(config, access_token, claims.sub);

  return userInfo;
};

export const buildEndSessionUrl = async (id_token_hint: string) => {
  const config = await getProviderConfig();

  const endSessionUrl = client.buildEndSessionUrl(
    config,
    objectToQueryParams({
      id_token_hint,
      post_logout_redirect_uri: envVars.FRONTEND_REDIRECT_LOGIN_URI,
    }),
  );

  return endSessionUrl;
};

export const buildAuthorizationUrl = async () => {
  const config = await getProviderConfig();

  const nonce = client.randomNonce();
  const state = client.randomState();

  const redirectTo = client.buildAuthorizationUrl(
    config,
    objectToQueryParams({ ...authorizationParams, nonce, state }),
  );

  return { redirectTo, nonce, state };
};

export const authorizationCodeGrant = async (currentUrl: URL, state: string, nonce: string) => {
  const config = await getProviderConfig();

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    expectedState: state,
    expectedNonce: nonce,
    idTokenExpected: true,
  });

  return tokens;
};

export const getOrCreateUser = async (userInfo: UserInfo) => {
  const user = await getUserBySub(userInfo.sub);
  if (user) {
    return user;
  }

  const organization = userInfo.organizationUnit?.split('/')?.[0]?.trim() || null;
  const entite = await getEntiteForUser(organization, userInfo.email);

  return await createUser({
    sub: userInfo.sub,
    uid: userInfo.uid,
    email: userInfo.email,
    firstName: userInfo.firstName,
    lastName: userInfo.lastName,
    pcData: userInfo,
    entiteId: entite?.id ?? null,
  });
};
