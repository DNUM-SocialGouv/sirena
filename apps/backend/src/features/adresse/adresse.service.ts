import {
  throwHTTPException400BadRequest,
  throwHTTPException503ServiceUnavailable,
} from '@sirena/backend-utils/helpers';
import { HTTPException } from 'hono/http-exception';
import { envVars } from '../../config/env.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { BanSearchResponseSchema } from './adresse.schema.js';
import type { Address } from './adresse.type.js';

const ADDRESS_SEARCH_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 10000;

export const searchAddresses = async (q: string): Promise<Address[]> => {
  const logger = getLoggerStore();
  const queryParams = new URLSearchParams({
    q,
    autocomplete: '1',
    limit: String(ADDRESS_SEARCH_LIMIT),
  });
  const url = `${envVars.ADDRESS_API_URL}/search/?${queryParams.toString()}`;

  logger.debug({ url, q }, 'Fetching data from BAN address API');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 400) {
        logger.warn({ url, status: response.status }, 'Bad request to BAN address API');
        return throwHTTPException400BadRequest('Bad request to address API. Please check your parameters.');
      }
      logger.error({ url, status: response.status }, 'Error response from BAN address API');
      throwHTTPException503ServiceUnavailable('Address service is currently unavailable. Please try again later.');
    }

    const data = await response.json();
    const parsed = BanSearchResponseSchema.safeParse(data);

    if (!parsed.success) {
      logger.error({ errors: parsed.error.issues }, 'BAN address schema validation failed');
      throwHTTPException503ServiceUnavailable(
        'Address service returned an unexpected response. Please try again later.',
      );
    }

    return (parsed.data.features ?? []).flatMap((feature) => {
      const { properties } = feature;
      if (!properties.type || !properties.label) {
        return [];
      }
      return [
        {
          id: properties.id ?? `${properties.type}-${properties.citycode ?? ''}-${properties.label}`,
          label: properties.label,
          type: properties.type,
          name: properties.name ?? '',
          postcode: properties.postcode ?? '',
          citycode: properties.citycode ?? '',
          city: properties.city ?? '',
          context: properties.context ?? '',
        },
      ];
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof HTTPException) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({ url, timeout: REQUEST_TIMEOUT_MS }, 'BAN address API request timed out');
      throwHTTPException503ServiceUnavailable('Address API request timed out. Please try again later.');
    }

    logger.error({ err: error, url }, 'Error fetching data from BAN address API');
    throwHTTPException503ServiceUnavailable('Address service is currently unavailable. Please try again later.');
  }
};
