const parseJwt = (token: string) => {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
};

export const getLogin = async (
  code: string,
  state: string,
  iss: string,
  baseUrl: string,
  client_id: string,
  client_secret: string,
  redirect_uri: string,
) => {
  // Création d'un URLSearchParams pour encoder les données en application/x-www-form-urlencoded
  const formData = new URLSearchParams();
  formData.append('grant_type', 'authorization_code');
  formData.append('code', code || '');
  formData.append('client_id', client_id || '');
  formData.append('client_secret', client_secret || '');
  formData.append('redirect_uri', redirect_uri || '');

  const result = await fetch(`https://${baseUrl}/api/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });
  const tokens = await result.json();

  return {
    tokens,
    code,
    state,
    iss,
  };
};

export const getLoginInfo = async (jwt: string | undefined, baseUrl: string | undefined) => {
  // Création d'un URLSearchParams pour encoder les données en application/x-www-form-urlencoded
  const result = await fetch(`https://${baseUrl}/api/v2/userinfo`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
  const infos = await result.text();
  return parseJwt(infos);
};
