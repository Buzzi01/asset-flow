'use client';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, Wallet, DollarSign, Activity, 
  Target, Layers, RefreshCw, AlertTriangle, PiggyBank, BarChart3, LineChart, ArrowUpRight 
} from 'lucide-react';
import { formatMoney } from './utils';
import { StatCard } from './components/StatCard';
import { AssetRow } from './components/AssetRow';
import { AllocationChart } from './components/AllocationChart';
import { RiskRadar } from './components/RiskRadar';
import { HistoryChart } from './components/HistoryChart';
import { CategorySummary } from './components/CategorySummary';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('Resumo');

  const fetchData = (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    const url = force ? '/api/index?force=true' : '/api/index';

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
           const text = await res.text();
           throw new Error(`Erro API: ${res.status} - ${text.substring(0, 50)}...`);
        }
        return res.json();
      })
      .then(d => {
        if(d.status === 'Erro') throw new Error(d.detalhe);
        setData(d);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        console.error(err);
        setError("Erro de conexão. Verifique o terminal preto.");
        setLoading(false);
        setRefreshing(false);
      });

    fetch('/api/history')
      .then(res => res.json())
      .then(h => setHistory(h))
      .catch(console.error);
  };

  useEffect(() => { fetchData(); }, []);

  const categories = [
    { id: 'Resumo', icon: <Layers size={16} /> },
    { id: 'Evolução', icon: <LineChart size={16} /> },
    { id: 'Ação', icon: <TrendingUp size={16} /> },
    { id: 'FII', icon: <Activity size={16} /> },
    { id: 'Internacional', icon: <DollarSign size={16} /> },
    { id: 'Renda Fixa', label: 'Renda Fixa' },
    { id: 'Reserva', label: 'Reserva' },
    { id: 'Cripto', label: 'Cripto' },
    { id: 'Radar', icon: <Target size={16} />, label: "Radar" },
  ];

  const filteredAssets = data?.ativos?.filter((a: any) => tab === 'Radar' || tab === 'Evolução' ? true : a.tipo === tab) || [];
  const topCompras = data?.ativos?.filter((a: any) => a.falta_comprar > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3) || [];
  const lucroTotal = data?.resumo?.LucroTotal || 0;

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
      <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="animate-pulse text-sm">Carregando Inteligência...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-400 gap-4 p-4 text-center">
      <AlertTriangle size={48} />
      <h2 className="text-xl font-bold">Ocorreu um erro</h2>
      <p className="text-sm text-slate-500 max-w-md">{error}</p>
      <button onClick={() => fetchData(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
        <RefreshCw size={16} /> Tentar Novamente
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans selection:bg-blue-500/30 pb-20">
      
      {/* HEADER FIXO */}
      <div className="sticky top-0 z-30 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Wallet className="text-white" size={18} /></div>
            <h1 className="text-lg font-bold text-white tracking-tight">AssetFlow <span className="text-blue-500 text-xs font-normal ml-1">Pro</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={() => fetchData(true)} 
                disabled={refreshing}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-all border border-slate-700 disabled:opacity-50"
                title="Forçar atualização"
             >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
             </button>

             <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Patrimônio Total</p>
                <p className="text-xl font-bold text-white">{data ? formatMoney(data.resumo.Total) : '...'}</p>
             </div>
          </div>
        </div>
        
        {/* ABAS */}
        <div className="max-w-7xl mx-auto px-4 flex gap-4 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button key={c.id} onClick={() => setTab(c.id)} 
              className={`flex items-center gap-2 px-1 py-3 text-xs font-medium transition-all relative border-b-2 ${
                tab === c.id 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {c.icon}{c.label || c.id}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* ==================================================================================== */}
        {/* DASHBOARD EXECUTIVO (Resumo Limpo) */}
        {/* ==================================================================================== */}
        {tab === 'Resumo' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* 1. LINHA SUPERIOR: KPIs (Cards Limpos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Renda Passiva Est." value={formatMoney(data?.resumo?.RendaMensal)} subtext="Mensal" icon={DollarSign} colorClass="text-green-400"/>
              <StatCard title="Total Investido" value={formatMoney(data?.resumo?.TotalInvestido)} subtext="Custo" icon={PiggyBank} colorClass="text-blue-400"/>
              <StatCard title="Lucro / Prejuízo" value={(lucroTotal > 0 ? '+' : '') + formatMoney(lucroTotal)} subtext="Nominal" icon={BarChart3} colorClass={lucroTotal >= 0 ? "text-green-400" : "text-red-400"}/>
              
              {/* Card de Melhor Aporte (Estilo KPI) */}
              <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 flex flex-col justify-between h-full relative overflow-hidden group hover:border-slate-600 transition-colors">
                 <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target size={40} className="text-blue-400" />
                 </div>
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Top Pick</span>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Melhor Oportunidade</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                         <TrendingUp size={20} className="text-blue-400"/>
                    </div>
                 </div>
                 <div>
                    {topCompras.length > 0 ? (
                      <div className="flex items-end gap-2">
                         <h3 className="text-2xl font-bold text-white tracking-tight">{topCompras[0].ticker}</h3>
                         <span className="text-xs text-green-400 mb-1.5 font-bold flex items-center">
                            <ArrowUpRight size={12}/> {topCompras[0].recomendacao}
                         </span>
                      </div>
                    ) : <p className="text-slate-500 text-sm">Sem sugestões.</p>}
                 </div>
              </div>
            </div>

            {/* 2. LINHA CENTRAL: VISÃO GERAL (Tabela + Pizza) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
               
               {/* Coluna Esquerda (Menor): Alocação (Pizza) */}
               <div className="flex flex-col h-full">
                  <AllocationChart data={data?.grafico} />
                  {/* Se houver alertas, eles aparecem aqui, discretos, embaixo do gráfico */}
                  <div className="mt-4">
                      <RiskRadar alertas={data?.alertas} />
                  </div>
               </div>

               {/* Coluna Direita (Maior): Tabela Consolidada */}
               <div className="lg:col-span-2 flex flex-col h-full">
                   <CategorySummary ativos={data?.ativos} />
               </div>
            </div>
            
          </div>
        )}

        {/* ==================================================================================== */}
        {/* OUTRAS ABAS (EVOLUÇÃO, RADAR, ETC) */}
        {/* ==================================================================================== */}
        {tab === 'Evolução' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 h-[500px]">
              <HistoryChart data={history} />
           </div>
        )}

        {(tab === 'Radar') && (
           <RiskRadar alertas={data?.alertas} />
        )}

        {/* TABELA DE ATIVOS */}
        {tab !== 'Resumo' && tab !== 'Radar' && tab !== 'Evolução' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4 pl-6">Ativo</th>
                    <th className="p-4 text-right">Minha Posição</th>
                    <th className="p-4 text-right hidden sm:table-cell">Preço</th>
                    <th className="p-4 text-right">Resultado</th>
                    <th className="p-4 text-right hidden md:table-cell">Meta</th>
                    <th className="p-4 text-right">Aporte</th>
                    {(tab === 'Ação' || tab === 'FII') && (
                        <th className="p-4 text-center hidden lg:table-cell w-24">Indicadores</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredAssets.length > 0 ? (
                    filteredAssets.map((ativo: any) => (
                      <AssetRow key={ativo.ticker} ativo={ativo} tab={tab} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">Nenhum ativo encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="text-center text-[10px] text-slate-600 mt-12 mb-4">AssetFlow v6.0 (Clean Design)</div>
      </div>
    </main>
  );
}