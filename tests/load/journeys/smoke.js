import http from 'k6/http';
import { check } from 'k6';
import { config } from '../lib/config.js';

export function smokeJourney() {
  const res = http.get(`${config.baseUrl}/health`, { tags: { endpoint: 'health' } });
  check(res, {
    'health 200': (r) => r.status === 200,
  });
}
