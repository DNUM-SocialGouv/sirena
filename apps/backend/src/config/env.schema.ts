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
  DEMAT_SOCIAL_API_URL: z.string({
    required_error: "La variable d'environnement DEMAT_SOCIAL_API_URL est requise",
  }),
  DEMAT_SOCIAL_API_TOKEN: z.string({
    required_error: "La variable d'environnement DEMAT_SOCIAL_API_TOKEN est requise",
  }),
  DEMAT_SOCIAL_API_DIRECTORY: z
    .string({
      required_error: "La variable d'environnement DEMAT_SOCIAL_API_DIRECTORY est requise",
    })
    .transform((val) => {
      const parsed = Number.parseInt(val, 10);
      if (Number.isNaN(parsed)) {
        throw new Error("La variable d'environnement DEMAT_SOCIAL_API_DIRECTORY doit etre un integer");
      }
      return parsed;
    }),
  LOG_FORMAT: z
    .enum(['json', 'pretty'], {
      invalid_type_error: "La variable d'environnement LOG_FORMAT doit être 'json' ou 'pretty'",
    })
    .optional(),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'], {
      invalid_type_error:
        "La variable d'environnement LOG_LEVEL doit être 'trace', 'debug', 'info', 'warn', 'error', ou 'fatal'",
    })
    .default('info')
    .describe('Niveau de log pour la console et sortie standard'),
  LOG_LEVEL_SENTRY: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'], {
      invalid_type_error:
        "La variable d'environnement LOG_LEVEL_SENTRY doit être 'trace', 'debug', 'info', 'warn', 'error', ou 'fatal'",
    })
    .default('warn')
    .describe('Niveau de log minimum pour envoyer vers Sentry (indépendant de LOG_LEVEL)'),
  TRUSTED_IP_HEADERS: z
    .string()
    .optional()
    .describe(
      "Liste des en-têtes HTTP de confiance pour l'extraction d'IP (séparés par des virgules). Aucun par défaut pour la sécurité - configuration explicite requise.",
    )
    .transform((val) => {
      if (!val) return [];
      return val
        .split(',')
        .map((header) => header.trim().toLowerCase())
        .filter((header) => header.length > 0);
    }),
  SUPER_ADMIN_LIST_EMAIL: z.string().default(''),
  LOG_EXTRA_CONTEXT: z
    .string()
    .optional()
    .describe(
      'Contexte supplémentaire pour les logs sous forme de tags key=value séparés par des virgules (ex: "env=prod,service=api,version=1.2.3")',
    )
    .transform((val) => {
      if (!val) return {};
      const context: Record<string, string> = {};
      const pairs = val.split(',').map((pair) => pair.trim());
      for (const pair of pairs) {
        const [key, value] = pair.split('=').map((part) => part.trim());
        if (key && value) {
          context[key] = value;
        }
      }
      return context;
    }),
  SENTRY_DSN_BACKEND: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
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
