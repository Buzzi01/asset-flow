'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Wallet, DollarSign, Activity, Target, Info, AlertTriangle, Layers, Snowflake } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const RadarView = ({ assets, alertas, rendaMensal }: any) => {
  const topCompras = assets
    .filter((a: any) => a.falta_comprar > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);

  const formatMoney = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8 animate-in fade-in duration-500">
      
      {/* CARD RENDA PASSIVA */}
      <div className="bg-[#1e293b] p-6 rounded-xl border border-blue-900/30 shadow-lg flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase">Renda Passiva Estimada</h3>
          <p className="text-3xl font-bold text-white mt-2">{formatMoney(rendaMensal)} <span className="text-sm font-normal text-slate-500">/mês</span></p>
        </div>
        <div className="mt-4 text-xs text-blue-300 bg-blue-900/20 p-2 rounded border border-blue-800/30">
          Baseado no DY projetado
        </div>
      </div>

      <div className="bg-[#1e293b] p-6 rounded-xl border border-green-900/30 shadow-lg md:col-span-1">
        <h3 className="text-lg font-bold text-green-400 flex items-center gap-2 mb-4">
          <TrendingUp /> Top Oportunidades
        </h3>
        <div className="space-y-3">
          {topCompras.length > 0 ? topCompras.map((ativo: any) => (
            <div key={ativo.ticker} className="flex justify-between items-center bg-[#0f172a] p-3 rounded-lg border border-slate-700">
              <div>
                <div className="font-bold text-white">{ativo.ticker}</div>
                <div className="text-[10px] text-slate-400">{ativo.motivo}</div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold">+{formatMoney(ativo.falta_comprar)}</div>
                <div className="text-[10px] text-slate-500">Score: {ativo.score}</div>
              </div>
            </div>
          )) : <p className="text-slate-500 text-sm">Nenhuma oportunidade clara.</p>}
        </div>
      </div>

      <div className="bg-[#1e293b] p-6 rounded-xl border border-red-900/30 shadow-lg">
        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
          <AlertTriangle /> Radar de Risco
        </h3>
        <div className="space-y-2">
          {alertas && alertas.length > 0 ? alertas.map((alerta: string, idx: number) => (
            <div key={idx} className="bg-red-900/20 text-red-200 p-2 rounded text-xs border border-red-900/50">
              {alerta}
            </div>
          )) : <p className="text-slate-500 text-sm">Carteira balanceada.</p>}
        </div>
      </div>
    </div>
  );
};

const AssetRow = ({ ativo, tab }: { ativo: any, tab: string }) => {
  const formatMoney = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const percentualDaMeta = ativo.meta > 0 ? (ativo.pct_atual / ativo.meta) * 100 : 0;
  const barraWidth = Math.min(percentualDaMeta, 100);
  const isOverweight = ativo.pct_atual > ativo.meta;
  
  // Dados Magic Number
  const magicNumber = ativo.magic_number || 0;
  const atingiuMagic = magicNumber > 0 && ativo.qtd >= magicNumber;

  return (
    <tr className="hover:bg-slate-800/50 transition-colors group border-b border-slate-700/50 last:border-0">
      <td className="p-4">
        <div className="font-bold text-white text-base">{ativo.ticker}</div>
        <div className="text-xs text-slate-500">{ativo.tipo} • {ativo.qtd} un.</div>
      </td>

      <td className="p-4 text-center group/tooltip relative cursor-help">
        <div className="flex flex-col items-center">
          <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase mb-1 ${
            ativo.cor_rec === 'green' ? 'bg-green-900/30 text-green-400 border-green-700' :
            ativo.cor_rec === 'blue' ? 'bg-blue-900/30 text-blue-400 border-blue-700' :
            ativo.cor_rec === 'yellow' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' :
            'bg-slate-800 text-slate-400 border-slate-600'
          }`}>{ativo.recomendacao}</span>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
             Score: {ativo.score}
          </div>
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-48 bg-black/90 text-xs text-slate-200 p-2 rounded border border-slate-600 z-50 shadow-xl backdrop-blur-sm">
          <p className="font-bold text-white mb-1 border-b border-slate-700 pb-1">Análise:</p>
          {ativo.motivo || "Neutro"}
        </div>
      </td>

      <td className="p-4 text-right">
        <div className="text-slate-200 font-mono">{formatMoney(ativo.preco_atual)}</div>
        {ativo.min_6m > 0 && <div className="text-xs text-slate-500">Min 6m: {formatMoney(ativo.min_6m)}</div>}
      </td>

      <td className="p-4 text-right hidden md:table-cell">
        <div className="flex justify-between text-xs mb-1">
           <span className={isOverweight ? 'text-red-400 font-bold' : 'text-blue-300'}>
             {ativo.pct_atual.toFixed(1)}%
           </span>
           <span className="text-slate-500">Meta: {ativo.meta}%</span>
        </div>
        <div className="w-full min-w-[100px] h-2 bg-slate-700 rounded-full ml-auto overflow-hidden relative">
          <div 
             className={`h-full transition-all duration-500 ${isOverweight ? 'bg-red-500' : 'bg-blue-500'}`} 
             style={{ width: `${barraWidth}%` }}
          ></div>
        </div>
      </td>

      <td className="p-4 text-right">
        {ativo.falta_comprar > 1 ? (
          <span className="text-blue-300 font-bold bg-blue-900/20 px-2 py-1 rounded border border-blue-800 text-xs shadow-sm">+{formatMoney(ativo.falta_comprar)}</span>
        ) : <span className="text-slate-600 text-xs">-</span>}
      </td>
      
      {/* Coluna Bola de Neve (Magic Number) */}
      {(tab === 'FII' || tab === 'Resumo') && (
        <td className="p-4 text-center hidden lg:table-cell">
           {magicNumber > 0 ? (
             <div className={`text-xs flex flex-col items-center ${atingiuMagic ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
               <span className="flex items-center gap-1">
                 {atingiuMagic && <Snowflake size={12}/>} {ativo.qtd} / {magicNumber}
               </span>
               {!atingiuMagic && <span className="text-[10px] opacity-70">Faltam {magicNumber - ativo.qtd}</span>}
             </div>
           ) : '-'}
        </td>
      )}

      {(tab === 'Ação' || tab === 'Resumo') && (
        <td className="p-4 text-right text-yellow-100 font-mono hidden md:table-cell">
          {ativo.vi_graham > 0 ? (
              <div>{formatMoney(ativo.vi_graham)} <span className={`text-xs ${ativo.mg_graham > 0 ? 'text-green-400' : 'text-red-400'}`}>({ativo.mg_graham.toFixed(0)}%)</span></div>
          ) : '-'}
        </td>
      )}
    </tr>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Resumo');

  const fetchData = () => {
    fetch('/api/index').then(res => res.json()).then(d => { setData(d); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const formatMoney = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  const categories = [
    { id: 'Resumo', icon: <PieChart size={18} /> },
    { id: 'Radar', icon: <Target size={18} />, label: "Radar" }, // No Final? Não, geralmente Radar é bom perto do Resumo, mas vou seguir seu pedido de antes se quiser mover. Por padrão deixei aqui em 2o.
    { id: 'Ação', icon: <TrendingUp size={18} /> },
    { id: 'FII', icon: <Activity size={18} /> },
    { id: 'Internacional', icon: <DollarSign size={18} /> },
    { id: 'Renda Fixa', label: 'Renda Fixa', icon: <Layers size={18}/> },
    { id: 'Reserva', label: 'Reserva', icon: <Wallet size={18}/> },
    { id: 'Cripto', label: 'Cripto' },
  ];
  
  // Se quiser Radar no final, é só mudar a ordem no array acima.

  const filteredAssets = data?.ativos?.filter((a: any) => tab === 'Resumo' || tab === 'Radar' ? true : a.tipo === tab) || [];

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      
      {/* Navbar */}
      <div className="bg-[#1e293b] border-b border-slate-700 p-4 sticky top-0 z-10 shadow-lg backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-blue-500/20 shadow-lg"><Wallet className="text-white" /></div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AssetFlow <span className="text-blue-400 text-sm font-normal">Sênior</span></h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Patrimônio</p>
            <p className="text-2xl font-bold text-white tracking-tight">{data ? formatMoney(data.resumo.Total) : '...'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Navegação */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
          {categories.map((c) => (
            <button key={c.id} onClick={() => setTab(c.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap border ${
                tab === c.id 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-[#1e293b] border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              {c.icon}{c.label || c.id}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading ? (
           <div className="flex flex-col items-center justify-center py-32 opacity-50">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
             <p className="text-sm">Analisando mercado...</p>
           </div>
        ) : (
          <>
            {/* GRÁFICO (Só no Resumo) */}
            {tab === 'Resumo' && data?.grafico && (
               <div className="grid md:grid-cols-2 gap-6 mb-8 animate-in fade-in">
                  <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 h-[300px]">
                     <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase text-center">Alocação Atual</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                           <Pie data={data.grafico} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {data.grafico.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                           </Pie>
                           <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}} itemStyle={{color: '#fff'}} />
                           <Legend />
                        </RePieChart>
                     </ResponsiveContainer>
                  </div>
                  {/* Radar embutido no Resumo tbm para facilitar */}
                  <RadarView assets={data?.ativos} alertas={data?.alertas} rendaMensal={data?.resumo?.RendaMensal} />
               </div>
            )}

            {/* VIEW RADAR (Aba Separada) */}
            {tab === 'Radar' && <RadarView assets={data?.ativos} alertas={data?.alertas} rendaMensal={data?.resumo?.RendaMensal} />}

            {/* TABELA PADRÃO */}
            {tab !== 'Radar' && (
            <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-2xl overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-xs font-semibold tracking-wider">
                  <tr>
                    <th className="p-4">Ativo</th>
                    <th className="p-4 text-center">Score</th>
                    <th className="p-4 text-right">Preço</th>
                    <th className="p-4 text-right hidden md:table-cell">Meta</th>
                    <th className="p-4 text-right">Aporte</th>
                    {(tab === 'FII' || tab === 'Resumo') && <th className="p-4 text-center hidden lg:table-cell" title="Cotas para comprar 1 nova com dividendos">Magic Nº</th>}
                    {(tab === 'Ação' || tab === 'Resumo') && <th className="p-4 text-right text-yellow-500 hidden md:table-cell">Graham</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredAssets.map((ativo: any) => (
                    <AssetRow key={ativo.ticker} ativo={ativo} tab={tab} />
                  ))}
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