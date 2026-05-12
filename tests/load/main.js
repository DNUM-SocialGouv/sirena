import { config, assertAuthEnv } from './lib/config.js';
import { smokeJourney } from './journeys/smoke.js';
import { userJourney } from './journeys/userJourney.js';
import { debugJourney } from './journeys/debug.js';

const scenarioDefinitions = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
    exec: 'smoke',
    tags: { scenario: 'smoke' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    exec: 'journey',
    tags: { scenario: 'load' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 100 },
      { duration: '2m', target: 500 },
      { duration: '2m', target: 1500 },
      { duration: '3m', target: 3000 },
      { duration: '3m', target: 5000 },
      { duration: '2m', target: 0 },
    ],
    exec: 'journey',
    tags: { scenario: 'stress' },
  },
  soak: {
    executor: 'constant-vus',
    vus: 20,
    duration: '30m',
    exec: 'journey',
    tags: { scenario: 'soak' },
  },
  debug: {
    executor: 'per-vu-iterations',
    vus: 1,
    iterations: 1,
    exec: 'debug',
    tags: { scenario: 'debug' },
  },
};

const selected = scenarioDefinitions[config.scenario];
if (!selected) {
  throw new Error(
    `Unknown SCENARIO "${config.scenario}". Expected one of: ${Object.keys(scenarioDefinitions).join(', ')}`,
  );
}

export const options = {
  scenarios: { [config.scenario]: selected },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    'http_req_duration{endpoint:health}': ['p(95)<100'],
    'http_req_duration{endpoint:requetes_list}': ['p(95)<800'],
    'http_req_duration{endpoint:requete_detail}': ['p(95)<600'],
    checks: ['rate>0.99'],
  },
  discardResponseBodies: false,
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  if (config.scenario !== 'smoke' && config.scenario !== 'debug') {
    assertAuthEnv();
  }
  return { startedAt: new Date().toISOString(), scenario: config.scenario, baseUrl: config.baseUrl };
}

export function smoke() {
  smokeJourney();
}

export function journey() {
  userJourney();
}

export function debug() {
  debugJourney();
}
