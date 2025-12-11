import { Chart } from 'cdk8s';
import type { Construct } from 'constructs';
import * as certmanager from '../imports/cert-manager.io';
import * as externalSecrets from '../imports/external-secrets.io';

export class CustomIssuer extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });

    new externalSecrets.ExternalSecret(this, 'certificate-issuer-secret', {
      metadata: {
        name: 'certificate-issuer-secret',
      },
      spec: {
        refreshInterval: '1h',
        secretStoreRef: {
          name: 'local-secret-store',
          kind: externalSecrets.ExternalSecretSpecSecretStoreRefKind.SECRET_STORE,
        },
        target: {
          name: 'certificate-issuer-secret',
          creationPolicy: externalSecrets.ExternalSecretSpecTargetCreationPolicy.OWNER,
        },
        dataFrom: [
          {
            extract: {
              key: 'certificats',
              conversionStrategy: externalSecrets.ExternalSecretSpecDataFromExtractConversionStrategy.DEFAULT,
              decodingStrategy: externalSecrets.ExternalSecretSpecDataFromExtractDecodingStrategy.NONE,
              metadataPolicy: externalSecrets.ExternalSecretSpecDataFromExtractMetadataPolicy.NONE,
            },
          },
        ],
      },
    });

    const eabSecretRef: certmanager.IssuerSpecAcmeExternalAccountBindingKeySecretRef = {
      name: 'certificate-issuer-secret',
      key: 'HMacKey',
    };

    const issuerSpecEab: certmanager.IssuerSpecAcmeExternalAccountBinding = {
      keyId: '0B544E15-BFAB-4D20-82C8-E566CED0D2BA',
      keySecretRef: eabSecretRef,
    };

    new certmanager.Issuer(this, 'issuer', {
      metadata: {
        name: 'certigna',
      },
      spec: {
        acme: {
          email: 'dnum-do.certificatssl@sg.social.gouv.fr',
          server: 'https://acme-ov.certigna.com/directory',
          externalAccountBinding: issuerSpecEab,
          privateKeySecretRef: {
            name: 'certificate-issuer-private-key',
          },
          solvers: [
            {
              http01: {
                ingress: {
                  ingressClassName: 'public',
                },
              },
            },
          ],
        },
      },
    });
  }
}
