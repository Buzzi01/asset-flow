'use client';
import { useState, useEffect } from 'react';
import { Edit2, Save, X, TrendingUp, PieChart, Wallet, DollarSign, Activity } from 'lucide-react';

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
  const formatPct = (v: number) => (v ? v.toFixed(1) + '%' : '0%');

  const saveEdit = async () => {
    await fetch('/api/index', { method: 'POST', body: JSON.stringify(editingItem) });
    setIsModalOpen(false);
    setLoading(true);
    fetchData();
  };

  const categories = [
    { id: 'Resumo', icon: <PieChart size={18} /> },
    { id: 'Ação', icon: <TrendingUp size={18} /> },
    { id: 'FII', icon: <Activity size={18} /> },
    { id: 'Internacional', icon: <DollarSign size={18} /> },
    { id: 'Renda Fixa', label: 'Renda Fixa' },
    { id: 'Reserva', label: 'Reserva' },
    { id: 'Cripto', label: 'Cripto' },
  ];

  const filteredAssets = data?.ativos?.filter((a: any) => tab === 'Resumo' ? true : a.tipo === tab) || [];

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      
      {/* 1. Navbar Topo */}
      <div className="bg-[#1e293b] border-b border-slate-700 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg"><Wallet className="text-white" /></div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AssetFlow <span className="text-blue-400 text-sm font-normal">Pro</span></h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Patrimônio Total</p>
            <p className="text-2xl font-bold text-white">{data ? formatMoney(data.resumo.Total) : '...'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* 2. Tabs de Navegação */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                tab === c.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105' 
                  : 'bg-[#1e293b] text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {c.icon}{c.label || c.id}
            </button>
          ))}
        </div>

        {/* 3. Tabela Principal */}
        {loading ? (
           <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div></div>
        ) : (
          <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f172a] text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4">Ativo</th>
                  <th className="p-4 text-center">Recomendação</th>
                  <th className="p-4 text-right">Preço</th>
                  <th className="p-4 text-right">Meta vs Atual</th>
                  <th className="p-4 text-right">Falta Comprar</th>
                  {(tab === 'Ação' || tab === 'Resumo') && <th className="p-4 text-right text-yellow-500">Graham (Mg%)</th>}
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredAssets.map((ativo: any) => (
                  <tr key={ativo.ticker} className="hover:bg-slate-800/50 transition-colors group">
                    
                    {/* Ativo */}
                    <td className="p-4">
                      <div className="font-bold text-white text-base">{ativo.ticker}</div>
                      <div className="text-xs text-slate-500">{ativo.tipo} • {ativo.qtd} un.</div>
                    </td>

                    {/* Recomendação (O JUIZ) */}
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        ativo.cor_rec === 'green' ? 'bg-green-900/30 text-green-400 border-green-700' :
                        ativo.cor_rec === 'blue' ? 'bg-blue-900/30 text-blue-400 border-blue-700' :
                        ativo.cor_rec === 'yellow' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' :
                        'bg-slate-800 text-slate-400 border-slate-600'
                      }`}>
                        {ativo.recomendacao}
                      </span>
                    </td>

                    {/* Preço */}
                    <td className="p-4 text-right">
                      <div className="text-slate-200 font-mono">{formatMoney(ativo.preco_atual)}</div>
                      <div className="text-xs text-slate-500">PM: {formatMoney(ativo.pm)}</div>
                    </td>

                    {/* Meta vs Atual */}
                    <td className="p-4 text-right">
                      <div className="text-xs text-slate-400 mb-1">{ativo.pct_atual.toFixed(1)}% / {ativo.meta}%</div>
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full ml-auto overflow-hidden">
                        <div className={`h-full ${ativo.pct_atual > ativo.meta ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(ativo.pct_atual, 100)}%` }}></div>
                      </div>
                    </td>

                    {/* Falta Comprar */}
                    <td className="p-4 text-right">
                      {ativo.falta_comprar > 1 ? (
                        <span className="text-blue-300 font-bold bg-blue-900/20 px-2 py-1 rounded border border-blue-800">
                          +{formatMoney(ativo.falta_comprar)}
                        </span>
                      ) : <span className="text-slate-600">-</span>}
                    </td>

                    {/* Graham (Só Ações) */}
                    {(tab === 'Ação' || tab === 'Resumo') && (
                       <td className="p-4 text-right font-mono text-yellow-100">
                         {ativo.vi_graham > 0 ? (
                           <>
                             <div>{formatMoney(ativo.vi_graham)}</div>
                             <div className={`text-xs ${ativo.mg_graham > 0 ? 'text-green-400' : 'text-red-400'}`}>
                               Mg: {ativo.mg_graham.toFixed(0)}%
                             </div>
                           </>
                         ) : <span className="text-slate-700">-</span>}
                       </td>
                    )}

                    {/* Botão Editar */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => { setEditingItem({...ativo}); setIsModalOpen(true); }}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL DE EDIÇÃO (Pop-up Profissional) */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 size={20} className="text-blue-500"/> Editar {editingItem.ticker}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Quantidade</label>
                  <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" 
                         value={editingItem.qtd} onChange={e => setEditingItem({...editingItem, qtd: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Preço Médio (PM)</label>
                  <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" 
                         value={editingItem.pm} onChange={e => setEditingItem({...editingItem, pm: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Meta na Carteira (%)</label>
                <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" 
                       value={editingItem.meta} onChange={e => setEditingItem({...editingItem, meta: parseFloat(e.target.value)})} />
              </div>

              {/* Campos Fundamentalistas (Só aparecem para Ação/FII) */}
              {(editingItem.tipo === 'Ação' || editingItem.tipo === 'FII') && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-xs font-bold text-blue-400 mb-3 uppercase">Indicadores Fundamentalistas</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block">LPA (Lucro/Ação)</label>
                      <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-1 text-sm text-white" 
                             value={editingItem.lpa_manual || ''} 
                             onChange={e => setEditingItem({...editingItem, lpa: parseFloat(e.target.value), lpa_manual: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">VPA (Valor Patr.)</label>
                      <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-1 text-sm text-white" 
                             value={editingItem.vpa_manual || ''} 
                             onChange={e => setEditingItem({...editingItem, vpa: parseFloat(e.target.value), vpa_manual: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Div. Proj (R$)</label>
                      <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-1 text-sm text-white" 
                             value={editingItem.dy_proj_12m || ''} 
                             onChange={e => setEditingItem({...editingItem, dy: parseFloat(e.target.value), dy_proj_12m: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                </div>
              )}

              {(editingItem.tipo === 'Renda Fixa' || editingItem.tipo === 'Reserva') && (
                 <div>
                    <label className="text-xs text-slate-400 mb-1 block">Saldo Atualizado (R$)</label>
                    <input type="number" className="w-full bg-[#0f172a] border border-slate-600 rounded p-2 text-white" 
                           value={editingItem.valor_fixo} onChange={e => setEditingItem({...editingItem, valor_fixo: parseFloat(e.target.value)})} />
                 </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-lg text-slate-400 hover:bg-slate-800 transition">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/40">
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}