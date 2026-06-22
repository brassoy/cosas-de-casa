import { z } from 'zod';

/**
 * Esquema de configuración. Validamos el entorno al arrancar: si falta o es
 * inválido algo crítico, la API NO levanta (fail-fast) en vez de romper en runtime.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_CORS_ORIGINS: z
    .string()
    .default('http://127.0.0.1:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  DATABASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  /**
   * Clave `service_role` de Supabase (admin). OPCIONAL: si está presente, la baja
   * de cuenta borra también el usuario del proveedor de Auth; si falta, ese paso
   * se omite (no rompe el arranque). NUNCA debe llegar al cliente.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  JWT_JWKS_URL: z.string().url().optional(),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  /**
   * Secreto compartido para verificar el JWT en HS256 (Supabase self-hosted, que
   * firma con un secreto en vez de claves asimétricas). Si está definido, la API
   * verifica en modo simétrico con este secreto EN LUGAR del JWKS (JWT_JWKS_URL).
   * Mínimo 32 caracteres. En Supabase Cloud / CLI local no se usa (se deja vacío).
   */
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  /**
   * Pepper de servidor para el hash (scrypt) de los PIN de invitación. Hace el
   * hash determinista (permite buscar por code_hash) y resistente a ataques
   * offline si se filtra la tabla. Tiene un valor por defecto SOLO para dev/test
   * local; en producción debe ir en el entorno y ser secreto.
   */
  JOIN_PIN_PEPPER: z.string().min(16).default('dev-only-join-pin-pepper-change-me'),

  // ── MiniMax (extracción de artículos por IA) ─────────────────────────────
  /** URL base de la API MiniMax (compatible con Anthropic SDK). */
  MINIMAX_BASE_URL: z.string().url().optional(),
  /** API Key de MiniMax. */
  MINIMAX_API_KEY: z.string().optional(),
  /** Identificador del modelo MiniMax a usar. */
  MINIMAX_MODEL: z.string().optional(),

  // ── Web Push (VAPID) ─────────────────────────────────────────────────────
  /** Clave pública VAPID (base64url). */
  VAPID_PUBLIC_KEY: z.string().optional(),
  /** Clave privada VAPID (base64url). */
  VAPID_PRIVATE_KEY: z.string().optional(),
  /** Sujeto VAPID: mailto: o URL. */
  VAPID_SUBJECT: z.string().optional(),
}).superRefine((env, ctx) => {
  // En dev/test mantenemos todo opcional + defaults para no romper el flujo
  // local ni el app-factory de integración. Las exigencias de seguridad de
  // abajo SOLO aplican en producción (fail-fast en bootstrap).
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const requireNonEmpty = (
    key: 'JWT_ISSUER' | 'JWT_AUDIENCE' | 'DATABASE_URL',
  ): void => {
    const value = env[key];
    if (value == null || value.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} es obligatorio en producción y no puede estar vacío`,
      });
    }
  };

  requireNonEmpty('JWT_ISSUER');
  requireNonEmpty('JWT_AUDIENCE');
  requireNonEmpty('DATABASE_URL');

  // Verificación del JWT: hace falta JWKS asimétrico (Supabase Cloud / CLI) O el
  // secreto compartido HS256 (Supabase self-hosted). Al menos uno de los dos.
  const hasJwks = env.JWT_JWKS_URL != null && env.JWT_JWKS_URL.trim() !== '';
  const hasSecret = env.SUPABASE_JWT_SECRET != null && env.SUPABASE_JWT_SECRET.trim() !== '';
  if (!hasJwks && !hasSecret) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_JWKS_URL'],
      message:
        'En producción define JWT_JWKS_URL (verificación JWKS asimétrica) o SUPABASE_JWT_SECRET (HS256 self-hosted).',
    });
  }

  if (env.JOIN_PIN_PEPPER === 'dev-only-join-pin-pepper-change-me') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JOIN_PIN_PEPPER'],
      message:
        'JOIN_PIN_PEPPER debe definirse con un secreto propio en producción (no puede ser el valor por defecto de dev)',
    });
  }
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida: ${issues}`);
  }
  return parsed.data;
}

/** Adaptador para el `validate` de @nestjs/config. */
export function validateEnv(config: Record<string, unknown>): Env {
  return loadEnv(config as NodeJS.ProcessEnv);
}
