'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Wallet, DollarSign, Activity, Target, Info, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Resumo');

  const fetchData = () => {
    fetch('/api/index').then(res => res.json()).then(d => { setData(d); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const formatMoney = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  const categories = [
    { id: 'Resumo', icon: <PieChart size={18} /> },
    { id: 'Radar', icon: <Target size={18} />, label: "Radar" },
    { id: 'Ação', icon: <TrendingUp size={18} /> },
    { id: 'FII', icon: <Activity size={18} /> },
    { id: 'Internacional', icon: <DollarSign size={18} /> },
    { id: 'Renda Fixa', label: 'Renda Fixa' },
    { id: 'Reserva', label: 'Reserva' },
    { id: 'Cripto', label: 'Cripto' },
  ];

  const filteredAssets = data?.ativos?.filter((a: any) => tab === 'Resumo' || tab === 'Radar' ? true : a.tipo === tab) || [];

  // --- COMPONENTE RADAR (Top Oportunidades) ---
  const RadarView = () => {
    const topCompras = [...(data?.ativos || [])]
      .filter((a: any) => a.falta_comprar > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    const riscos = data?.alertas || [];

    return (
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Top 3 Compras */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-green-900/30 shadow-lg">
          <h3 className="text-lg font-bold text-green-400 flex items-center gap-2 mb-4">
            <TrendingUp /> Top 3 Oportunidades
          </h3>
          <div className="space-y-3">
            {topCompras.length > 0 ? topCompras.map((ativo: any) => (
              <div key={ativo.ticker} className="flex justify-between items-center bg-[#0f172a] p-3 rounded-lg border border-slate-700">
                <div>
                  <div className="font-bold text-white">{ativo.ticker}</div>
                  <div className="text-xs text-slate-400">{ativo.motivo}</div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">+{formatMoney(ativo.falta_comprar)}</div>
                  <div className="text-[10px] text-slate-500">Score: {ativo.score}</div>
                </div>
              </div>
            )) : <p className="text-slate-500">Nenhuma oportunidade clara de aporte agora.</p>}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-red-900/30 shadow-lg">
          <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
            <AlertTriangle /> Atenção / Riscos
          </h3>
          <div className="space-y-3">
            {riscos.length > 0 ? riscos.map((alerta: string, idx: number) => (
              <div key={idx} className="bg-red-900/20 text-red-200 p-3 rounded-lg text-sm border border-red-900/50">
                {alerta}
              </div>
            )) : <p className="text-slate-500">Nenhum alerta de concentração encontrado.</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      
      {/* Navbar */}
      <div className="bg-[#1e293b] border-b border-slate-700 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg"><Wallet className="text-white" /></div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AssetFlow <span className="text-blue-400 text-sm font-normal">Sênior</span></h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Patrimônio</p>
            <p className="text-2xl font-bold text-white">{data ? formatMoney(data.resumo.Total) : '...'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {categories.map((c) => (
            <button key={c.id} onClick={() => setTab(c.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                tab === c.id ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-[#1e293b] text-slate-400 hover:bg-slate-700'
              }`}>
              {c.icon}{c.label || c.id}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading ? (
           <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div></div>
        ) : (
          <>
            {/* VIEW RADAR */}
            {tab === 'Radar' && <RadarView />}

            {/* TABELA PADRÃO */}
            {tab !== 'Radar' && (
            <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4">Ativo</th>
                    <th className="p-4 text-center">Score / Decisão</th>
                    <th className="p-4 text-right">Preço</th>
                    <th className="p-4 text-right min-w-[140px]">Progresso da Meta</th>
                    <th className="p-4 text-right">Falta Comprar</th>
                    {(tab === 'Ação' || tab === 'Resumo') && <th className="p-4 text-right text-yellow-500">Graham</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredAssets.map((ativo: any) => {
                    // Lógica Visual da Barra: Quanto % da meta eu já atingi?
                    // Se tenho 5% e meta é 10%, barra = 50% cheia.
                    const percentualDaMeta = ativo.meta > 0 ? (ativo.pct_atual / ativo.meta) * 100 : 0;
                    const barraWidth = Math.min(percentualDaMeta, 100);
                    const isOverweight = ativo.pct_atual > ativo.meta;

                    return (
                    <tr key={ativo.ticker} className="hover:bg-slate-800/50 transition-colors group">
                      
                      <td className="p-4">
                        <div className="font-bold text-white text-base">{ativo.ticker}</div>
                        <div className="text-xs text-slate-500">{ativo.tipo} • {ativo.qtd} un.</div>
                      </td>

                      {/* Decisão com Tooltip */}
                      <td className="p-4 text-center group/tooltip relative">
                        <div className="flex flex-col items-center cursor-help">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase mb-1 ${
                            ativo.cor_rec === 'green' ? 'bg-green-900/30 text-green-400 border-green-700' :
                            ativo.cor_rec === 'blue' ? 'bg-blue-900/30 text-blue-400 border-blue-700' :
                            ativo.cor_rec === 'yellow' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' :
                            'bg-slate-800 text-slate-400 border-slate-600'
                          }`}>{ativo.recomendacao}</span>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                             Score: {ativo.score} <Info size={10}/>
                          </div>
                        </div>
                        
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-48 bg-black text-xs text-slate-200 p-2 rounded border border-slate-600 z-50 shadow-xl">
                          <p className="font-bold text-white mb-1 border-b border-slate-700 pb-1">Motivos:</p>
                          {ativo.motivo || "Sem dados suficientes"}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="text-slate-200 font-mono">{formatMoney(ativo.preco_atual)}</div>
                        <div className="text-xs text-slate-500">Min 6m: {formatMoney(ativo.min_6m)}</div>
                      </td>

                      {/* Meta vs Atual (NOVA BARRA MELHORADA) */}
                      <td className="p-4 text-right">
                        <div className="flex justify-between text-xs mb-1">
                           <span className={isOverweight ? 'text-red-400 font-bold' : 'text-blue-300'}>
                             {ativo.pct_atual.toFixed(1)}%
                           </span>
                           <span className="text-slate-500">Meta: {ativo.meta}%</span>
                        </div>
                        <div className="w-32 h-2 bg-slate-700 rounded-full ml-auto overflow-hidden relative" title={`Atingiu ${percentualDaMeta.toFixed(0)}% da meta`}>
                          {/* Barra de Progresso */}
                          <div 
                             className={`h-full transition-all duration-500 ${isOverweight ? 'bg-red-500' : 'bg-blue-500'}`} 
                             style={{ width: `${barraWidth}%` }}
                          ></div>
                          {/* Marcador de 100% da meta (caso estoure, a barra fica vermelha e cheia) */}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        {ativo.falta_comprar > 1 ? (
                          <span className="text-blue-300 font-bold bg-blue-900/20 px-2 py-1 rounded border border-blue-800 text-xs">+{formatMoney(ativo.falta_comprar)}</span>
                        ) : <span className="text-slate-600 text-xs">-</span>}
                      </td>

                      {(tab === 'Ação' || tab === 'Resumo') && (
                        <td className="p-4 text-right text-yellow-100 font-mono">
                          {ativo.vi_graham > 0 ? (
                              <div>{formatMoney(ativo.vi_graham)} <span className={`text-xs ${ativo.mg_graham > 0 ? 'text-green-400' : 'text-red-400'}`}>({ativo.mg_graham.toFixed(0)}%)</span></div>
                          ) : '-'}
                        </td>
                      )}

                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}