'use client';
import { useState } from 'react';
import { formatMoney } from '../utils';
import { Asset } from '../types';
import { usePrivacy } from '../context/PrivacyContext';
import { PieChart, Pencil, X, Save, Lock, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface CategorySummaryProps {
  ativos: Asset[];
  categorias?: { name: string; meta: number }[];
  onUpdate: () => void;
}

const PrivateValue = ({ value, isHidden, className = "" }: { value: string | number, isHidden: boolean, className?: string }) => (
  <span className={className}>{isHidden ? '••••••' : value}</span>
);

export const CategorySummary = ({ ativos, categorias = [], onUpdate }: CategorySummaryProps) => {
  const { isHidden } = usePrivacy();
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [newMeta, setNewMeta] = useState(0);
  const [loading, setLoading] = useState(false);

  const getMaxAllowed = (catName: string) => {
    const otherCatsTotal = categorias
      .filter(c => c.name !== catName)
      .reduce((acc, c) => acc + c.meta, 0);
    return Math.max(0, 100 - otherCatsTotal);
  };

  if (!ativos || ativos.length === 0) return null;

  const groups = ativos.reduce((acc: any, asset) => {
    const cat = asset.tipo;
    if (!acc[cat]) acc[cat] = { tipo: cat, investido: 0, atual: 0 };
    acc[cat].investido += asset.total_investido;
    acc[cat].atual += asset.total_atual;
    return acc;
  }, {});

  const lista = (Object.values(groups) as any[]).sort((a, b) => b.atual - a.atual);
  const totalInvestidoGeral = lista.reduce((acc, item) => acc + item.investido, 0);
  const totalAtualGeral = lista.reduce((acc, item) => acc + item.atual, 0);

  const totalMetaConfigurada = lista.reduce((acc, item) => {
     const catInfo = categorias.find(c => c.name === item.tipo);
     return acc + (catInfo ? catInfo.meta : 0);
  }, 0);

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ALTURA TRAVADA EM 525PX AQUI */}
      <Card className="flex flex-col h-[525px] overflow-hidden !bg-[#0f172a] !border-slate-800 shadow-2xl p-0 animate-in fade-in duration-500">
        
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <PieChart size={16} className="text-blue-400" />
            </div>
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-widest leading-none">Consolidação</h3>
          </div>
          {totalMetaConfigurada !== 100 && (
            <div className="flex items-center gap-1.5 text-amber-500/80 animate-pulse">
               <AlertCircle size={12} />
               <span className="text-[9px] font-bold uppercase tracking-tight">Metas: {totalMetaConfigurada}%</span>
            </div>
          )}
        </div>
        
        {/* flex-1 garante que a tabela ocupe o espaço disponível e gere o scroll interno */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3">Classe</th>
                <th className="px-4 py-3 text-right">Investido</th>
                <th className="px-4 py-3 text-right text-white">Atual</th>
                <th className="px-4 py-3 text-right text-blue-400">%</th>
                <th className="px-6 py-3 text-right w-24">Meta</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800/30">
              {lista.map((item) => {
                const pctAtual = totalAtualGeral > 0 ? (item.atual / totalAtualGeral) * 100 : 0;
                const catInfo = categorias.find(c => c.name === item.tipo);
                const meta = catInfo ? catInfo.meta : 0;
                const diff = pctAtual - meta;

                return (
                  <tr key={item.tipo} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-300">{item.tipo}</td>
                    <td className="px-4 text-right text-slate-500 font-mono">
                      <PrivateValue value={formatMoney(item.investido)} isHidden={isHidden} />
                    </td>
                    <td className="px-4 text-right text-white font-mono font-bold">
                      <PrivateValue value={formatMoney(item.atual)} isHidden={isHidden} />
                    </td>
                    <td className="px-4 text-right">
                       <span className="font-bold text-blue-400 font-mono">{pctAtual.toFixed(1)}%</span>
                    </td>
                    <td className="px-6 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                          <div className="flex flex-col items-end">
                              <span className="text-slate-400 font-bold font-mono text-xs">{meta.toFixed(0)}%</span>
                              {meta > 0 && Math.abs(diff) > 0.5 && (
                                  <span className={`text-[9px] font-bold ${diff > 2 ? 'text-rose-400' : diff < -2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                  </span>
                              )}
                          </div>
                          <button onClick={() => handleEdit(item.tipo, meta)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-600 hover:text-white transition-all">
                            <Pencil size={12} />
                          </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Patrimônio Atual</p>
            <PrivateValue 
              value={formatMoney(totalAtualGeral)} 
              isHidden={isHidden} 
              className="text-lg font-bold text-emerald-400 font-mono" 
            />
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Custo Total</p>
            <PrivateValue 
              value={formatMoney(totalInvestidoGeral)} 
              isHidden={isHidden} 
              className="text-sm font-bold text-slate-300 font-mono" 
            />
          </div>
        </div>
      </Card>

      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <Card className="w-full max-w-sm !bg-slate-900 shadow-2xl p-6 space-y-6 border-slate-700">
              <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">Meta: {editingCat.name}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mt-1">
                       <Lock size={10} /> Disponível: {getMaxAllowed(editingCat.name)}%
                    </p>
                  </div>
                  <button onClick={() => setEditingCat(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ajustar Alocação</span>
                    <span className="text-3xl font-bold text-blue-400 font-mono">{newMeta}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={getMaxAllowed(editingCat.name)} 
                    step="1"
                    value={newMeta}
                    onChange={(e) => setNewMeta(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 outline-none"
                  />
              </div>

              <div className="flex justify-end gap-3">
                  <button onClick={() => setEditingCat(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Cancelar</button>
                  <button onClick={handleSave} disabled={loading} className="px-6 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 uppercase tracking-widest">
                    {loading ? 'Salvando...' : <><Save size={14}/> Salvar Meta</>}
                  </button>
              </div>
           </Card>
        </div>
      )}
    </>
  );
};