import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Pula a verificação se for a chamada da API (para não travar o Python)
  // ou arquivos estáticos (imagens, favicon, etc)
  if (req.nextUrl.pathname.startsWith('/api') || req.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // As variáveis que vamos configurar no site da Vercel
    const validUser = process.env.BASIC_AUTH_USER;
    const validPass = process.env.BASIC_AUTH_PASSWORD;

    if (user === validUser && pwd === validPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Acesso Negado.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Area Restrita AssetFlow"',
    },
  });
}