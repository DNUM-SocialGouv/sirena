import {
  throwHTTPException400BadRequest,
  throwHTTPException503ServiceUnavailable,
} from '@sirena/backend-utils/helpers';
import type { z } from 'zod';
import { envVars } from '@/config/env';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import { EsanteOrganizationBundleSchema, EsantePractitionerBundleSchema } from './esante.schema';
import type { GetOrganizationsParams, GetPractionnersParams } from './esante.type';

const fetchEsanteData = async <T>(
  route: string,
  query: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<T | undefined> => {
  const logger = getLoggerStore();
  const filteredQuery = Object.fromEntries(Object.entries(query).filter(([, value]) => value != null && value !== ''));
  const queryParams = new URLSearchParams(filteredQuery);
  const queryString = queryParams.toString();
  const url = `${envVars.ANNUAIRE_SANTE_API_URL}/${route}${queryString ? `?${queryString}` : ''}`;

  logger.debug({ url, route, query: filteredQuery }, 'Fetching data from Esante API');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ESANTE-API-KEY': envVars.ANNUAIRE_SANTE_API_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    logger.debug({ status: response.status, url }, 'Received response from Esante API');

    if (!response.ok) {
      if (response.status === 503) {
        logger.warn({ err: response.statusText, url, status: response.status }, 'Error fetching data from Esante API');
        throwHTTPException503ServiceUnavailable('Esante service is currently unavailable. Please try again later.');
      }
      if (response.status === 400) {
        logger.warn({ err: response.statusText, url, status: response.status }, 'Error fetching data from Esante API');
        throwHTTPException400BadRequest('Bad request to Esante API. Please check your parameters.');
      }
      logger.error({ err: response.statusText, url, status: response.status }, 'Error fetching data from Esante API');
      throwHTTPException503ServiceUnavailable('Esante service is currently unavailable. Please try again later.');
    }

    const data = await response.json();
    const bundleResult = schema.safeParse(data);

    if (!bundleResult.success) {
      logger.warn({ errors: bundleResult.error.issues }, 'FHIR schema validation failed');
    } else {
      const entryCount = (bundleResult.data as { entry?: unknown[] })?.entry?.length;
      logger.debug({ entryCount }, 'Parsed Esante API response successfully');
    }

    return bundleResult.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({ url, timeout: 30000 }, 'Esante API request timed out');
      throwHTTPException503ServiceUnavailable('Esante API request timed out. Please try again later.');
    }

    logger.error({ err: error, url }, 'Error parsing data from Esante API');
    throwHTTPException503ServiceUnavailable('Esante service is currently unavailable. Please try again later.');
  }
};

const mapBundleEntries = <TEntry, TResult>(
  data: { entry?: TEntry[] } | undefined,
  mapper: (entry: TEntry) => TResult | undefined,
): TResult[] => {
  return (
    data?.entry?.flatMap((entry) => {
      const result = mapper(entry);
      return result ? [result] : [];
    }) || []
  );
};

export const getPractionners = async (params: GetPractionnersParams) => {
  const data = await fetchEsanteData(
    'Practitioner',
    {
      ...params,
      _elements: 'identifier,name,extension,qualification',
    },
    EsantePractitionerBundleSchema,
  );

  return mapBundleEntries(data, (entry) => {
    const resourceName = entry.resource?.name?.[0];
    const identifier = entry.resource?.identifier?.[0];

    if (!resourceName || !identifier) {
      return undefined;
    }

    return {
      fullName: resourceName.text || '',
      firstName: resourceName.family || '',
      lastName: resourceName.given?.[0] || '',
      prefix: resourceName.prefix?.[0] || '',
      rpps: identifier.value || '',
    };
  });
};

export const getOrganizations = async (params: GetOrganizationsParams) => {
  const data = await fetchEsanteData(
    'Organization',
    {
      ...params,
      _elements: 'identifier,address,name',
    },
    EsanteOrganizationBundleSchema,
  );

  return mapBundleEntries(data, (entry) => {
    const resource = entry.resource;
    const identifier = resource?.identifier?.[0];
    const address = resource?.address?.[0];

    if (!resource?.name || !identifier) {
      return undefined;
    }

    return {
      name: resource.name || '',
      identifier: identifier.value || '',
      addressPostalcode: address?.postalCode || '',
      addressCity: address?.city || '',
    };
  });
};
