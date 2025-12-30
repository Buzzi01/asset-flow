'use client';
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Plus, Search } from 'lucide-react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAssetModal = ({ isOpen, onClose, onSuccess }: AddAssetModalProps) => {
  const [formData, setFormData] = useState({
    ticker: '',
    type: 'Ação',
    quantity: 0,
    average_price: 0,
    target_percent: 0
  });

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.ticker || formData.quantity <= 0 || formData.average_price <= 0) {
        alert("Preencha todos os campos corretamente (Ticker, Qtd e Preço).");
        return;
    }

    setValidating(true);

    try {
        // Validação no Yahoo
        const valRes = await fetch('http://localhost:5328/api/validate_ticker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker: formData.ticker })
        });
        const valData = await valRes.json();

        if (!valData.valid) {
            alert(`❌ Ticker "${formData.ticker}" não encontrado no Yahoo Finance.\n\nVerifique se digitou corretamente.`);
            setValidating(false);
            return;
        }

        const tickerOficial = valData.ticker;

        setLoading(true);
        // 👇 AQUI ESTÁ A CORREÇÃO CRÍTICA DO FRONTEND
        const saveRes = await fetch('http://localhost:5328/api/add_asset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticker: tickerOficial,
                category: formData.type, // Envia 'category' (o backend espera isso)
                qtd: Number(formData.quantity),
                pm: Number(formData.average_price),
                meta: Number(formData.target_percent) // Envia 'meta' (o backend agora aceita)
            }),
        });

        const saveData = await saveRes.json();
        
        if (saveData.status === 'Sucesso') {
            setFormData({ ticker: '', type: 'Ação', quantity: 0, average_price: 0, target_percent: 0 });
            onSuccess();
            onClose();
        } else {
            alert("Erro ao salvar: " + saveData.msg);
        }

    } catch (error) {
        console.error(error);
        alert("Erro de conexão ao validar o ativo.");
    } finally {
        setLoading(false);
        setValidating(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                
                <div className="flex justify-between items-center mb-6">
                   <Dialog.Title as="h3" className="text-lg font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30">
                        <Plus size={18} className="text-blue-500" />
                      </div>
                      Adicionar Ativo
                   </Dialog.Title>
                   <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ticker</label>
                    <div className="relative">
                        <input 
                            name="ticker"
                            type="text" 
                            placeholder="Ex: PETR4, AAPL, HGLG11..." 
                            value={formData.ticker}
                            onChange={(e) => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono uppercase"
                        />
                        <div className="absolute right-3 top-3 text-slate-600">
                           <Search size={16} />
                        </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tipo</label>
                    <select 
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="Ação">Ação (BR/EUA)</option>
                        <option value="FII">Fundo Imobiliário (FII)</option>
                        <option value="Internacional">ETF / Stocks</option>
                        <option value="Cripto">Criptomoeda</option>
                        <option value="Renda Fixa">Renda Fixa</option>
                        <option value="Reserva">Reserva de Oportunidade</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quantidade</label>
                        <input name="quantity" type="number" step="0.000001" value={formData.quantity} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Preço Médio (R$)</label>
                        <input name="average_price" type="number" step="0.01" value={formData.average_price} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                  </div>

                  <div className="space-y-1.5">
                     <div className="flex justify-between">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Meta Inicial (%)</label>
                        <span className="text-xs font-bold text-blue-400">{formData.target_percent}%</span>
                     </div>
                     <input 
                        name="target_percent" type="range" min="0" max="100" step="1" 
                        value={formData.target_percent} 
                        onChange={(e) => setFormData({...formData, target_percent: Number(e.target.value)})} 
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                     />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-lg transition-colors">Cancelar</button>
                  <button
                    onClick={handleSave}
                    disabled={loading || validating}
                    className="inline-flex justify-center items-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                  >
                    {validating ? (
                        <>
                           <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           Verificando...
                        </>
                    ) : loading ? (
                        'Salvando...' 
                    ) : (
                        'Adicionar Ativo'
                    )}
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};