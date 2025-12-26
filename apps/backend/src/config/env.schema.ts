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
  MONITORING_PORT: z
    .string()
    .optional()
    .default('9090')
    .transform((val) => {
      const parsed = Number.parseInt(val, 10);
      if (Number.isNaN(parsed)) {
        throw new Error("La variable d'environnement MONITORING_PORT doit etre un integer");
      }
      return parsed;
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
  ANNUAIRE_SANTE_API_KEY: z.string({
    required_error: "La variable d'environnement ANNUAIRE_SANTE_API_KEY est requise",
  }),
  ANNUAIRE_SANTE_API_URL: z.string({
    required_error: "La variable d'environnement ANNUAIRE_SANTE_API_URL est requise",
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
  DEMAT_SOCIAL_INSTRUCTEUR_ID: z.string(),
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
  SENTRY_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true')
    .describe('Enable Sentry error tracking'),
  SENTRY_DSN_BACKEND: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  S3_BUCKET_ACCESS_KEY: z
    .string({
      required_error: "La variable d'environnement S3_BUCKET_ACCESS_KEY est requise",
    })
    .default(''),
  S3_BUCKET_SECRET_KEY: z
    .string({
      required_error: "La variable d'environnement S3_BUCKET_SECRET_KEY est requise",
    })
    .default(''),
  S3_BUCKET_ENDPOINT: z
    .string({
      required_error: "La variable d'environnement S3_BUCKET_ENDPOINT est requise",
    })
    .default(''),
  S3_BUCKET_NAME: z
    .string({
      required_error: "La variable d'environnement S3_BUCKET_NAME est requise",
    })
    .default(''),
  S3_BUCKET_REGION: z.string().optional().default(''),
  S3_BUCKET_ROOT_DIR: z
    .string({
      required_error: "La variable d'environnement S3_BUCKET_ROOT_DIR est requise",
    })
    .default(''),
  S3_BUCKET_PORT: z
    .string({
      required_error: "La variable d'environnement S3_BUCKET_PORT est requise",
    })
    .default(''),
  S3_ENCRYPTION_KEY: z
    .string({
      required_error: "La variable d'environnement S3_ENCRYPTION_KEY est requise",
    })
    .length(64, 'S3_ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)')
    .regex(/^[0-9a-fA-F]+$/, 'S3_ENCRYPTION_KEY must be a valid hexadecimal string'),
  CLAMAV_HOST: z.string().optional().default('').describe('Hostname of the ClamAV daemon (e.g., clamav or localhost)'),
  CLAMAV_PORT: z.string().optional().default('3310').describe('Port of the ClamAV daemon (default: 3310)'),
  TIPIMAIL_API_URL: z
    .string({
      required_error: "La variable d'environnement TIPIMAIL_API_URL est requise",
    })
    .optional()
    .default(''),
  TIPIMAIL_API_KEY: z
    .string({
      required_error: "La variable d'environnement TIPIMAIL_API_KEY est requise",
    })
    .optional()
    .default(''),
  TIPIMAIL_USER_ID: z.string({
    required_error: "La variable d'environnement TIPIMAIL_USER_ID est requise",
  }),
  TIPIMAIL_FROM_ADDRESS: z.string({
    required_error: "La variable d'environnement TIPIMAIL_FROM_ADDRESS est requise",
  }),
  TIPIMAIL_FROM_PERSONAL_NAME: z.string({
    required_error: "La variable d'environnement TIPIMAIL_FROM_PERSONAL_NAME est requise",
  }),
  REDIS_HOST: z.string({
    required_error: "La variable d'environnement REDIS_HOST est requise",
  }),
  REDIS_PORT: z
    .string()
    .optional()
    .default('6379')
    .transform((val) => {
      const parsed = Number.parseInt(val, 10);
      if (Number.isNaN(parsed)) {
        throw new Error("La variable d'environnement REDIS_PORT doit etre un integer");
      }
      return parsed;
    }),
  REDIS_TLS: z.string().optional().default('false'),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
});

export const CronEnvSchema = z.object({
  CRON_DEMAT_SOCIAL: z.string({
    required_error: "La variable d'environnement CRON_DEMAT_SOCIAL est requise",
  }),
  CRON_RETRY_AFFECTATION: z.string().optional().default('3600'),
});

/**
 * Schéma global de toutes les variables d'environnement
 */
export const EnvSchema = ProConnectEnvSchema.merge(AppEnvSchema).merge(CronEnvSchema);

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
