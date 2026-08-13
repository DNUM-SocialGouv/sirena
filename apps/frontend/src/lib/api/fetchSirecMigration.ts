import { client } from '@/lib/api/hc';
import { HttpError, handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function migrateByReclamations(
  sirecIds: number[],
  deleteIfExists?: boolean,
  migrateFiles?: boolean,
  mockFilePath?: string,
): Promise<{ queued: number }> {
  const res = await client['sirec-migration']['by-reclamations'].$post({
    json: { sirecIds, deleteIfExists, migrateFiles, mockFilePath },
  });
  await handleRequestErrors(res, { silentToastError: res.ok || res.status === 422 });
  if (!res.ok) {
    throw new HttpError(`HTTP ${res.status}`, res.status);
  }
  return res.json();
}

export async function migrateByServices(
  serviceIds: number[],
  deleteIfExists?: boolean,
  migrateFiles?: boolean,
  mockFilePath?: string,
): Promise<{ queued: number; found: number }> {
  const res = await client['sirec-migration']['by-services'].$post({
    json: { serviceIds, deleteIfExists, migrateFiles, mockFilePath },
  });
  await handleRequestErrors(res);
  return res.json();
}
