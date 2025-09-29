// src/libs/graffle.ts
/** biome-ignore-all lint/suspicious/noExplicitAny: need to override configuration because we run it on node */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Graffle } from 'graffle';
import { envVars } from '@/config/env';

export {
  AddressType,
  GetDossierDocument,
  GetDossiersByDateDocument,
  GetDossiersMetadataDocument,
  type RootChampFragmentFragment,
} from '../../generated/graphql/graphql';

type TransportInit = { raw?: { signal?: AbortSignal } };

export type GrafflePublic = {
  transport(init?: TransportInit): {
    gql<TData, TVars>(
      doc: TypedDocumentNode<TData, TVars>,
    ): { send(vars: TVars): Promise<TData>; send(): Promise<TData> };
  };
  gql<TData, TVars>(
    doc: TypedDocumentNode<TData, TVars>,
  ): { send(vars: TVars): Promise<TData>; send(): Promise<TData> };
};

const _g = Graffle.create().transport({
  url: envVars.DEMAT_SOCIAL_API_URL,
  headers: { Authorization: `Bearer token=${envVars.DEMAT_SOCIAL_API_TOKEN}` },
});

export const graffle: GrafflePublic = {
  transport(init) {
    const t = (_g as any).transport(init);
    return {
      gql<TData, TVars>(doc: TypedDocumentNode<TData, TVars>) {
        const chain = (t as any).gql(doc);
        return {
          send(vars?: TVars) {
            return chain.send(vars as any) as Promise<TData>;
          },
        };
      },
    };
  },
  gql<TData, TVars>(doc: TypedDocumentNode<TData, TVars>) {
    const chain = (_g as any).gql(doc);
    return {
      send(vars?: TVars) {
        return chain.send(vars as any) as Promise<TData>;
      },
    };
  },
};
