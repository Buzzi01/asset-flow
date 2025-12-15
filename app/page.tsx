'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/index')
      .then(async (res) => {
        if (!res.ok) {
           const text = await res.text();
           throw new Error(`Erro API: ${res.status} - ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.status === 'Erro') {
          throw new Error(data.detalhe || 'Erro desconhecido no Python');
        }
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatMoney = (value: number) => {
    return value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
  };

  const formatPercent = (value: number) => {
    return value ? value.toFixed(2) + '%' : '0%';
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-500 p-8 rounded-xl max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-4">⚠️ Ocorreu um erro</h1>
          <p className="text-slate-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition"
          >
            Tentar Novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
              AssetFlow
            </h1>
            <p className="text-slate-400 mt-1">Gestão Inteligente de Patrimônio</p>
          </div>
          
          {!loading && data?.total_patrimonio !== undefined && (
            <div className="mt-4 md:mt-0 bg-slate-900 p-4 rounded-xl border border-slate-700 text-center min-w-[200px]">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Patrimônio Total</p>
              <p className="text-3xl font-bold text-white mt-1">{formatMoney(data.total_patrimonio)}</p>
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 flex-col gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-500 animate-pulse">Consultando Yahoo Finance...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-2xl">
            <table className="w-full text-left bg-slate-900 border-collapse">
              <thead>
                <tr className="text-slate-400 text-xs uppercase bg-slate-950/50">
                  <th className="p-4 font-semibold">Ativo</th>
                  <th className="p-4 font-semibold text-right">Qtd</th>
                  <th className="p-4 font-semibold text-right">Preço Médio</th>
                  <th className="p-4 font-semibold text-right">Preço Atual</th>
                  <th className="p-4 font-semibold text-right">Total Atual</th>
                  <th className="p-4 font-semibold text-right">Variação (%)</th>
                  <th className="p-4 font-semibold text-right">% Cart.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {data?.ativos?.map((ativo: any) => (
                  <tr key={ativo.ticker} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-base">{ativo.ticker}</div>
                      <div className="text-xs text-slate-500">{ativo.tipo}</div>
                    </td>
                    <td className="p-4 text-right text-slate-300">{ativo.qtd}</td>
                    <td className="p-4 text-right text-slate-400">R$ {ativo.pm.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-slate-200">R$ {ativo.preco_atual.toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-white">{formatMoney(ativo.total_atual)}</td>
                    <td className={`p-4 text-right font-bold ${ativo.lucro_reais >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <div>{formatMoney(ativo.lucro_reais)}</div>
                      <div className="text-xs opacity-80">{ativo.lucro_reais > 0 ? '+' : ''}{formatPercent(ativo.lucro_perc)}</div>
                    </td>
                    <td className="p-4 text-right w-32">
                      <div className="text-xs text-slate-300 mb-1">{ativo.percentual_carteira?.toFixed(1)}%</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${ativo.percentual_carteira}%` }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}