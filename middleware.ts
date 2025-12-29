import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Libera arquivos estáticos e a API de login
  if (path.startsWith('/_next') || path.startsWith('/api/auth') || path.includes('favicon.ico')) {
    return NextResponse.next();
  }

  // 2. Verifica se tem o cookie de sessão
  const session = req.cookies.get('assetflow_session');

  // 3. Se estiver na página de login e já tiver cookie, manda pra Home
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 4. Se NÃO tiver cookie e tentar acessar qualquer outra coisa, manda pro Login
  if (!session && path !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};