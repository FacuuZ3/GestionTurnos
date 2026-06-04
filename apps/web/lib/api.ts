/**
 * Cliente HTTP tipado para la API NestJS.
 * ---------------------------------------------------------------------------
 *  - Adjunta el access token automáticamente.
 *  - Renueva con /auth/refresh si la respuesta es 401 (un único reintento).
 *  - Lanza ApiError con la forma { statusCode, message, ... } que devuelve
 *    el GlobalExceptionFilter del backend.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Capa de integración cliente
 */

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
} from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string | string[],
    public readonly path?: string,
  ) {
    super(Array.isArray(message) ? message.join(' • ') : message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Si es true, no envía el header Authorization. */
  anonymous?: boolean;
  /** Soporte para query params planos. */
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE}/api${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  updateAccessToken(data.accessToken);
  return data.accessToken;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const url = buildUrl(path, options.query);

  const buildHeaders = (token: string | null): HeadersInit => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && !options.anonymous) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  let res = await fetch(url, {
    method,
    headers: buildHeaders(getAccessToken()),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // Intento de refresh único ante 401.
  if (res.status === 401 && !options.anonymous) {
    const newToken = await attemptRefresh();
    if (newToken) {
      res = await fetch(url, {
        method,
        headers: buildHeaders(newToken),
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } else {
      clearSession();
    }
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const err = payload as { statusCode?: number; message?: string | string[]; path?: string };
    throw new ApiError(
      err.statusCode ?? res.status,
      err.message ?? `Error ${res.status}`,
      err.path,
    );
  }
  return payload as T;
}
