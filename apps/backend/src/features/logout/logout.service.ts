const parseJwt = (token: string) => {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
};

export const fullLogoutUrl = async (baseUrl: string, id_token: string, frontendRedirectUrl: string) => {
  const token = id_token.replace('Bearer ', '');
  return `https://${baseUrl}/api/v2/session/end?id_token_hint=${token}&state=logout&post_logout_redirect_uri=${encodeURI(frontendRedirectUrl)}`;
};
