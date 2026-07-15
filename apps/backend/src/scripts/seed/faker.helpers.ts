import { type Faker, fakerFR } from '@faker-js/faker';

/**
 * Returns the shared faker instance, seeded when a deterministic run is asked
 * for (--seed=<n>) so screenshots / e2e stay stable.
 */
export const buildFaker = (seed: number | null): Faker => {
  if (seed !== null) {
    fakerFR.seed(seed);
  }
  return fakerFR;
};

/** Random past date within the last `months` months. */
export const pastDate = (faker: Faker, months: number): Date => faker.date.recent({ days: Math.max(1, months * 30) });

/** French-looking landline/mobile phone number. */
export const phone = (faker: Faker): string => `0${faker.string.numeric(9)}`;

/** 9-digit FINESS-like identifier for establishments. */
export const finess = (faker: Faker): string => faker.string.numeric(9);

/** 11-digit RPPS-like identifier for health professionals. */
export const rpps = (faker: Faker): string => faker.string.numeric(11);

/** Coherent French address block. */
export const address = (faker: Faker) => ({
  label: faker.location.streetAddress(),
  numero: faker.string.numeric({ length: { min: 1, max: 3 } }),
  rue: faker.location.street(),
  codePostal: faker.location.zipCode('#####'),
  ville: faker.location.city(),
});
