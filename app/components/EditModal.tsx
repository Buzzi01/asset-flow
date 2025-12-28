import { useState, useEffect } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { Asset } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  ativo: Asset | null;
}

export const EditModal = ({ isOpen, onClose, onSave, ativo }: EditModalProps) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    average_price: 0,
    target_percent: 0,
    manual_dy: 0,
    manual_lpa: 0,
    manual_vpa: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ativo) {
      setFormData({
        quantity: ativo.qtd || 0,
        average_price: ativo.pm || 0,
        target_percent: ativo.meta || 0,
        manual_dy: Number(((ativo.manual_dy || 0) * 100).toFixed(2)), // 👈 CONVERTE PARA % AO ABRIR (0.10 -> 10.0)
        manual_lpa: ativo.manual_lpa || 0,
        manual_vpa: ativo.manual_vpa || 0
      });
    }
  }, [ativo]);

  const handleSave = async () => {
    if (!ativo) return;
    setLoading(true);
    try {
      await fetch('http://localhost:5328/api/assets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ativo.ticker,
          qtd: Number(formData.quantity),
          pm: Number(formData.average_price),
          meta: Number(formData.target_percent),
          // 👇 CONVERTE DE VOLTA PARA DECIMAL AO SALVAR (10.0 -> 0.10)
          dy: Number(formData.manual_dy) / 100, 
          lpa: Number(formData.manual_lpa),
          vpa: Number(formData.manual_vpa)
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
          <div className="flex items-center gap-3">
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
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Preço Médio (R$)</label>
              <input 
                type="number" step="0.01"
                value={formData.average_price}
                onChange={(e) => setFormData({...formData, average_price: Number(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex justify-between">
                <span>Meta na Carteira (%)</span>
                <span className="text-blue-400">{formData.target_percent}%</span>
             </label>
             <input 
                type="range" min="0" max="100" step="0.5"
                value={formData.target_percent}
                onChange={(e) => setFormData({...formData, target_percent: Number(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>

          {/* FUNDAMENTOS */}
          <div className="pt-4 border-t border-slate-800">
             <div className="flex items-center gap-2 mb-4">
                <Calculator size={14} className="text-purple-400"/>
                <span className="text-xs font-bold text-purple-200 uppercase tracking-wide">Fundamentos (Manual / Yahoo)</span>
             </div>
             
             <div className="grid grid-cols-3 gap-3">
                 <div className="space-y-1.5">
                    {/* 👇 LABEL CORRIGIDA PARA % */}
                    <label className="text-[9px] uppercase font-bold text-slate-500">DY Anual (%)</label>
                    <input 
                      type="number" step="0.1"
                      value={formData.manual_dy}
                      onChange={(e) => setFormData({...formData, manual_dy: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-emerald-400 font-mono focus:border-emerald-500/50 outline-none"
                      placeholder="Ex: 10.5"
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

        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end gap-3">
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
  );
};