import type { Practitioner } from '@/lib/api/fetchPractitioners';

export function formatPractitionerName(practitioner: Practitioner): string {
  const prefix = practitioner.prefix ? `${practitioner.prefix} ` : '';
  return `${prefix}${practitioner.fullName}`;
}
