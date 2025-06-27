import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function fetchProfile() {
  const res = await client.profile.$get();
  try {
    await handleRequestErrors(res);
  } catch (error) {
    console.log('Error fetching profile:', error);
  }
  const response = await res.json();
  return response.data;
}
