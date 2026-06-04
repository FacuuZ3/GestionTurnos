/**
 * Helpers de autenticación del cliente.
 * ---------------------------------------------------------------------------
 * Persisten los tokens y el rol en cookies (accesibles desde middleware.ts).
 * Para una app puramente SPA bastaría con localStorage, pero las cookies
 * permiten que middleware proteja rutas durante el SSR.
 *
 * Decisión académica: se usa cookie no-HttpOnly porque el access token se
 * inyecta en el header Authorization desde el navegador. En un entorno de
 * producción se recomienda usar cookies HttpOnly + endpoint proxy en
 * Next.js. Esto se documenta como TRABAJO FUTURO.
 */

import { Role, UserDto } from './types';

const ACCESS_KEY = 'padel_at';
const REFRESH_KEY = 'padel_rt';
const ROLE_KEY = 'padel_role';
const USER_KEY = 'padel_user';

const isBrowser = (): boolean => typeof document !== 'undefined';

function setCookie(name: string, value: string, days = 7): void {
  if (!isBrowser()) return;
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export function saveSession(tokens: SessionTokens, user: UserDto): void {
  setCookie(ACCESS_KEY, tokens.accessToken);
  setCookie(REFRESH_KEY, tokens.refreshToken);
  setCookie(ROLE_KEY, user.role);
  if (isBrowser()) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getAccessToken(): string | null {
  return getCookie(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return getCookie(REFRESH_KEY);
}

export function getRole(): Role | null {
  const r = getCookie(ROLE_KEY);
  return r === 'USER' || r === 'ADMIN' ? r : null;
}

export function getStoredUser(): UserDto | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserDto;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  deleteCookie(ACCESS_KEY);
  deleteCookie(REFRESH_KEY);
  deleteCookie(ROLE_KEY);
  if (isBrowser()) localStorage.removeItem(USER_KEY);
}

export function updateAccessToken(token: string): void {
  setCookie(ACCESS_KEY, token);
}
