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

// --- COMPONENTES VISUAIS REUTILIZÁVEIS ---

// 1. Card de Estatística Principal (Topo)
const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm flex items-start justify-between hover:border-slate-600 transition-all">
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl md:text-3xl font-bold text-white">{value}</h3>
      {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20`}>
      <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
    </div>
  </div>
);

// 2. Gráfico de Alocação
const AllocationChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 h-[320px] flex flex-col">
      <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2"><PieChart size={18}/> Alocação de Ativos</h3>
      <div className="flex-1 w-full h-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie 
              data={data} 
              cx="50%" cy="50%" 
              innerRadius={60} 
              outerRadius={80} 
              paddingAngle={5} 
              dataKey="value"
              stroke="none"
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatMoney(value)} 
              contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff'}} 
              itemStyle={{color: '#fff'}} 
            />
            <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
          </RePieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. Card de Oportunidades (Top 3)
const OpportunitiesCard = ({ assets }: { assets: any[] }) => {
  const top = assets.filter((a: any) => a.falta_comprar > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3);
  
  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-green-900/30 h-full">
      <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2"><TrendingUp size={18}/> Top Oportunidades</h3>
      <div className="space-y-3">
        {top.length > 0 ? top.map((ativo: any) => (
          <div key={ativo.ticker} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700 hover:border-green-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">{ativo.ticker.substring(0,2)}</div>
              <div>
                <div className="font-bold text-white text-sm">{ativo.ticker}</div>
                <div className="text-[10px] text-slate-400 max-w-[120px] truncate">{ativo.motivo}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold text-sm">+{formatMoney(ativo.falta_comprar)}</div>
              <div className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded inline-block mt-1">Score: {ativo.score}</div>
            </div>
          </div>
        )) : <p className="text-slate-500 text-sm italic">Sem oportunidades claras no momento.</p>}
      </div>
    </div>
  );
};

// 4. Card de Alertas/Riscos
const RiskCard = ({ alertas }: { alertas: string[] }) => (
  <div className="bg-slate-800/50 p-6 rounded-2xl border border-red-900/30 h-full">
    <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={18}/> Radar de Risco</h3>
    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
      {alertas && alertas.length > 0 ? alertas.map((alerta: string, idx: number) => (
        <div key={idx} className="bg-red-950/20 text-red-200 p-3 rounded-lg text-xs border border-red-900/30 flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>{alerta}</span>
        </div>
      )) : (
        <div className="flex flex-col items-center justify-center h-32 text-slate-500">
          <Activity size={32} className="mb-2 opacity-20"/>
          <p className="text-sm">Carteira Balanceada</p>
        </div>
      )}
    </div>
  </div>
);

// 5. Linha da Tabela
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
          <div className="w-1 h-8 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div>
            <div className="font-bold text-white">{ativo.ticker}</div>
            <div className="text-[10px] text-slate-500 uppercase">{ativo.tipo}</div>
          </div>
        </div>
      </td>

      <td className="p-4 text-center">
        <div className="inline-flex flex-col items-center group/tooltip relative cursor-help">
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${
            ativo.cor_rec === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
            ativo.cor_rec === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            ativo.cor_rec === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
            'bg-slate-800 text-slate-400 border-slate-700'
          }`}>{ativo.recomendacao}</span>
          {ativo.score > 0 && <span className="text-[9px] text-slate-600 mt-1">Score: {ativo.score}</span>}
          
          <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-slate-900 text-xs text-slate-300 p-3 rounded-lg border border-slate-700 shadow-xl z-50">
            <p className="font-bold text-white mb-1 border-b border-slate-800 pb-1">Motivo:</p>
            {ativo.motivo || "Neutro"}
          </div>
        </div>
      </td>

      <td className="p-4 text-right">
        <div className="text-slate-200 font-mono">{formatMoney(ativo.preco_atual)}</div>
        {ativo.min_6m > 0 && (
          <div className={`text-[10px] ${ativo.preco_atual <= ativo.min_6m * 1.05 ? 'text-green-400' : 'text-slate-600'}`}>
            Min 6m: {formatMoney(ativo.min_6m)}
          </div>
        )}
      </td>

      <td className="p-4 text-right w-36 hidden sm:table-cell">
        <div className="flex justify-between text-[10px] mb-1.5">
           <span className={isOverweight ? 'text-red-400 font-bold' : 'text-blue-300'}>{ativo.pct_atual.toFixed(1)}%</span>
           <span className="text-slate-500">Meta: {ativo.meta}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 ${isOverweight ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${barraWidth}%` }}></div>
        </div>
      </td>

      <td className="p-4 text-right">
        {ativo.falta_comprar > 1 ? (
          <span className="text-blue-300 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 text-xs whitespace-nowrap">
            + {formatMoney(ativo.falta_comprar)}
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
              <div className="text-yellow-100">{formatMoney(ativo.vi_graham)}</div>
              <div className={ativo.mg_graham > 0 ? 'text-green-500' : 'text-red-500'}>
                {ativo.mg_graham > 0 ? '+' : ''}{ativo.mg_graham.toFixed(0)}%
              </div>
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

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="animate-pulse text-sm">Carregando Inteligência...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* 1. HEADER LIMPO */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <Wallet className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">AssetFlow</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Dashboard Premium</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500 font-mono">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* 2. CARDS DE KPI (Resumo Topo) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Patrimônio Total" 
            value={formatMoney(data?.resumo?.Total)} 
            subtext="Valor atualizado de mercado"
            icon={Wallet} 
            colorClass="bg-blue-500 text-blue-400"
          />
          <StatCard 
            title="Renda Passiva Est." 
            value={formatMoney(data?.resumo?.RendaMensal)} 
            subtext="Média mensal projetada (DY)"
            icon={DollarSign} 
            colorClass="bg-green-500 text-green-400"
          />
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={80} /></div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">Status da Meta</p>
            <h3 className="text-2xl font-bold text-white">Em Progresso</h3>
            <button className="mt-3 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 py-1.5 px-3 rounded-lg w-fit flex items-center gap-1 transition-colors">
              Ver Detalhes <ArrowUpRight size={12}/>
            </button>
          </div>
        </div>

        {/* 3. NAVEGAÇÃO DE ABAS */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-800/50">
          {categories.map((c) => (
            <button key={c.id} onClick={() => setTab(c.id)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all relative top-[1px] whitespace-nowrap ${
                tab === c.id 
                ? 'bg-slate-800/50 text-white border-b-2 border-blue-500' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
              }`}>
              {c.icon}{c.label || c.id}
            </button>
          ))}
        </div>

        {/* 4. CONTEÚDO PRINCIPAL (DASHBOARD GRID) */}
        {tab === 'Radar' ? (
          <div className="grid md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <OpportunitiesCard assets={data?.ativos} />
            <RiskCard alertas={data?.alertas} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* Coluna Esquerda: Gráfico + Radar Mini */}
            <div className="lg:col-span-1 space-y-6">
              {tab === 'Resumo' && (
                <>
                  <AllocationChart data={data?.grafico} />
                  <OpportunitiesCard assets={data?.ativos} />
                  <RiskCard alertas={data?.alertas} />
                </>
              )}
              {/* Se não for resumo, mostra apenas Info da Categoria */}
              {tab !== 'Resumo' && (
                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-800 text-center">
                  <p className="text-slate-500 text-sm">Filtro Ativo</p>
                  <h2 className="text-2xl font-bold text-white mb-2">{tab}</h2>
                  <div className="text-xs text-slate-400">
                    Mostrando {filteredAssets.length} ativos
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Direita: Tabela de Ativos (Ocupa 2/3) */}
            <div className={`lg:col-span-${tab === 'Resumo' ? '2' : '3'} bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Ativo</th>
                      <th className="p-4 text-center">Análise</th>
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

          </div>
        )}
      </div>
    </main>
  );
}