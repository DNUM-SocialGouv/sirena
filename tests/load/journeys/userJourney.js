import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { config } from '../lib/config.js';
import { authHeaders } from '../lib/auth.js';

const PAGE_SIZE = Number.parseInt(__ENV.PAGE_SIZE || '20', 10);
const THINK_TIME_MIN = Number.parseFloat(__ENV.THINK_TIME_MIN || '1');
const THINK_TIME_MAX = Number.parseFloat(__ENV.THINK_TIME_MAX || '3');

const thinkTime = () => {
  const delta = THINK_TIME_MAX - THINK_TIME_MIN;
  return THINK_TIME_MIN + Math.random() * delta;
};

const MAX_FAILURE_LOGS_PER_VU = 3;
let failuresLoggedInThisVU = 0;

const checkOk = (res, name) => {
  const ok = check(res, {
    [`${name} 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  if (!ok && failuresLoggedInThisVU < MAX_FAILURE_LOGS_PER_VU) {
    failuresLoggedInThisVU += 1;
    const bodyHead = (res.body || '').slice(0, 300);
    console.log(`[${name}] FAIL status=${res.status} url=${res.url} body=${bodyHead}`);
  }
  return ok;
};

export function userJourney() {
  const headers = authHeaders();
  const params = { headers };

  group('boot', () => {
    const profile = http.get(`${config.baseUrl}/profile`, { ...params, tags: { endpoint: 'profile' } });
    checkOk(profile, 'profile');

    const entites = http.get(`${config.baseUrl}/entites/chain`, { ...params, tags: { endpoint: 'entites_chain' } });
    checkOk(entites, 'entites_chain');
  });

  sleep(thinkTime());

  let firstId = null;
  group('list_requetes', () => {
    const url = `${config.baseUrl}/requetes-entite?limit=${PAGE_SIZE}&offset=0`;
    const res = http.get(url, { ...params, tags: { endpoint: 'requetes_list' } });
    checkOk(res, 'requetes_list');

    if (res.status === 200) {
      try {
        const body = res.json();
        const items = body && body.data;
        if (Array.isArray(items) && items.length > 0) {
          const [first] = items;
          firstId = first?.requeteId || first?.id || null;
        }
      } catch (_) {
        // body parsing is best-effort; failures already caught by status check
      }
    }
  });

  if (!firstId) return;

  sleep(thinkTime());

  group('detail_requete', () => {
    const res = http.get(`${config.baseUrl}/requetes-entite/${firstId}`, {
      ...params,
      tags: { endpoint: 'requete_detail' },
    });
    checkOk(res, 'requete_detail');
  });
}
