import { Hono } from 'hono';
import { checkAlive, checkReady, getCurrentStatus } from './healthcheck.service';

const app = new Hono();

app.get('/', async (c) => {
  const result = await getCurrentStatus();
  return c.json(result, 200);
});

app.get('/alive', async (c) => {
  const result = await checkAlive();
  const statusCode = result.status === 'ok' ? 200 : 503;
  return c.json(result, statusCode);
});

app.get('/ready', async (c) => {
  const result = await checkReady();
  const statusCode = result.status === 'ok' ? 200 : 503;
  return c.json(result, statusCode);
});

export default app;
