'use client';
import { useState } from 'react';
import { formatMoney } from '../utils';
import { Asset } from '../types';
import { usePrivacy } from '../context/PrivacyContext';
import { PieChart, Pencil, X, Save, Lock } from 'lucide-react'; // Importei o Lock para ilustrar

interface CategorySummaryProps {
  ativos: Asset[];
  categorias?: { name: string; meta: number }[];
  onUpdate: () => void;
}

export const CategorySummary = ({ ativos, categorias = [], onUpdate }: CategorySummaryProps) => {
  const { isHidden } = usePrivacy();
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [newMeta, setNewMeta] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calcula limite dinâmico para o slider
  const getMaxAllowed = (catName: string) => {
    // Soma a meta de TODAS as categorias, EXCETO a que estamos editando agora
    const otherCatsTotal = categorias
      .filter(c => c.name !== catName)
      .reduce((acc, c) => acc + c.meta, 0);
    
    // O máximo permitido é o que sobra para chegar a 100%
    // Math.max(0, ...) garante que não dê número negativo se a conta já tiver estourado
    return Math.max(0, 100 - otherCatsTotal);
  };

  if (!ativos || ativos.length === 0) return null;

  // 1. Agrupar e Somar (Lógica padrão)
  const groups = ativos.reduce((acc: any, asset) => {
    const cat = asset.tipo;
    if (!acc[cat]) {
      acc[cat] = { tipo: cat, investido: 0, atual: 0 };
    }
    acc[cat].investido += asset.total_investido;
    acc[cat].atual += asset.total_atual;
    return acc;
  }, {});

  const lista = Object.values(groups) as any[];
  const totalInvestidoGeral = lista.reduce((acc, item) => acc + item.investido, 0);
  const totalAtualGeral = lista.reduce((acc, item) => acc + item.atual, 0);

  // Soma Total para o Rodapé
  const totalMetaConfigurada = lista.reduce((acc, item) => {
     const catInfo = categorias.find(c => c.name === item.tipo);
     return acc + (catInfo ? catInfo.meta : 0);
  }, 0);

  lista.sort((a, b) => b.atual - a.atual);

  const handleEdit = (catName: string, currentMeta: number) => {
    setEditingCat({ name: catName });
    setNewMeta(currentMeta);
  };

  const handleSave = async () => {
    if (!editingCat) return;
    setLoading(true);
    try {
      await fetch('http://localhost:5328/api/update_category_meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editingCat.name, meta: Number(newMeta) }),
      });
      setEditingCat(null);
      onUpdate();
    } catch (error) {
      alert("Erro ao salvar meta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl animate-in fade-in flex flex-col h-full overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 shrink-0 flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
            <PieChart size={16} className="text-blue-400" />
          </div>
          <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wide">Consolidação por Classe</h3>
        </div>
        
        {/* Tabela */}
        <div className="flex-1 w-full overflow-auto custom-scrollbar">
          <table className="w-full h-full text-left text-sm">
            <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 pl-6 bg-slate-900/90">Descrição</th>
                <th className="px-4 py-3 text-right bg-slate-900/90">Inves. R$</th>
                <th className="px-4 py-3 text-right text-white bg-slate-900/90">Atual R$</th>
                <th className="px-4 py-3 text-right bg-slate-900/90">% Inves.</th>
                <th className="px-4 py-3 text-right text-blue-400 bg-slate-900/90">% Atual</th>
                <th className="px-4 py-3 text-right bg-slate-900/90 w-24">Meta</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800/50">
              {lista.map((item) => {
                const pctInvestido = totalInvestidoGeral > 0 ? (item.investido / totalInvestidoGeral) * 100 : 0;
                const pctAtual = totalAtualGeral > 0 ? (item.atual / totalAtualGeral) * 100 : 0;
                const catInfo = categorias.find(c => c.name === item.tipo);
                const meta = catInfo ? catInfo.meta : 0;
                const diff = pctAtual - meta;

                return (
                  <tr key={item.tipo} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-4 font-bold text-slate-300 pl-6">{item.tipo}</td>
                    <td className="px-4 text-right text-slate-500">{isHidden ? '••••••' : formatMoney(item.investido)}</td>
                    <td className="px-4 text-right text-white font-medium">{isHidden ? '••••••' : formatMoney(item.atual)}</td>
                    <td className="px-4 text-right text-slate-600 text-xs">{pctInvestido.toFixed(1)}%</td>
                    <td className="px-4 text-right font-bold text-blue-400">{pctAtual.toFixed(1)}%</td>
                    <td className="px-4 text-right text-xs relative">
                      <div className="flex items-center justify-end gap-2">
                          <div className="flex flex-col items-end">
                              <span className="text-slate-400 font-bold">{meta.toFixed(0)}%</span>
                              {meta > 0 && Math.abs(diff) > 0.1 && (
                                  <span className={`text-[9px] font-bold ${diff > 2 ? 'text-red-400' : diff < -2 ? 'text-green-400' : 'text-slate-600'}`}>
                                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                  </span>
                              )}
                          </div>
                          <button onClick={() => handleEdit(item.tipo, meta)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-white transition-all">
                            <Pencil size={12} />
                          </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {/* Rodapé Total */}
              <tr className="bg-slate-950/80 font-bold border-t border-slate-700 h-12">
                  <td className="px-4 pl-6 text-white">TOTAL</td>
                  <td className="px-4 text-right text-slate-400">{isHidden ? '••••••' : formatMoney(totalInvestidoGeral)}</td>
                  <td className="px-4 text-right text-green-400 text-base">{isHidden ? '••••••' : formatMoney(totalAtualGeral)}</td>
                  <td className="px-4 text-right text-slate-500">100%</td>
                  <td className="px-4 text-right text-blue-500">100%</td>
                  <td className="px-4 text-right">
                    <div className="flex flex-col items-end">
                       <span className={`text-base ${totalMetaConfigurada !== 100 ? 'text-yellow-400' : 'text-slate-500'}`}>
                          {totalMetaConfigurada.toFixed(0)}%
                       </span>
                    </div>
                  </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO INTELIGENTE */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden p-6 space-y-6">
              
              {/* Cabeçalho Modal */}
              <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">Meta: {editingCat.name}</h3>
                    {/* Mostra quanto espaço tem livre */}
                    <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 mt-1">
                        <Lock size={10} /> Máximo permitido: {getMaxAllowed(editingCat.name)}%
                    </p>
                  </div>
                  <button onClick={() => setEditingCat(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>

              {/* Slider Inteligente */}
              <div className="space-y-2">
                 <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                    <span>Definir Meta</span>
                    <span className="text-blue-400 text-lg">{newMeta}%</span>
                 </div>
                 
                 <input 
                    type="range" 
                    min="0" 
                    // 👇 A MÁGICA ACONTECE AQUI
                    max={getMaxAllowed(editingCat.name)} 
                    step="1"
                    value={newMeta}
                    onChange={(e) => setNewMeta(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                 />
                 
                 <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                    <span>0%</span>
                    {/* Mostra o limite dinâmico no final da régua */}
                    <span>{getMaxAllowed(editingCat.name)}% (Max)</span>
                 </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-2">
                 <button onClick={() => setEditingCat(null)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-lg">Cancelar</button>
                 <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2">
                   {loading ? 'Salvando...' : <><Save size={14}/> Salvar</>}
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};