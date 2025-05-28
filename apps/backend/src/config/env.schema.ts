import { z } from 'zod';

/**
 * Schéma de validation pour les variables d'environnement ProConnect
 */
export const ProConnectEnvSchema = z.object({
  PC_DOMAIN: z.string({
    required_error: "La variable d'environnement PC_DOMAIN est requise",
  }),
  PC_CLIENT_ID: z.string({
    required_error: "La variable d'environnement PC_CLIENT_ID est requise",
  }),
  PC_CLIENT_SECRET: z.string({
    required_error: "La variable d'environnement PC_CLIENT_SECRET est requise",
  }),
  PC_ID_TOKEN_SIGNED_RESPONSE_ALG: z.string({
    required_error: "La variable d'environnement PC_CLIENT_SECRET est requise",
  }),
  PC_USERINFO_SIGNED_RESPONSE_ALG: z.string({
    required_error: "La variable d'environnement PC_USERINFO_SIGNED_RESPONSE_ALG est requise",
  }),
  PC_REDIRECT_URI: z.string({
    required_error: "La variable d'environnement PC_REDIRECT_URI est requise",
  }),
});

/**
 * Schéma de validation pour les autres variables d'environnement requises
 */
export const AppEnvSchema = z.object({
  FRONTEND_URI: z.string({
    required_error: "La variable d'environnement FRONTEND_URI est requise",
  }),
  FRONTEND_REDIRECT_URI: z.string({
    required_error: "La variable d'environnement FRONTEND_REDIRECT_URI est requise",
  }),
  FRONTEND_REDIRECT_LOGIN_URI: z.string({
    required_error: "La variable d'environnement FRONTEND_REDIRECT_LOGIN_URI est requise",
  }),
  AUTH_TOKEN_SECRET_KEY: z.string({
    required_error: "La variable d'environnement AUTH_TOKEN_SECRET_KEY est requise",
  }),
  REFRESH_TOKEN_SECRET_KEY: z.string({
    required_error: "La variable d'environnement AUTH_TOKEN_SECRET_KEY est requise",
  }),
  AUTH_TOKEN_EXPIRATION: z.string({
    required_error: "La variable d'environnement AUTH_TOKEN_EXPIRATION est requise",
  }),
  REFRESH_TOKEN_EXPIRATION: z.string({
    required_error: "La variable d'environnement REFRESH_TOKEN_EXPIRATION est requise",
  }),
  AUTH_TOKEN_NAME: z.string({
    required_error: "La variable d'environnement AUTH_TOKEN_NAME est requise",
  }),
  REFRESH_TOKEN_NAME: z.string({
    required_error: "La variable d'environnement REFRESH_TOKEN_NAME est requise",
  }),
  IS_LOGGED_TOKEN_NAME: z.string({
    required_error: "La variable d'environnement IS_LOGGED_TOKEN_NAME est requise",
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
