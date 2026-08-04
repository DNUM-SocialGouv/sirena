import z from 'zod';

/**
 * Subset of the properties returned by the BAN (Base Adresse Nationale)
 * `/search` endpoint that we actually consume. See:
 * https://www.data.gouv.fr/datasets/base-adresse-nationale
 */
const BanFeaturePropertiesSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  postcode: z.string().optional(),
  citycode: z.string().optional(),
  city: z.string().optional(),
  context: z.string().optional(),
});

export const BanSearchResponseSchema = z.object({
  type: z.literal('FeatureCollection').optional(),
  features: z
    .array(
      z.object({
        properties: BanFeaturePropertiesSchema,
      }),
    )
    .optional(),
});

export const GetAddressesQuerySchema = z.object({
  q: z.string().min(3),
});

export const AddressSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  name: z.string(),
  postcode: z.string(),
  citycode: z.string(),
  city: z.string(),
  context: z.string(),
});

export const GetAddressesResponseSchema = z.array(AddressSchema);
