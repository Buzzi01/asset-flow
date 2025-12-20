'use client';
import { useState } from 'react';
import { X, PlusCircle, CheckCircle } from 'lucide-react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIAS = ["Ação", "FII", "Internacional", "Renda Fixa", "Cripto", "Reserva", "ETF"];

export const AddAssetModal = ({ isOpen, onClose, onSuccess }: AddAssetModalProps) => {
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState('Ação');
  const [qtd, setQtd] = useState('');
  const [pm, setPm] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!ticker) return alert("Digite o Ticker!");
    
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5328/api/add_asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, category, qtd, pm }),
      });
      const data = await res.json();
      
      if (data.status === 'Erro') {
        alert(data.msg);
      } else {
        setTicker(''); setQtd(''); setPm(''); // Limpa form
        onSuccess();
        onClose();
      }
    } catch (error) {
      alert("Erro ao criar ativo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
        
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <PlusCircle size={18} className="text-blue-500"/> Novo Ativo
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ticker (Código)</label>
            <input 
                value={ticker} 
                onChange={e => setTicker(e.target.value.toUpperCase())} 
                placeholder="Ex: WEGE3"
                className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-blue-500 outline-none font-bold tracking-wider" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
            <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-blue-500 outline-none appearance-none"
            >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                <input type="number" value={qtd} onChange={e => setQtd(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none" placeholder="0"/>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preço Médio</label>
                <input type="number" step="0.01" value={pm} onChange={e => setPm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none" placeholder="0.00"/>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors disabled:opacity-50">
            {loading ? 'Criando...' : <><CheckCircle size={16}/> Cadastrar</>}
          </button>
        </div>
      </div>
    </div>
  );
};