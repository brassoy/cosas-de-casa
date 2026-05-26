import type { ApiError } from '@cosasdecasa/contracts';
import { supabase } from './supabase';

const BASE_URL = `${import.meta.env.VITE_API_URL as string}/api/v1`;

/** Error tipado que lanza el wrapper cuando el servidor devuelve un status >= 400. */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message ?? `Error ${status}`);
    this.name = 'ApiRequestError';
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    if (response.status === 401) {
      // Sesión inválida o expirada: la limpiamos para que el guard de rutas
      // redirija a /login en vez de dejar la app en un estado roto.
      void supabase.auth.signOut();
    }
    let body: ApiError;
    try {
      body = (await response.json()) as ApiError;
    } catch {
      body = { statusCode: response.status, error: 'UnknownError', message: response.statusText };
    }
    throw new ApiRequestError(response.status, body);
  }

  // 204 No Content — devuelve undefined casteado a T
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
