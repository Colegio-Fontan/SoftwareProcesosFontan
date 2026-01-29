import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Debug logs (opcional, remover en prod)
  // console.log(`[Middleware] Path: ${pathname}, Token: ${!!token}`);

  // Rutas que no deben ser procesadas por el middleware
  if (
    pathname.includes('.') || // Archivos estáticos (.js, .css, .png, etc)
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Rutas públicas
  const isPublicRoute = pathname === '/' || pathname === '/register' || pathname === '/confirm';

  if (isPublicRoute) {
    if (token) {
      try {
        const payload = await verifyToken(token);
        if (payload) {
          console.log(`[Middleware] Authenticated user on public route ${pathname}, redirecting to /home`);
          return NextResponse.redirect(new URL('/home', request.url));
        }
      } catch (e) {
        // Token inválido, dejar que sigan
      }
    }
    return NextResponse.next();
  }

  // Rutas protegidas
  if (!token) {
    console.log(`[Middleware] No token found for protected route ${pathname}, redirecting to login (/)`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      console.log(`[Middleware] Invalid token for ${pathname}, clearing cookie and redirecting to login (/)`);
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  } catch (error) {
    console.error('[Middleware] Token verification error:', error);
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
};

