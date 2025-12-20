'use client';
import { useState, useEffect } from 'react';
import { X, Save, TrendingUp, BarChart, Trash2, AlertTriangle } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  ativo: any;
}

export const EditModal = ({ isOpen, onClose, onSave, ativo }: EditModalProps) => {
  const [qtd, setQtd] = useState(0);
  const [pm, setPm] = useState(0);
  const [meta, setMeta] = useState(0);
  
  const [dy, setDy] = useState(0);
  const [lpa, setLpa] = useState(0);
  const [vpa, setVpa] = useState(0);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false); // Estado para exclusão

  useEffect(() => {
    if (ativo) {
      setQtd(ativo.qtd || 0);
      setPm(ativo.pm || 0);
      setMeta(ativo.meta || 0);
      setDy(ativo.manual_dy || ativo.renda_mensal_est ? (ativo.renda_mensal_est * 12 / ativo.qtd) : 0); 
      setLpa(ativo.manual_lpa || 0); 
      setVpa(ativo.manual_vpa || 0);
    }
  }, [ativo]);

  if (!isOpen || !ativo) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('http://localhost:5328/api/update_asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ativo.ticker, qtd, pm, meta, dy, lpa, vpa }),
      });
      setSaving(false);
      onSave(); onClose();
    } catch (error) {
      alert("Erro ao salvar");
      setSaving(false);
    }
  };

  // NOVA FUNÇÃO: DELETAR
  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja EXCLUIR ${ativo.ticker}? Essa ação não pode ser desfeita.`)) return;

    setDeleting(true);
    try {
      await fetch('http://localhost:5328/api/delete_asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ativo.ticker }),
      });
      setDeleting(false);
      onSave(); // Recarrega a tela principal
      onClose(); // Fecha o modal
    } catch (error) {
      alert("Erro ao excluir");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded text-white">{ativo.ticker}</span>
            Editar Posição
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          <div className="space-y-3">
             <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                <BarChart size={14}/> Minha Posição
             </h4>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                    <input type="number" value={qtd} onChange={e => setQtd(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preço Médio (R$)</label>
                    <input type="number" step="0.01" value={pm} onChange={e => setPm(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 outline-none text-sm" />
                </div>
             </div>
             <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Meta na Carteira (%)</label>
                <input type="number" step="0.1" value={meta} onChange={e => setMeta(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 outline-none text-sm" />
             </div>
          </div>

          <div className="border-t border-slate-800"></div>

          <div className="space-y-3">
             <h4 className="text-xs font-bold text-green-400 uppercase flex items-center gap-2">
                <TrendingUp size={14}/> Indicadores (Opcional)
             </h4>
             <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">DY Anual (%)</label>
                    <input type="number" step="0.01" value={dy} onChange={e => setDy(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-green-500 outline-none text-sm" placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">LPA</label>
                    <input type="number" step="0.01" value={lpa} onChange={e => setLpa(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-green-500 outline-none text-sm" placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">VPA</label>
                    <input type="number" step="0.01" value={vpa} onChange={e => setVpa(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-green-500 outline-none text-sm" placeholder="0.00" />
                </div>
             </div>
          </div>
        </div>

        {/* Footer com DELETE e SALVAR */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between shrink-0">
          
          {/* BOTÃO EXCLUIR */}
          <button 
             onClick={handleDelete} 
             disabled={deleting || saving}
             className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded flex items-center gap-2 text-xs font-bold transition-colors"
             title="Excluir Ativo"
          >
             {deleting ? '...' : <Trash2 size={16}/>}
          </button>

          {/* BOTÃO SALVAR */}
          <button onClick={handleSave} disabled={saving || deleting} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors disabled:opacity-50">
            <Save size={16}/> {saving ? 'Salvando...' : 'Salvar Dados'}
          </button>
        </div>
      </div>
    </div>
  );
};