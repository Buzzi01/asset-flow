'use client';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, Wallet, DollarSign, Activity, 
  Target, Layers, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { formatMoney } from './utils';
import { StatCard } from './components/StatCard';
import { AssetRow } from './components/AssetRow';
import { AllocationChart } from './components/AllocationChart';
import { RiskRadar } from './components/RiskRadar';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('Resumo');

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch('/api/index')
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
      })
      .catch(err => {
        console.error(err);
        setError("Não foi possível carregar os dados. Verifique se o backend.py está rodando.");
        setLoading(false);
      });
  };

  useEffect(() => { fetchData(); }, []);

  const categories = [
    { id: 'Resumo', icon: <Layers size={16} /> },
    { id: 'Ação', icon: <TrendingUp size={16} /> },
    { id: 'FII', icon: <Activity size={16} /> },
    { id: 'Internacional', icon: <DollarSign size={16} /> },
    { id: 'Renda Fixa', label: 'Renda Fixa' },
    { id: 'Reserva', label: 'Reserva' },
    { id: 'Cripto', label: 'Cripto' },
    { id: 'Radar', icon: <Target size={16} />, label: "Radar" },
  ];

  const filteredAssets = data?.ativos?.filter((a: any) => tab === 'Resumo' || tab === 'Radar' ? true : a.tipo === tab) || [];
  const topCompras = data?.ativos?.filter((a: any) => a.falta_comprar > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3) || [];

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
      <button onClick={fetchData} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
        <RefreshCw size={16} /> Tentar Novamente
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans selection:bg-blue-500/30 pb-20">
      
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Wallet className="text-white" size={18} /></div>
            <h1 className="text-lg font-bold text-white tracking-tight">AssetFlow <span className="text-blue-500 text-xs font-normal ml-1">Pro</span></h1>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-slate-500 uppercase font-bold">Patrimônio Total</p>
             <p className="text-xl font-bold text-white">{data ? formatMoney(data.resumo.Total) : '...'}</p>
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

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* SECTION: KPI & GRÁFICOS */}
        {tab === 'Resumo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2">
            <StatCard title="Renda Passiva Est." value={formatMoney(data?.resumo?.RendaMensal)} subtext="Mensal" icon={DollarSign} colorClass="bg-green-500 text-green-400"/>
            
            <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 flex flex-col justify-between h-full">
               <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-blue-500/20"><TrendingUp size={20} className="text-blue-400"/></div>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20">Top Pick</span>
               </div>
               <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Melhor Aporte</p>
                  {topCompras.length > 0 ? (
                    <div>
                       <h3 className="text-xl font-bold text-white">{topCompras[0].ticker}</h3>
                       <p className="text-xs text-green-400">+{formatMoney(topCompras[0].falta_comprar)}</p>
                    </div>
                  ) : <p className="text-slate-500 text-sm">Sem sugestões.</p>}
               </div>
            </div>

            <AllocationChart data={data?.grafico} />
          </div>
        )}

        {/* SECTION: ALERTAS */}
        {(tab === 'Resumo' || tab === 'Radar') && (
           <RiskRadar alertas={data?.alertas} />
        )}

        {/* SECTION: TABELA */}
        {tab !== 'Radar' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl animate-in slide-in-from-bottom-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Ativo</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Preço</th>
                    <th className="p-4 text-right hidden sm:table-cell">Meta</th>
                    <th className="p-4 text-right">Aporte</th>
                    {(tab === 'FII' || tab === 'Resumo') && <th className="p-4 text-center hidden lg:table-cell">Bola de Neve</th>}
                    {(tab === 'Ação' || tab === 'Resumo') && <th className="p-4 text-right hidden lg:table-cell">Graham</th>}
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
        
        <div className="text-center text-[10px] text-slate-600 mt-8">AssetFlow v3.0 Desktop</div>
      </div>
    </main>
  );
}