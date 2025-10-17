import {
  throwHTTPException400BadRequest,
  throwHTTPException503ServiceUnavailable,
} from '@sirena/backend-utils/helpers';
import { envVars } from '@/config/env';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import { BundlePractitionerSchema } from './esante.schema';
import type { GetPractionnersParams } from './esante.type';

export const fetchEsanteData = async (route: string, query: Record<string, string>) => {
  const queryParams = new URLSearchParams(query);
  const url = `${envVars.ANNUAIRE_SANTE_API_URL}/${route}${queryParams.size ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'ESANTE-API-KEY': envVars.ANNUAIRE_SANTE_API_KEY,
    },
  });

  if (!response.ok) {
    const logger = getLoggerStore();
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

  try {
    const data = await response.json();
    const bundleResult = BundlePractitionerSchema.safeParse(data);
    return bundleResult.data;
  } catch (error) {
    const logger = getLoggerStore();
    logger.error({ err: error, url }, 'Error parsing data from Esante API');
    throwHTTPException503ServiceUnavailable('Esante service is currently unavailable. Please try again later.');
  }
};

export const getPractionners = async (params: GetPractionnersParams) => {
  const data = await fetchEsanteData('Practitioner', {
    ...params,
    _elements: 'identifier,name,extension,qualification',
  });
  const logger = getLoggerStore();
  logger.info({ data });
  return (
    data?.entry?.flatMap((e) => {
      const resourceName = e.resource?.name?.[0];
      const identifier = e.resource?.identifier?.[0];

      if (!resourceName || !identifier) return [];

      return [
        {
          fullName: resourceName.text || '',
          firstName: resourceName.family || '',
          lastName: resourceName.given?.[0] || '',
          prefix: resourceName.prefix?.[0] || '',
          rpps: identifier.value || '',
        },
      ];
    }) || []
  );
};
