import z from 'zod';

const createFhirBundleSchema = <T extends z.ZodTypeAny>(resourceSchema: T) =>
  z.object({
    resourceType: z.literal('Bundle').optional(),
    entry: z
      .array(
        z.object({
          resource: resourceSchema.optional(),
        }),
      )
      .optional(),
  });

const PractitionerResourceSchema = z.object({
  name: z
    .array(
      z.object({
        text: z.string().optional(),
        family: z.string().optional(),
        given: z.array(z.string()).optional(),
        prefix: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  identifier: z
    .array(
      z.object({
        value: z.string().optional(),
      }),
    )
    .optional(),
});

const OrganizationResourceSchema = z.object({
  name: z.string().optional(),
  identifier: z
    .array(
      z.object({
        value: z.string().optional(),
      }),
    )
    .optional(),
  address: z
    .array(
      z.object({
        postalCode: z.string().optional(),
        city: z.string().optional(),
      }),
    )
    .optional(),
});

export const EsantePractitionerBundleSchema = createFhirBundleSchema(PractitionerResourceSchema);
export const EsanteOrganizationBundleSchema = createFhirBundleSchema(OrganizationResourceSchema);

export const GetPractionnersQuerySchema = z.object({
  fullName: z.string().optional(),
  identifier: z.string().optional(),
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

export const GetOrganizationsQuerySchema = z.object({
  name: z.string().optional(),
  identifier: z.string().optional(),
  addressPostalcode: z.string().optional(),
});

export const GetOrganizationsResponseSchema = z.array(
  z.object({
    name: z.string(),
    identifier: z.string(),
    addressPostalcode: z.string(),
    addressCity: z.string(),
  }),
);
