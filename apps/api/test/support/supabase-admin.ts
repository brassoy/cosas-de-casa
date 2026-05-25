/**
 * Helpers para crear/eliminar usuarios de Supabase Auth en los tests de
 * integración.
 *
 * Usa la API HTTP directamente (fetch nativo de Node 20) en lugar del cliente
 * @supabase/supabase-js porque ese SDK intenta inicializar el módulo realtime,
 * que requiere WebSocket nativo (Node >= 22) y lanza en Node 20.
 *
 * Endpoints usados:
 *  - POST /auth/v1/admin/users   (apikey: secret)  → crear usuario
 *  - POST /auth/v1/token         (apikey: publishable) → obtener JWT
 *  - DELETE /auth/v1/admin/users/:id (apikey: secret) → borrar usuario
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? '';
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

/** Cabeceras comunes para el admin (service-role). */
function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: SECRET_KEY,
    Authorization: `Bearer ${SECRET_KEY}`,
  };
}

/** Cabeceras para el acceso anónimo (publishable key). */
function anonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: PUBLISHABLE_KEY,
  };
}

/** Resultado de crear un usuario de prueba. */
export interface TestUser {
  userId: string;
  email: string;
  password: string;
  accessToken: string;
}

let counter = 0;

/** Genera un email único por invocación para evitar colisiones entre tests. */
function uniqueEmail(prefix = 'test'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@integration.test`;
}

/**
 * Crea un usuario en Supabase Auth con email confirmado y devuelve su JWT.
 *
 * Usa fetch nativo en lugar del SDK para evitar la inicialización de realtime
 * (que requiere WebSocket nativo y falla en Node 20).
 */
export async function createTestUser(
  email?: string,
  password?: string,
): Promise<TestUser> {
  const resolvedEmail = email ?? uniqueEmail();
  const resolvedPassword = password ?? 'TestPass1234!';

  // Paso 1: crear usuario con admin (email confirmado de inmediato).
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      email: resolvedEmail,
      password: resolvedPassword,
      email_confirm: true,
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`createTestUser: no se pudo crear el usuario (${createRes.status}: ${body})`);
  }
  const userData = await createRes.json() as { id: string };

  // Paso 2: obtener el JWT real con signInWithPassword.
  const signInRes = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: anonHeaders(),
      body: JSON.stringify({ email: resolvedEmail, password: resolvedPassword }),
    },
  );
  if (!signInRes.ok) {
    // Limpieza preventiva si el signIn falla.
    await deleteTestUser(userData.id).catch(() => undefined);
    const body = await signInRes.text();
    throw new Error(`createTestUser: no se pudo iniciar sesión (${signInRes.status}: ${body})`);
  }
  const signInData = await signInRes.json() as { access_token: string };

  return {
    userId: userData.id,
    email: resolvedEmail,
    password: resolvedPassword,
    accessToken: signInData.access_token,
  };
}

/**
 * Elimina un usuario de Supabase Auth por id. Silencia errores de "no
 * encontrado" para que la limpieza en afterEach sea idempotente.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
}
