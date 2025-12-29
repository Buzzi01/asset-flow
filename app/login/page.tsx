'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Wallet } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/'); // Redireciona para o dashboard
      router.refresh();
    } else {
      setError('Senha incorreta. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-500 mb-4 border border-blue-500/20">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AssetFlow <span className="text-blue-500">Pro</span></h1>
          <p className="text-slate-500 text-sm mt-2">Área restrita. Digite sua senha de acesso.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="Senha de acesso"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading || !password}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? 'Acessando...' : <>Entrar <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>
        
        <div className="mt-8 text-center">
           <p className="text-[10px] text-slate-700 uppercase tracking-widest">Secure Environment</p>
        </div>
      </div>
    </div>
  );
}