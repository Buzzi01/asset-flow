'use client';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, PieChart, Wallet, DollarSign, Activity, 
  Target, Info, AlertTriangle, Layers, Snowflake, ArrowUpRight 
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- CORES & UTILITÁRIOS ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
const formatMoney = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

// --- COMPONENTES VISUAIS ---

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
  <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 backdrop-blur-sm flex flex-col justify-between h-full hover:border-slate-600 transition-all">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20`}>
        <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
      </div>
      {subtext && <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded-full">{subtext}</span>}
    </div>
    <div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  </div>
);

const AssetRow = ({ ativo, tab }: { ativo: any, tab: string }) => {
  const percentualDaMeta = ativo.meta > 0 ? (ativo.pct_atual / ativo.meta) * 100 : 0;
  const barraWidth = Math.min(percentualDaMeta, 100);
  const isOverweight = ativo.pct_atual > ativo.meta;
  const magicNumber = ativo.magic_number || 0;
  const atingiuMagic = magicNumber > 0 && ativo.qtd >= magicNumber;

  return (
    <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50 last:border-0 group">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-8 rounded-full opacity-60 group-hover:opacity-100 transition-opacity ${ativo.cor_rec === 'green' ? 'bg-green-500' : ativo.cor_rec === 'blue' ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
          <div>
            <div className="font-bold text-white text-sm">{ativo.ticker}</div>
            <div className="text-[10px] text-slate-500 uppercase">{ativo.tipo} • {ativo.qtd}</div>
          </div>
        </div>
      </td>

      <td className="p-4 text-center">
        <div className="inline-flex flex-col items-center group/tooltip relative cursor-help">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${
            ativo.cor_rec === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
            ativo.cor_rec === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            ativo.cor_rec === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
            'bg-slate-800 text-slate-400 border-slate-700'
          }`}>{ativo.recomendacao}</span>
          <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-slate-950 text-xs text-slate-300 p-3 rounded-lg border border-slate-800 shadow-xl z-50">
            <p className="font-bold text-white mb-1 border-b border-slate-800 pb-1">Análise:</p>
            {ativo.motivo || "Neutro"}
          </div>
        </div>
      </td>

      <td className="p-4 text-right">
        <div className="text-slate-200 font-mono text-sm">{formatMoney(ativo.preco_atual)}</div>
        {ativo.min_6m > 0 && <div className="text-[10px] text-slate-600">Min: {formatMoney(ativo.min_6m)}</div>}
      </td>

      <td className="p-4 text-right w-32 hidden sm:table-cell">
        <div className="flex justify-between text-[10px] mb-1">
           <span className={isOverweight ? 'text-red-400 font-bold' : 'text-blue-300'}>{ativo.pct_atual.toFixed(1)}%</span>
           <span className="text-slate-600">/{ativo.meta}%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 ${isOverweight ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${barraWidth}%` }}></div>
        </div>
      </td>

      <td className="p-4 text-right">
        {ativo.falta_comprar > 1 ? (
          <span className="text-blue-300 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 text-xs">
            +{formatMoney(ativo.falta_comprar)}
          </span>
        ) : <span className="text-slate-700 text-xs">-</span>}
      </td>
      
      {(tab === 'FII' || tab === 'Resumo') && (
        <td className="p-4 text-center hidden lg:table-cell">
           {magicNumber > 0 ? (
             <div className={`text-xs flex flex-col items-center ${atingiuMagic ? 'text-cyan-400' : 'text-slate-600'}`}>
               <span className="flex items-center gap-1 font-mono">
                 {atingiuMagic && <Snowflake size={12}/>} {ativo.qtd}/{magicNumber}
               </span>
             </div>
           ) : <span className="text-slate-800 text-xs">-</span>}
        </td>
      )}

      {(tab === 'Ação' || tab === 'Resumo') && (
        <td className="p-4 text-right hidden lg:table-cell">
          {ativo.vi_graham > 0 ? (
            <div className="font-mono text-xs">
              <span className={ativo.mg_graham > 0 ? 'text-green-500' : 'text-red-500'}>
                {ativo.mg_graham > 0 ? '+' : ''}{ativo.mg_graham.toFixed(0)}%
              </span>
            </div>
          ) : <span className="text-slate-800 text-xs">-</span>}
        </td>
      )}
    </tr>
  );
};

// --- PÁGINA PRINCIPAL ---

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Resumo');

  useEffect(() => { fetch('/api/index').then(res => res.json()).then(d => { setData(d); setLoading(false); }); }, []);

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
        
        {/* ABAS INTEGRADAS NO HEADER */}
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
        
        {/* 1. SECTION: RESUMO EXECUTIVO (KPIs) */}
        {tab === 'Resumo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2">
            {/* KPI 1: Renda Passiva */}
            <StatCard title="Renda Passiva Est." value={formatMoney(data?.resumo?.RendaMensal)} subtext="Mensal" icon={DollarSign} colorClass="bg-green-500 text-green-400"/>
            
            {/* KPI 2: Top Oportunidade */}
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

            {/* KPI 3: Gráfico Mini */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 md:col-span-2 flex items-center">
               <div className="h-24 w-24 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={data?.grafico} cx="50%" cy="50%" innerRadius={35} outerRadius={45} paddingAngle={2} dataKey="value">
                        {data?.grafico?.map((e:any, i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
               </div>
               <div className="ml-4 flex-1 grid grid-cols-2 gap-2">
                  {data?.grafico?.slice(0,4).map((e:any, i:number) => (
                     <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i%COLORS.length]}}></div>
                        <span>{e.name}</span>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* 2. SECTION: RADAR DE RISCO (Aparece se tiver alertas) */}
        {(tab === 'Resumo' || tab === 'Radar') && data?.alertas?.length > 0 && (
           <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div>
                 <h4 className="text-sm font-bold text-red-400 mb-1">Atenção Necessária</h4>
                 <div className="text-xs text-red-200/70 space-y-1">
                    {data.alertas.map((a: string, i: number) => <p key={i}>• {a}</p>)}
                 </div>
              </div>
           </div>
        )}

        {/* 3. SECTION: TABELA PRINCIPAL (Full Width) */}
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
                      <td colSpan={7} className="p-8 text-center text-slate-500">Nenhum ativo encontrado nesta categoria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="text-center text-[10px] text-slate-600 mt-8">
           AssetFlow v2.0 • Dados com delay de 15min
        </div>

      </div>
    </main>
  );
}