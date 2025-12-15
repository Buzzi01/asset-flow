'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/index')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Erro ao buscar dados:', error);
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-950 text-white">
      <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
        AssetFlow
      </h1>
      
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex bg-slate-900 p-10 rounded-xl border border-slate-800 shadow-2xl">
        {loading ? (
           <p className="animate-pulse text-yellow-500 flex items-center gap-2">
             <span>⏳</span> Conectando ao cérebro Python...
           </p>
        ) : data ? (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
              <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
              <p className="text-xl text-gray-400">Status do Sistema: <span className="text-green-400 font-bold">ONLINE</span></p>
            </div>
            
            <ul className="space-y-4">
              <li className="text-2xl">App: <span className="font-bold text-white">{data.app_name}</span></li>
              <li className="bg-slate-800 p-3 rounded border border-slate-700">Mensagem: {data.mensagem}</li>
              <li className="text-xs text-gray-500 text-right mt-4">Server Time: {data.time}</li>
            </ul>
          </div>
        ) : (
          <p className="text-red-500">Erro ao conectar com a API. Verifique o console.</p>
        )}
      </div>
    </main>
  );
}