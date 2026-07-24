import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';
import type { QueryParams } from '@/types/pagination.type.ts';

const formatPaginationParams = (query: QueryParams) => ({
  ...query,
  limit: query.limit?.toString(),
  offset: query.offset?.toString(),
});

export async function fetchEntites(id: string | undefined, query: QueryParams = {}) {
  const res = await client.entites[':id?'].$get({
    param: { id },
    query: formatPaginationParams(query),
  });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
}

export async function fetchRootEntitesListAdmin() {
  const res = await client.entites.admin.roots.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return { data };
}

export async function fetchEntitesListAdmin(query: QueryParams = {}) {
  const res = await client.entites.admin.$get({
    query: formatPaginationParams(query),
  });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
}

export async function fetchEntiteAdministrativeAdminLocal() {
  const res = await client.entites.admin.local.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchDirectionsServicesList(query: Pick<QueryParams, 'search'> = {}) {
  const res = await client.entites.admin['directions-services'].$get({
    query: formatPaginationParams(query),
  });

  await handleRequestErrors(res);

  const { data, capabilities, availableDirections = [], serviceParentDirection = null } = await res.json();

  return { data, capabilities, availableDirections, serviceParentDirection };
}

export async function fetchDirectionServiceAdminLocal(id: string) {
  const res = await client.entites.admin['directions-services'][':id'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchEntiteByIdAdmin(id: string) {
  const res = await client.entites.admin[':id'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchEntiteChain(id: string | undefined) {
  const res = await client.entites.chain[':id?'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchEntiteDescendants(id: string) {
  const res = await client.entites.descendants[':id'].$get({ param: { id } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export type EditEntiteAdminInput = {
  nomComplet: string;
  label: string;
  email: string;
  emailContactUsager: string;
  adresseContactUsager: string;
  telContactUsager: string;
  isActive: boolean;
};

export type CreateChildEntiteAdminInput = {
  nomComplet: string;
  label: string;
  email: string;
  emailContactUsager: string;
  adresseContactUsager: string;
  telContactUsager: string;
  isActive: boolean;
};

export type CreateDirectionAdminLocalInput = Omit<CreateChildEntiteAdminInput, 'isActive'>;
export type EditEntiteAdministrativeAdminLocalInput = {
  email: string;
  emailContactUsager: string;
  adresseContactUsager: string;
  telContactUsager: string;
};
export type EditDirectionServiceAdminLocalInput = CreateDirectionAdminLocalInput;
export type CreateServiceAdminLocalInput = CreateDirectionAdminLocalInput & {
  directionId?: string;
};

export async function editEntiteAdministrativeAdminLocal(input: EditEntiteAdministrativeAdminLocalInput) {
  const res = await client.entites.admin.local.$patch({ json: input });
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}

export async function editDirectionServiceAdminLocal(id: string, input: EditDirectionServiceAdminLocalInput) {
  const res = await client.entites.admin['directions-services'][':id'].$patch({
    param: { id },
    json: input,
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function editEntiteAdmin(id: string, input: EditEntiteAdminInput) {
  const res = await client.entites.admin[':id'].$patch({
    param: { id },
    json: input,
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function createChildEntiteAdmin(id: string, input: CreateChildEntiteAdminInput) {
  const res = await client.entites.admin[':id'].children.$post({
    param: { id },
    json: input,
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function createDirectionAdminLocal(input: CreateDirectionAdminLocalInput) {
  const res = await client.entites.admin['directions-services'].directions.$post({
    json: input,
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function createServiceAdminLocal(input: CreateServiceAdminLocalInput) {
  const res = await client.entites.admin['directions-services'].services.$post({
    json: input,
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
