/**
 * Middleware de Next.js — protección de rutas por rol.
 * ---------------------------------------------------------------------------
 *  - /dashboard/admin/*  → exige cookie role === 'ADMIN'.
 *  - /dashboard/user/*   → exige sesión (cualquier rol).
 *  - /login y /register  → redirigen al dashboard si ya hay sesión.
 *
 * El access token vive en cookie 'padel_at' (escrita por lib/auth.ts tras
 * login). En este middleware no validamos la firma del JWT —se delega al
 * backend—; nos limitamos a verificar la presencia de las cookies.
 */

import { NextRequest, NextResponse } from 'next/server';

const ROLE_COOKIE = 'padel_role';
const ACCESS_COOKIE = 'padel_at';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value;

  // Rutas privadas
  if (pathname.startsWith('/dashboard/admin')) {
    if (!accessToken) return redirect(req, '/login');
    if (role !== 'ADMIN') return redirect(req, '/dashboard/user');
  }
  if (pathname.startsWith('/dashboard/user')) {
    if (!accessToken) return redirect(req, '/login');
  }

  // Si ya hay sesión, evitar volver a /login o /register
  if ((pathname === '/login' || pathname === '/register') && accessToken) {
    return redirect(req, role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user');
  }

  return NextResponse.next();
}

function redirect(req: NextRequest, to: string) {
  const url = req.nextUrl.clone();
  url.pathname = to;
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
