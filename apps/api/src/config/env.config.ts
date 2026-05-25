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
  JWT_JWKS_URL: z.string().url().optional(),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
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
