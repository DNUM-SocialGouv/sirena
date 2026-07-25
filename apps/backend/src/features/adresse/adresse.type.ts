import type { z } from 'zod';
import type { AddressSchema, GetAddressesQuerySchema } from './adresse.schema.js';

export type GetAddressesQuery = z.infer<typeof GetAddressesQuerySchema>;
export type Address = z.infer<typeof AddressSchema>;
