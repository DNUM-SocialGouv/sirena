import fhir from '@solarahealth/fhir-r4';
import z from 'zod';

const PractitionerSchema = fhir.createPractitionerSchema();
export const BundlePractitionerSchema = fhir.createBundleSchema({ resource: PractitionerSchema });

export const GetPractionnersQuerySchema = z.object({
  fullName: z.string().optional(),
  rpps: z.string().optional(),
});

export const GetPractionnersResponseSchema = z.array(
  z.object({
    fullName: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    prefix: z.string(),
    rpps: z.string(),
  }),
);
