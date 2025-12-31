import { useState, useEffect } from 'react';
import { X, Save, Calculator, Lock, Trash2, DollarSign } from 'lucide-react'; 
import { Asset } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  ativo: Asset | null;
  allAssets?: Asset[];
}

export const EditModal = ({ isOpen, onClose, onSave, ativo, allAssets = [] }: EditModalProps) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    average_price: 0,
    target_percent: 0,
    manual_dy: 0,
    manual_lpa: 0,
    manual_vpa: 0,
    manual_price: 0 // <--- Novo Estado
  });

  const [loading, setLoading] = useState(false);

  const shouldShowManualPrice = () => {
    if (!ativo) return false;

    // 1. REGRA: Transformar em maiúsculo (Corrigido para JavaScript)
    const ticker = ativo.ticker.trim().toUpperCase();

    // 2. REGRA: Se for longo (> 7) ou tiver espaço, SEMPRE manual
    if (ticker.length > 7 || ticker.includes(" ")) return true;

    // 3. REGRA: Se o Yahoo não encontrou preço (está 0), liberamos o manual
    // Isso resolve o caso do "CDB" que é curto mas não existe na bolsa
    if (!ativo.preco_atual || ativo.preco_atual === 0) return true;

    // Caso de segurança: Renda Fixa sem números (como "CDB") tende a ser manual
    const hasNumbers = /\d/.test(ticker);
    if (ativo.tipo === 'Renda Fixa' && !hasNumbers) return true;

    return false;
  };

  const maxLimit = (() => {
    if (!ativo) return 100;
    const outrosDoMesmoTipo = allAssets.filter(
      (a) => a.tipo === ativo.tipo && a.ticker !== ativo.ticker
    );
    const totalOcupado = outrosDoMesmoTipo.reduce((acc, a) => acc + (a.meta || 0), 0);
    return Math.max(0, 100 - totalOcupado);
  })();

  useEffect(() => {
    if (ativo) {
      setFormData({
        quantity: ativo.qtd || 0,
        average_price: ativo.pm || 0,
        target_percent: ativo.meta || 0,
        manual_dy: Number(((ativo.manual_dy || 0) * 100).toFixed(2)), 
        manual_lpa: ativo.manual_lpa || 0,
        manual_vpa: ativo.manual_vpa || 0,
        manual_price: ativo.preco_atual || 0 // <--- Pega o preço atual que veio do banco
      });
    }
  }, [ativo]);

  const handleDelete = async () => {
    if (!ativo) return;
    const confirmacao = window.confirm(`TEM CERTEZA que deseja excluir ${ativo.ticker}? \n\nEssa ação não pode ser desfeita.`);
    if (!confirmacao) return;

    setLoading(true);
    try {
        const res = await fetch('http://localhost:5328/api/delete_asset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ativo.id }),
        });
        const data = await res.json();

        if (data.status === 'Sucesso') {
            onSave();
            onClose();
        } else {
            alert(data.msg);
        }
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao tentar excluir.");
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ativo) return;
    setLoading(true);
    try {
      await fetch('http://localhost:5328/api/update_asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ativo.ticker,
          qtd: Number(formData.quantity),
          pm: Number(formData.average_price),
          meta: Number(formData.target_percent),
          dy: Number(formData.manual_dy) / 100, 
          lpa: Number(formData.manual_lpa),
          vpa: Number(formData.manual_vpa),
          manual_price: shouldShowManualPrice() ? Number(formData.manual_price) : null // <--- Só envia se for manual
        }),
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ativo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3 ">
             <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                {ativo.ticker.substring(0, 2)}
             </div>
             <div>
               <h2 className="text-lg font-bold text-white tracking-tight">Editar {ativo.ticker}</h2>
               <p className="text-xs text-slate-400 font-mono">{ativo.tipo}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* 👇 SE FOR MANUAL, MOSTRA ESSE BLOCO DESTAQUE */}
          {shouldShowManualPrice() && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg space-y-2">
                 <div className="flex items-center gap-2 text-emerald-400">
                    <DollarSign size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Atualização Manual de Saldo</span>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider">Preço Unitário Atual (Hoje)</label>
                    <input 
                        type="number" step="0.01"
                        value={formData.manual_price}
                        onChange={(e) => setFormData({...formData, manual_price: Number(e.target.value)})}
                        className="w-full bg-slate-950 border border-emerald-500/30 rounded-lg p-2.5 text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono text-lg font-bold"
                        placeholder="Ex: 150.50"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                        * Para caixinhas/contas, coloque Qtd=1 e o Saldo Total aqui.
                    </p>
                 </div>
              </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quantidade</label>
              <input 
                type="number" 
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Preço Médio de Compra</label>
              <input 
                type="number" step="0.01"
                value={formData.average_price}
                onChange={(e) => setFormData({...formData, average_price: Number(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex justify-between items-end">
                <span>Meta na Carteira (%)</span>
                <div className="text-right flex flex-col items-end">
                    <span className="text-blue-400">{formData.target_percent}%</span>
                    <span className="text-[9px] text-slate-600 flex items-center gap-1 font-normal lowercase">
                        <Lock size={8}/> máx: {maxLimit.toFixed(1)}%
                    </span>
                </div>
             </label>
             <input 
                type="range" min="0" 
                max={maxLimit} 
                step="0.5"
                value={formData.target_percent > maxLimit ? maxLimit : formData.target_percent}
                onChange={(e) => setFormData({...formData, target_percent: Number(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>

          {/* FUNDAMENTOS - Só mostra se for ativo de bolsa */}
          {!shouldShowManualPrice() && (
            <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator size={14} className="text-purple-400"/>
                    <span className="text-xs font-bold text-purple-200 uppercase tracking-wide">Fundamentos (Manual / Yahoo)</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-slate-500">DY Anual (%)</label>
                        <input 
                        type="number" step="0.1"
                        value={formData.manual_dy}
                        onChange={(e) => setFormData({...formData, manual_dy: Number(e.target.value)})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-emerald-400 font-mono focus:border-emerald-500/50 outline-none"
                        />
                    </div>
                    {ativo.tipo === 'Ação' && (
                        <>
                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-500">LPA (R$)</label>
                            <input 
                                type="number" step="0.01"
                                value={formData.manual_lpa}
                                onChange={(e) => setFormData({...formData, manual_lpa: Number(e.target.value)})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 font-mono focus:border-blue-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-500">VPA (R$)</label>
                            <input 
                                type="number" step="0.01"
                                value={formData.manual_vpa}
                                onChange={(e) => setFormData({...formData, manual_vpa: Number(e.target.value)})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 font-mono focus:border-blue-500/50 outline-none"
                            />
                        </div>
                        </>
                    )}
                    {ativo.tipo === 'FII' && (
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-500">Valor Patrimonial / Cota (VP)</label>
                            <input 
                                type="number" step="0.01"
                                value={formData.manual_vpa}
                                onChange={(e) => setFormData({...formData, manual_vpa: Number(e.target.value)})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 font-mono focus:border-blue-500/50 outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center">
           <button 
             onClick={handleDelete}
             disabled={loading}
             className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
             title="Excluir Ativo"
           >
              <Trash2 size={16} /> <span className="hidden sm:inline">Excluir</span>
           </button>

           <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
               Cancelar
             </button>
             <button 
               onClick={handleSave} 
               disabled={loading}
               className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all"
             >
               {loading ? 'Salvando...' : <><Save size={14} /> Salvar Alterações</>}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};