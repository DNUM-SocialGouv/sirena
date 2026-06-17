import { client } from '@/lib/api/hc';
import { HttpError, handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function migrateByReclamations(sirecIds: number[]): Promise<{ queued: number }> {
  const res = await client['sirec-migration']['by-reclamations'].$post({ json: { sirecIds } });
  await handleRequestErrors(res, { silentToastError: true });
  if (!res.ok) {
    throw new HttpError(`HTTP ${res.status}`, res.status);
  }
  return res.json();
}

export async function migrateByServices(serviceIds: number[]): Promise<{ queued: number; found: number }> {
  const res = await client['sirec-migration']['by-services'].$post({ json: { serviceIds } });
  await handleRequestErrors(res);
  return res.json();
}
