'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Resumo');
  
  // Estado para edição
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ lpa: 0, vpa: 0, dy_medio: 0 });

  const fetchData = () => {
    fetch('/api/index')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  };

  useEffect(() => { fetchData(); }, []);

  const formatMoney = (val: number) => val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatPercent = (val: number) => val ? val.toFixed(2) + '%' : '0%';

  const handleEdit = (ativo: any) => {
    setEditingTicker(ativo.ticker);
    setEditForm({ lpa: ativo.lpa, vpa: ativo.vpa, dy_medio: ativo.dy_medio });
  };

  const handleSave = async () => {
    // Envia para o Python salvar
    await fetch('/api/index', {
        method: 'POST',
        body: JSON.stringify({ ticker: editingTicker, ...editForm })
    });
    setEditingTicker(null);
    setLoading(true);
    fetchData(); // Recarrega dados
  };

  const getFilteredAssets = () => {
    if (!data) return [];
    if (activeTab === 'Resumo') return data.ativos;
    if (activeTab === 'Indicadores') return data.ativos.filter((a: any) => a.tipo === 'Ação' || a.tipo === 'FII');
    return data.ativos.filter((a: any) => a.tipo === activeTab);
  };

  const ativosFiltrados = getFilteredAssets();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">AssetFlow</h1>
            <p className="text-slate-400">Dashboard Profissional</p>
          </div>
          <div className="text-right">
             <p className="text-xs text-slate-400 uppercase">Patrimônio</p>
             <p className="text-3xl font-bold text-white">{data ? formatMoney(data.resumo.Total) : '...'}</p>
          </div>
        </header>

        {/* NAVEGAÇÃO */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {['Resumo', 'Indicadores', 'Ação', 'FII', 'Internacional'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {tab === 'Indicadores' ? '⚙️ Editor de Indicadores' : tab}
            </button>
          ))}
        </div>

        {loading ? (
           <p className="text-center text-slate-500 animate-pulse mt-10">Calculando Graham e Bazin...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-2xl bg-slate-900">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase bg-slate-950/50">
                  <th className="p-4">Ativo</th>
                  
                  {activeTab === 'Indicadores' ? (
                    <>
                        <th className="p-4 text-right text-blue-300">LPA (Manual)</th>
                        <th className="p-4 text-right text-blue-300">VPA (Manual)</th>
                        <th className="p-4 text-right text-blue-300">Div. Médio (R$)</th>
                        <th className="p-4 text-right text-gray-400">P/L (Calc)</th>
                        <th className="p-4 text-right text-gray-400">ROE (Calc)</th>
                        <th className="p-4 text-center">Ação</th>
                    </>
                  ) : (
                    <>
                        <th className="p-4 text-right">Preço</th>
                        <th className="p-4 text-right">Aportar</th>
                        {(activeTab !== 'Internacional') && <th className="p-4 text-right text-yellow-400">Graham (Mg%)</th>}
                        {(activeTab !== 'Internacional') && <th className="p-4 text-right text-green-400">Teto 7% (Mg%)</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ativosFiltrados.map((ativo: any) => (
                  <tr key={ativo.ticker} className="hover:bg-slate-800/50 transition-colors">
                    
                    <td className="p-4 font-bold text-white">{ativo.ticker} <span className="text-xs text-slate-500 font-normal">| {ativo.tipo}</span></td>

                    {/* MODO EDIÇÃO (Aba Indicadores) */}
                    {activeTab === 'Indicadores' ? (
                        editingTicker === ativo.ticker ? (
                            <>
                                <td className="p-2"><input type="number" className="bg-slate-700 w-20 p-1 rounded text-right" value={editForm.lpa} onChange={e => setEditForm({...editForm, lpa: parseFloat(e.target.value)})} /></td>
                                <td className="p-2"><input type="number" className="bg-slate-700 w-20 p-1 rounded text-right" value={editForm.vpa} onChange={e => setEditForm({...editForm, vpa: parseFloat(e.target.value)})} /></td>
                                <td className="p-2"><input type="number" className="bg-slate-700 w-20 p-1 rounded text-right" value={editForm.dy_medio} onChange={e => setEditForm({...editForm, dy_medio: parseFloat(e.target.value)})} /></td>
                                <td className="p-4 text-right opacity-50">-</td>
                                <td className="p-4 text-right opacity-50">-</td>
                                <td className="p-2 text-center">
                                    <button onClick={handleSave} className="bg-green-600 px-3 py-1 rounded text-white text-xs hover:bg-green-500">Salvar</button>
                                </td>
                            </>
                        ) : (
                            <>
                                <td className="p-4 text-right font-mono text-blue-200">{ativo.lpa}</td>
                                <td className="p-4 text-right font-mono text-blue-200">{ativo.vpa}</td>
                                <td className="p-4 text-right font-mono text-blue-200">{formatMoney(ativo.dy_medio)}</td>
                                <td className="p-4 text-right text-gray-400">{ativo.p_l.toFixed(1)}</td>
                                <td className="p-4 text-right text-gray-400">{ativo.roe.toFixed(1)}%</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleEdit(ativo)} className="text-slate-400 hover:text-white underline text-xs">Editar</button>
                                </td>
                            </>
                        )
                    ) : (
                        // MODO VISUALIZAÇÃO (Outras Abas)
                        <>
                            <td className="p-4 text-right">{formatMoney(ativo.preco_atual)}</td>
                            <td className="p-4 text-right">
                                {ativo.falta_comprar > 0 ? 
                                    <span className="text-blue-300 font-bold text-xs bg-blue-900/40 px-2 py-1 rounded">+{formatMoney(ativo.falta_comprar)}</span> 
                                    : <span className="text-slate-600 text-xs">Aguardar</span>}
                            </td>
                            
                            {(activeTab !== 'Internacional') && (
                                <>
                                    <td className="p-4 text-right text-yellow-100 font-mono">
                                        {ativo.preco_graham > 0 ? (
                                            <div>{formatMoney(ativo.preco_graham)} <span className={`text-xs ${ativo.margem_graham > 0 ? 'text-green-400' : 'text-red-400'}`}>({ativo.margem_graham.toFixed(0)}%)</span></div>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 text-right text-green-100 font-mono">
                                        {ativo.preco_teto_7 > 0 ? (
                                            <div>{formatMoney(ativo.preco_teto_7)} <span className={`text-xs ${ativo.margem_teto > 0 ? 'text-green-400' : 'text-red-400'}`}>({ativo.margem_teto.toFixed(0)}%)</span></div>
                                        ) : '-'}
                                    </td>
                                </>
                            )}
                        </>
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