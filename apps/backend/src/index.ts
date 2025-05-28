import { serve } from '@hono/node-server';
import { app } from './app';
import { setupOpenAPI } from './openAPI';
import '@/config/env.ts';

setupOpenAPI(app);

serve(
  {
    fetch: app.fetch,
    port: 4000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
