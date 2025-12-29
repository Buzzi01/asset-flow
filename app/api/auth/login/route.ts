import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    
    // A senha definida nas variáveis de ambiente da Vercel/Docker
    const validPass = process.env.BASIC_AUTH_PASSWORD || 'admin'; 

    if (password === validPass) {
      const response = NextResponse.json({ success: true });
      
      // Cria um cookie seguro que dura 7 dias
      response.cookies.set('assetflow_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, message: 'Senha incorreta' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}