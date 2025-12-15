'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Resumo'); // Aba inicial

  useEffect(() => {
    fetch('/api/index')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, []);

  const formatMoney = (val: number) => val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatPercent = (val: number) => val ? val.toFixed(2) + '%' : '0%';

  // Filtra os ativos baseados na aba selecionada
  const getFilteredAssets = () => {
    if (!data) return [];
    if (activeTab === 'Resumo') return data.ativos; // Mostra tudo
    return data.ativos.filter((a: any) => a.tipo === activeTab);
  };

  const ativosFiltrados = getFilteredAssets();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">AssetFlow</h1>
            <p className="text-slate-400">Dashboard de Investimentos</p>
          </div>
          <div className="text-right">
             <p className="text-xs text-slate-400 uppercase">Patrimônio Total</p>
             <p className="text-3xl font-bold text-white">{data ? formatMoney(data.resumo.Total) : '...'}</p>
          </div>
        </header>

        {/* NAVEGAÇÃO POR ABAS (TABS) */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {['Resumo', 'Ação', 'FII', 'Internacional', 'Renda Fixa'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TABELA DINÂMICA */}
        {loading ? (
          <p className="text-center text-slate-500 animate-pulse mt-10">Carregando dados e calculando Graham...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-2xl bg-slate-900">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 text-xs uppercase bg-slate-950/50">
                  <th className="p-4">Ativo</th>
                  <th className="p-4 text-right">Preço Médio</th>
                  <th className="p-4 text-right">Preço Atual</th>
                  <th className="p-4 text-right">Rentabilidade</th>
                  
                  {/* Colunas Específicas para Ações */}
                  {(activeTab === 'Ação' || activeTab === 'Resumo') && (
                    <>
                      <th className="p-4 text-right text-yellow-400">Preço Justo (Graham)</th>
                      <th className="p-4 text-right text-yellow-400">Margem Seg.</th>
                    </>
                  )}
                  
                  {/* Colunas Específicas para FIIs */}
                  {(activeTab === 'FII' || activeTab === 'Resumo') && (
                     <th className="p-4 text-right text-purple-400">P/VP</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {ativosFiltrados.map((ativo: any) => (
                  <tr key={ativo.ticker} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{ativo.ticker}</div>
                      <div className="text-xs text-slate-500">{ativo.tipo}</div>
                    </td>
                    <td className="p-4 text-right text-slate-400">{formatMoney(ativo.pm)}</td>
                    <td className="p-4 text-right font-mono text-slate-200">{formatMoney(ativo.preco_atual)}</td>
                    
                    {/* Rentabilidade */}
                    <td className={`p-4 text-right font-bold ${ativo.lucro_reais >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(ativo.lucro_perc)}
                    </td>

                    {/* Colunas de Graham (Só aparecem se for ação e tiver cálculo válido) */}
                    {(activeTab === 'Ação' || activeTab === 'Resumo') && (
                      <>
                        <td className="p-4 text-right text-yellow-100 font-mono">
                          {ativo.preco_justo_graham > 0 ? formatMoney(ativo.preco_justo_graham) : '-'}
                        </td>
                        <td className={`p-4 text-right font-bold ${ativo.margem_seguranca > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {ativo.margem_seguranca !== 0 ? formatPercent(ativo.margem_seguranca) : '-'}
                        </td>
                      </>
                    )}

                     {/* Coluna P/VP (FIIs) */}
                     {(activeTab === 'FII' || activeTab === 'Resumo') && (
                        <td className="p-4 text-right text-purple-200">
                           {ativo.tipo === 'FII' ? ativo.pvp : '-'}
                        </td>
                     )}
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