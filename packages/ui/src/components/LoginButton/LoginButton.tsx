import ProConnectButton from '@codegouvfr/react-dsfr/ProConnectButton';
import { useEffect, useState } from 'react';

export const LoginButton = () => {
  const { VITE_PROCONNECT_DOMAIN, VITE_PROCONNECT_REDIRECT_URI, VITE_PROCONNECT_CLIENT_ID } = import.meta.env;
  const [openIDUrl, setOpenIDUrl] = useState<string>('#');

  useEffect(() => {
    const state = self.crypto.randomUUID();
    const nonce = self.crypto.randomUUID();
    fetch(`https://${VITE_PROCONNECT_DOMAIN}/api/v2/.well-known/openid-configuration`, {}).then((result) => {
      result.json().then(({ authorization_endpoint }) => {
        localStorage.setItem('sendedState', state); // state étant une chaine de caractère pas besoin de faire JSON.stringify
        const url = `${authorization_endpoint}?state=${state}&nonce=${nonce}&redirect_uri=${VITE_PROCONNECT_REDIRECT_URI}&client_id=${VITE_PROCONNECT_CLIENT_ID}&scope=uid+openid+given_name+usual_name+siret+email+organizational_unit&response_type=code`;
        setOpenIDUrl(url);
      });
    });
  }, []);

  return <ProConnectButton url={openIDUrl} />;
};
