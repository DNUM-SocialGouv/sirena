import { serve } from '@hono/node-server';
import { app } from './app.ts';
import { validateEnvVars } from './config/env.ts';
import { setupOpenAPI } from './openAPI.ts';

// Vérifier les variables d'environnement au démarrage
try {
  validateEnvVars();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('❌ Erreur de configuration:', error.message);
  } else {
    console.error('❌ Erreur de configuration inconnue');
  }
  process.exit(1); // Arrêter l'application si les variables d'environnement requises sont manquantes
}

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
