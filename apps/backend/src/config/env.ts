import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { EnvSchema, type ProConnectEnv, ProConnectEnvSchema } from './env.schema.ts';

/**
 * Valide les variables d'environnement nécessaires à l'application
 * Lancera une erreur si une variable obligatoire est manquante
 */
export function validateEnvVars(): void {
  try {
    // Extraction des variables d'environnement dans un objet
    const processEnv = {
      PROCONNECT_DOMAIN: process.env.PROCONNECT_DOMAIN,
      PROCONNECT_CLIENT_ID: process.env.PROCONNECT_CLIENT_ID,
      PROCONNECT_CLIENT_SECRET: process.env.PROCONNECT_CLIENT_SECRET,
      PROCONNECT_REDIRECT_URI: process.env.PROCONNECT_REDIRECT_URI,
      FRONTEND_REDIRECT_URI: process.env.FRONTEND_REDIRECT_URI,
    };

    // Validation avec Zod
    EnvSchema.parse(processEnv);
    console.log("✅ Configuration d'environnement validée avec Zod");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Validation des variables d'environnement échouée: ${error.message}`);
    }
    throw new Error("Validation des variables d'environnement échouée");
  }
}

/**
 * Récupère les variables d'environnement ProConnect du contexte Hono
 * @returns ProConnectEnv - Variables d'environnement ProConnect typées
 */
export function getProConnectEnv(c: Context): ProConnectEnv {
  const envVars = env(c);

  // Validation avec Zod avant de retourner
  return ProConnectEnvSchema.parse({
    PROCONNECT_DOMAIN: envVars.PROCONNECT_DOMAIN,
    PROCONNECT_CLIENT_ID: envVars.PROCONNECT_CLIENT_ID,
    PROCONNECT_CLIENT_SECRET: envVars.PROCONNECT_CLIENT_SECRET,
    PROCONNECT_REDIRECT_URI: envVars.PROCONNECT_REDIRECT_URI,
  });
}
