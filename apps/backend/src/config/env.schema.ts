import { z } from '@/libs/zod.ts';

/**
 * Schéma de validation pour les variables d'environnement ProConnect
 */
export const ProConnectEnvSchema = z.object({
  PROCONNECT_DOMAIN: z.string({
    required_error: "La variable d'environnement PROCONNECT_DOMAIN est requise",
  }),
  PROCONNECT_CLIENT_ID: z.string({
    required_error: "La variable d'environnement PROCONNECT_CLIENT_ID est requise",
  }),
  PROCONNECT_CLIENT_SECRET: z.string({
    required_error: "La variable d'environnement PROCONNECT_CLIENT_SECRET est requise",
  }),
  PROCONNECT_REDIRECT_URI: z.string({
    required_error: "La variable d'environnement PROCONNECT_REDIRECT_URI est requise",
  }),
});

/**
 * Schéma de validation pour les autres variables d'environnement requises
 */
export const AppEnvSchema = z.object({
  FRONTEND_REDIRECT_URI: z.string({
    required_error: "La variable d'environnement FRONTEND_REDIRECT_URI est requise",
  }),
});

/**
 * Schéma global de toutes les variables d'environnement
 */
export const EnvSchema = ProConnectEnvSchema.merge(AppEnvSchema);

/**
 * Type extrait du schéma pour les variables ProConnect
 */
export type ProConnectEnv = z.infer<typeof ProConnectEnvSchema>;

/**
 * Type extrait du schéma pour toutes les variables d'environnement
 */
export type AppEnv = z.infer<typeof AppEnvSchema>;

/**
 * Type global de toutes les variables d'environnement
 */
export type Env = z.infer<typeof EnvSchema>;
