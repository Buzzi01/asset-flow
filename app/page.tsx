'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Resumo');

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

  const getFilteredAssets = () => {
    if (!data) return [];
    if (activeTab === 'Resumo') return data.ativos;
    return data.ativos.filter((a: any) => a.tipo === activeTab);
  };

  const ativosFiltrados = getFilteredAssets();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">AssetFlow</h1>
            <p className="text-slate-400">Dashboard & Estratégia</p>
          </div>
          <div className="text-right">
             <p className="text-xs text-slate-400 uppercase">Patrimônio Total</p>
             <p className="text-3xl font-bold text-white">{data ? formatMoney(data.resumo.Total) : '...'}</p>
          </div>
        </header>

        {/* NAVEGAÇÃO */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {['Resumo', 'Ação', 'FII', 'Internacional', 'Renda Fixa'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
           <div className="text-center py-20">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4"></div>
             <p className="text-slate-400">Buscando indicadores (LPA, VPA) e calculando estratégia...</p>
           </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-2xl bg-slate-900">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 text-xs uppercase bg-slate-950/50">
                  <th className="p-4">Ativo</th>
                  <th className="p-4 text-center">Meta vs Atual</th>
                  <th className="p-4 text-right">Preço</th>
                  <th className="p-4 text-right">Lucro/Prej</th>
                  
                  {/* Estratégia */}
                  <th className="p-4 text-right text-blue-300">Aportar (R$)</th>
                  
                  {(activeTab === 'Ação' || activeTab === 'Resumo') && <th className="p-4 text-right text-yellow-400">Graham (Mg%)</th>}
                  {(activeTab === 'FII' || activeTab === 'Resumo') && <th className="p-4 text-right text-purple-400">P/VP</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {ativosFiltrados.map((ativo: any) => (
                  <tr key={ativo.ticker} className="hover:bg-slate-800/50 transition-colors">
                    
                    <td className="p-4">
                      <div className="font-bold text-white text-lg">{ativo.ticker}</div>
                      <div className="text-xs text-slate-500">{ativo.tipo} • {ativo.qtd} cotas</div>
                    </td>

                    {/* Barra de Balanceamento */}
                    <td className="p-4 w-40 align-middle">
                        <div className="flex justify-between text-xs mb-1 text-slate-400">
                            <span>{ativo.porcentagem_atual.toFixed(1)}%</span>
                            <span>Meta: {ativo.meta}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
                            <div className={`h-full absolute left-0 top-0 ${ativo.porcentagem_atual > ativo.meta ? 'bg-red-500' : 'bg-blue-500'}`} 
                                 style={{ width: `${Math.min(ativo.porcentagem_atual, 100)}%` }}></div>
                            {/* Marcador da Meta */}
                            <div className="h-full w-0.5 bg-white absolute top-0" style={{ left: `${Math.min(ativo.meta * (100/30), 100)}%` }}></div> 
                        </div>
                    </td>

                    <td className="p-4 text-right font-mono text-slate-300">
                        {formatMoney(ativo.preco_atual)}
                        <div className="text-xs text-slate-500">PM: {formatMoney(ativo.pm)}</div>
                    </td>

                    <td className={`p-4 text-right font-bold ${ativo.lucro_reais >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(ativo.lucro_perc)}
                      <div className="text-xs opacity-70">{formatMoney(ativo.lucro_reais)}</div>
                    </td>

                    {/* COLUNA DE APORTE (O CÉREBRO) */}
                    <td className="p-4 text-right">
                        {ativo.falta_comprar > 0 ? (
                            <span className="bg-blue-900/50 text-blue-200 py-1 px-3 rounded border border-blue-500/30 font-bold text-xs">
                                + {formatMoney(ativo.falta_comprar)}
                            </span>
                        ) : (
                             <span className="text-xs text-slate-600">Aguardar</span>
                        )}
                    </td>

                    {(activeTab === 'Ação' || activeTab === 'Resumo') && (
                      <td className="p-4 text-right font-mono text-yellow-100">
                         {ativo.preco_justo > 0 ? (
                             <div>
                                 {formatMoney(ativo.preco_justo)}
                                 <div className={`text-xs ${ativo.margem_seguranca > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                     Mg: {ativo.margem_seguranca.toFixed(0)}%
                                 </div>
                             </div>
                         ) : '-'}
                      </td>
                    )}

                    {(activeTab === 'FII' || activeTab === 'Resumo') && (
                       <td className={`p-4 text-right ${ativo.pvp < 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {ativo.tipo === 'FII' && ativo.pvp > 0 ? ativo.pvp.toFixed(2) : '-'}
                       </td>
                    )}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 text-xs text-slate-500 text-center">
             Edite o arquivo <code>carteira.json</code> para adicionar novos ativos ou mudar suas metas.
        </div>
      </div>
    </main>
  );
}