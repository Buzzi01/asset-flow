'use client';
import { useState, useEffect } from 'react';
import { Edit2, Save, X, TrendingUp, PieChart, Wallet, DollarSign, Activity, Info, AlertTriangle, Target } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Resumo');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const fetchData = () => {
    fetch('/api/index').then(res => res.json()).then(d => { setData(d); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const formatMoney = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  const saveEdit = async () => {
    await fetch('/api/index', { method: 'POST', body: JSON.stringify(editingItem) });
    setIsModalOpen(false);
    setLoading(true);
    fetchData();
  };

  const categories = [
    { id: 'Resumo', icon: <PieChart size={18} /> },
    { id: 'Radar', icon: <Target size={18} />, label: "Radar" }, // Nova Aba
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

            {/* TABELA PADRÃO (Esconde se estiver no Radar, ou mostra abaixo) */}
            {tab !== 'Radar' && (
            <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4">Ativo</th>
                    <th className="p-4 text-center">Score / Decisão</th>
                    <th className="p-4 text-right">Preço</th>
                    <th className="p-4 text-right">Meta vs Atual</th>
                    <th className="p-4 text-right">Falta Comprar</th>
                    {(tab === 'Ação' || tab === 'Resumo') && <th className="p-4 text-right text-yellow-500">Graham</th>}
                    <th className="p-4 text-center">Ed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredAssets.map((ativo: any) => (
                    <tr key={ativo.ticker} className="hover:bg-slate-800/50 transition-colors group">
                      
                      <td className="p-4">
                        <div className="font-bold text-white text-base">{ativo.ticker}</div>
                        <div className="text-xs text-slate-500">{ativo.tipo} • {ativo.qtd} un.</div>
                      </td>

                      {/* Decisão com Tooltip */}
                      <td className="p-4 text-center group/tooltip relative">
                        <div className="flex flex-col items-center">
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
                        
                        {/* O Tooltip flutuante */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-48 bg-black text-xs text-slate-200 p-2 rounded border border-slate-600 z-50 shadow-xl">
                          <p className="font-bold text-white mb-1 border-b border-slate-700 pb-1">Motivos:</p>
                          {ativo.motivo || "Sem dados suficientes"}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="text-slate-200 font-mono">{formatMoney(ativo.preco_atual)}</div>
                        <div className="text-xs text-slate-500">Min 6m: {formatMoney(ativo.min_6m)}</div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="text-xs text-slate-400 mb-1">{ativo.pct_atual.toFixed(1)}% / {ativo.meta}%</div>
                        <div className="w-24 h-1.5 bg-slate-700 rounded-full ml-auto overflow-hidden">
                          <div className={`h-full ${ativo.pct_atual > ativo.meta ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(ativo.pct_atual, 100)}%` }}></div>
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

                      <td className="p-4 text-center">
                        <button onClick={() => { setEditingItem({...ativo}); setIsModalOpen(true); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"><Edit2 size={16} /></button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Edição (Mantive o mesmo que você já aprovou) */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit2 size={20} className="text-blue-500"/> {editingItem.ticker}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-400 block mb-1">Qtd</label><input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" value={editingItem.qtd} onChange={e => setEditingItem({...editingItem, qtd: parseFloat(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-400 block mb-1">PM</label><input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" value={editingItem.pm} onChange={e => setEditingItem({...editingItem, pm: parseFloat(e.target.value)})} /></div>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">Meta (%)</label><input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" value={editingItem.meta} onChange={e => setEditingItem({...editingItem, meta: parseFloat(e.target.value)})} /></div>
              {(editingItem.tipo === 'Ação' || editingItem.tipo === 'FII') && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-xs font-bold text-blue-400 mb-3 uppercase">Indicadores</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div><label className="text-[10px] text-slate-400 block">VPA</label><input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-1 text-sm text-white" value={editingItem.vpa_manual || ''} onChange={e => setEditingItem({...editingItem, vpa: parseFloat(e.target.value), vpa_manual: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-[10px] text-slate-400 block">Div. Proj 12m (R$)</label><input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-1 text-sm text-white" value={editingItem.dy_proj_12m || ''} onChange={e => setEditingItem({...editingItem, dy: parseFloat(e.target.value), dy_proj_12m: parseFloat(e.target.value)})} /></div>
                  </div>
                  {editingItem.tipo === 'Ação' && (<div><label className="text-[10px] text-slate-400 block">LPA</label><input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-1 text-sm text-white" value={editingItem.lpa_manual || ''} onChange={e => setEditingItem({...editingItem, lpa: parseFloat(e.target.value), lpa_manual: parseFloat(e.target.value)})} /></div>)}
                </div>
              )}
               {(editingItem.tipo === 'Renda Fixa' || editingItem.tipo === 'Reserva') && (
                 <div><label className="text-xs text-slate-400 mb-1 block">Saldo (R$)</label><input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" value={editingItem.valor_fixo} onChange={e => setEditingItem({...editingItem, valor_fixo: parseFloat(e.target.value)})} /></div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-lg text-slate-400 hover:bg-slate-800">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><Save size={18} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}